import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Card } from '@rneui/base';
import Carousel from 'react-native-reanimated-carousel';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/FontAwesome6';
import AppText from '../../../../components/Layout/AppText/AppText';
import { DashboardStudentSummaryResponse } from '../../models/dashboard/DashboardStudentSummaryResponse';
import { DashboardEmployeeSummaryResponse } from '../../models/dashboard/DashboardEmployeeSummaryResponse';
import styles from '../../../../shared/styling/styles';

const { width } = Dimensions.get('window');

interface Props {
  financeSummary?: DashboardStudentSummaryResponse['DashboardFinanceSummary'];
  payrollSummary?: DashboardEmployeeSummaryResponse['PayrollSummary'];
  swipeEnabled: boolean; // 👈 new prop added
}

const getTextColor = (label: string = ''): string => {
  const lower = label.toLowerCase();
  if (lower.includes('paid')) return '#509D4E';
  if (lower.includes('salary') || lower.includes('salaries')) return '#509D4E';
  if (lower.includes('overdues') || lower.includes('funded') || lower.includes('fund')) return '#314299';
  if (lower.includes('balance')) return '#E91E63';
  if (lower.includes('discount') || lower.includes('loans') || lower.includes('loan')) return '#E25141';
  return '#555';
};

const FinanceSummarySection = ({ financeSummary, payrollSummary, swipeEnabled }: Props) => {
  const [expanded, setExpanded] = useState(false); // initially open
  const carouselRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  
  const pages = [
    [
      { heading: 'Paid Summary' },
      { label: 'T. Overdues Paid', value: financeSummary?.TodayOverduesPaid },
      { label: 'T. Fee Paid', value: financeSummary?.TodayFeePaid },
      { label: 'T. Paid', value: financeSummary?.TodayTotalPaid },
      { line: true },
      { heading: 'Discount Summary' },
      { label: 'T. Overdues Discounted', value: financeSummary?.TodayOverduesDiscount },
      { label: 'T. Fee Discounted', value: financeSummary?.TodayFeeDiscount },
      { label: 'T. Discount', value: financeSummary?.TodayTotalDiscount },
      { line: true },
      { heading: 'Previous Paid Summary' },
      { label: 'T. Prev. O Paid', value: financeSummary?.TotalPreviousOverduesPaid },
      { label: 'T. Prev. F Paid', value: financeSummary?.TotalPreviousFeePaid },
      { line: true },
      { heading: 'Current Paid Summary' },
      { label: 'T. Current. O Paid', value: financeSummary?.TotalCurrentOverduesPaid },
      { label: 'T. Current. F Paid', value: financeSummary?.TotalCurrentFeePaid },
      { line: true },
      { heading: 'Future Paid Summary' },
      { label: 'T. Future. O Paid', value: financeSummary?.TotalFutureOverduesPaid },
      { label: 'T. Future. F Paid', value: financeSummary?.TotalFutureFeePaid },
      { line: true },
      { heading: 'Fully Discount Summary' },
      { label: 'T. Full Discounted', value: financeSummary?.TodayTotalFullyDiscounted },
      { label: 'T. Full O. Dicounted', value: financeSummary?.TodayOveduesFullyDiscounted },
      { label: 'T. F. fee Discounted', value: financeSummary?.TodayFeeFullyDiscounted },
    ],
    [
      { heading: 'Balance Summary' },
      { label: 'T. Fee Balance', value: financeSummary?.TotalFeeBalance },
      { label: 'T. Overdues Balance', value: financeSummary?.TotalOverduesBalance },
      { label: 'T. Balance', value: financeSummary?.TotalBalance },
      { line: true },
      { heading: 'Overall Paid Summary' },
      { label: 'T. Overdues Paid', value: financeSummary?.TotalOverduesPaid },
      { label: 'T. Fee Paid', value: financeSummary?.TotalFeePaid },
      { label: 'T. Paid', value: financeSummary?.TotalPaid },
      { line: true },
      { heading: 'Overall Discount Summary' },
      { label: 'T. Overdues Discount', value: financeSummary?.TotalOverduesDiscount },
      { label: 'T. Fee Discount', value: financeSummary?.TotalFeeDiscounted },
      { label: 'T. Discount', value: financeSummary?.TotalDiscount },
      { line: true },
      { heading: 'Overall Fully Discount Summary' },
      { label: 'T. Overdue F. Discounted', value: financeSummary?.TotalOverduesFullyDiscounted },
      { label: 'T. Fee F. Discounted', value: financeSummary?.TotalFeeFullyDiscounted },
      { label: 'Pending Months', value: financeSummary?.TotalPendingMonths },
    ],
    [
      { heading: 'Monthly Paid Summary' },
      { label: 'T. Paid', value: financeSummary?.MonthlyTotalPaid },
      { label: 'T. Overdues Paid', value: financeSummary?.MonthlyOverduesPaid },
      { label: 'T. Fee Paid', value: financeSummary?.MonthlyFeePaid },
      { line: true },
      { heading: 'Monthly Discount Summary' },
      { label: 'T. Discount', value: financeSummary?.MonthlyTotalDiscount },
      { label: 'T. Overdues Discount', value: financeSummary?.MonthlyOverduesDiscount },
      { label: 'T. Fee Discount', value: financeSummary?.MonthlyFeeDiscount },
      { line: true },
      { heading: 'Monthly Fully Disount Summary' },
      { label: 'T. Fully Discounted', value: financeSummary?.MonthlyTotalFullyDiscounted },
      { label: 'T. Fully O. Discounted', value: financeSummary?.MonthlyOverduesFullyDiscounted },
      { label: 'T. Fully F. Discounted', value: financeSummary?.MonthlyFeeFullyDiscounted },
    ],
    [
      { heading: 'Regular Summary' },
      { label: 'Allowances', value: payrollSummary?.TotalAllowances },
      { label: 'Incentives', value: payrollSummary?.TotalIncentives },
      { label: 'Funds Deducted', value: payrollSummary?.TotalFundsDeducted },
      { label: 'Rounded Salary', value: payrollSummary?.TotalRoundedSalary },
      { line: true },
      { heading: 'Loan Summary' },
      { label: 'OneGo Loan', value: payrollSummary?.TotalOneGoLoan },
      { label: 'Partial Loan', value: payrollSummary?.TotalPartialLoan },
      { label: 'T. Loans', value: payrollSummary?.TotalLoans },
      { line: true },
      { heading: 'Funds Summary' },
      { label: 'OneGo Funded', value: payrollSummary?.TotalOneGoFunded },
      { label: 'Partial Funded', value: payrollSummary?.TotalPartialFunded },
      { label: 'Loan Funded', value: payrollSummary?.TotalLoanFunded },
      { line: true },
      { heading: 'Salaries Summary' },
      { label: 'Salaries', value: payrollSummary?.TotalRoundedSalary },
      { label: 'Provident Fund', value: payrollSummary?.TotalProvidentFund },
      { label: 'Overtime Amount', value: payrollSummary?.TotalOvertimeAmount },
      { label: 'Gross Salary', value: payrollSummary?.TotalGrossSalary },
    ],
  ];

  return (
    <Card containerStyle={styles.financecard}>
      <TouchableOpacity style={styles.financemainHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.financecardHeadingContainer}>
          <Icon1 name="money-check-dollar" size={22} color="black" style={styles.financeiconStyle} />
          <AppText style={styles.financecardheading}>Finance Summary</AppText>
          <Icon
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={26}
            color="black"
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View>
        <Carousel
        enabled={swipeEnabled}
        ref={carouselRef}
        width={width - 30}
        height={790}
        data={pages}
        pagingEnabled
        loop
        autoPlay={true}
        scrollAnimationDuration={1500}
        style={{ alignSelf: 'center' }}
        onSnapToItem={(index) => setCurrentIndex(index)}
          renderItem={({ item, index }) => (
            <Card containerStyle={styles.financeinnercard}>
              <View style={styles.financesummaryHeader}>
                <View style={styles.financeleftBadge}>
                  <AppText style={styles.financebadgeText}>
                    {index < 3 ? 'Student Summary' : 'Employee Summary'}
                  </AppText>
                </View>
                <View style={styles.financerightBadge}>
                  <Icon name={index < 3 ? 'school' : 'groups'} size={17} color="white" />
                </View>
              </View>

              {item.map((summary, idx) => {
                if ('heading' in summary) {
                  return (
                    <View key={`heading-${idx}`} style={styles.financesectionHeadingContainer}>
                      <AppText style={styles.financesectionHeadingText}>{summary.heading}</AppText>
                    </View>
                  );
                }

                if (summary.line) {
                  return <View key={`line-${idx}`} style={styles.financehrLine} />;
                }

                return (
                  <View style={styles.financeblockPadding} key={idx}>
                    <View style={styles.financetext_conatiner}>
                      <AppText style={styles.financetext_heading}>{summary.label}:</AppText>
                      <AppText style={{ color: getTextColor(summary.label), ...styles.financetext_subheading }}>
                        {summary.value}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </Card>
            
          )}
          
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 20 }}>
      <TouchableOpacity 
      disabled={currentIndex === 0}
              onPress={() => {
                const prevIndex = Math.max(currentIndex - 1, 0);
                carouselRef.current?.scrollTo({ index: prevIndex });
                setCurrentIndex(prevIndex);
              }}
>
        <Icon name="chevron-left" size={24} />
      </TouchableOpacity>
      <TouchableOpacity  
      disabled={currentIndex === pages.length - 1}
              onPress={() => {
                const nextIndex = Math.min(currentIndex + 1, pages.length - 1);
                carouselRef.current?.scrollTo({ index: nextIndex });
                setCurrentIndex(nextIndex);
              }}>
        <Icon name="chevron-right" size={24} />
      </TouchableOpacity>
    </View>
    </View>
      )}

    </Card>
  );
};


export default FinanceSummarySection;
