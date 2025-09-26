import React, { useEffect, useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '@rneui/base';

import styles from './Loansstyles';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppText from '../../../../components/Layout/AppText/AppText';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import api_Employee from '../../services/api_Employee';
import { EmployeeLoanResponse } from '../../models/EmployeeLoanResponse';
import colors from '../../../../shared/styling/colors';

const Loans = ({ navigation, route }: any) => {
  const [LoanList, setLoanList] = useState<EmployeeLoanResponse>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const EmployeeId = route.params.EmployeeId;

  const getEmployeeLoanList = async () => {
    setLoading(true);
    const response = await api_Employee.getEmployeeLoanList(EmployeeId);
    setLoading(false);

    if (!response.ok) {
      return Alert.alert('Employee', 'Error Getting Employee Loan List');
    }

    if (Array.isArray(response.data)) {
      setLoanList(response.data);
    }
  };

  const confirmLoanRevoke = (loanId: number) => {
    Alert.alert(
      'Confirm Loan Revoke',
      'Do you really want to revoke the loan?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => handleLoanRevoke(loanId) },
      ],
      { cancelable: false }
    );
  };

  const handleLoanRevoke = async (loanId: number) => {
    setLoading(true);
    const response = await api_Employee.RevokeEmployeeLoan(loanId);
    setLoading(false);

    if (!response.ok) {
      return Alert.alert('Loan', 'Error Revoking Loan');
    }

    Alert.alert('Loan', 'Loan Revoked Successfully');
    getEmployeeLoanList();
  };

  useEffect(() => {
    getEmployeeLoanList();
  }, []);

  const summary = LoanList?.reduce(
    (acc, item) => {
      acc.total += item.TotalAmount;
      acc.paid += item.PaidAmount;
      acc.deduction += item.DeductionAmount;
      acc.balance += item.RemainingAmount;
      return acc;
    },
    {total: 0, paid: 0, deduction: 0, balance: 0},
  );

  const renderLoans = () =>
    LoanList.length > 0 ? (
      LoanList.map((item, index) => (
        <Card containerStyle={styles.card} key={index}>
          <View style={styles.innercontainer}>
            <Icon name="bank" size={22} color={colors.primary} />
            <AppText style={styles.big_heading}>
              {item.FullName}, {item.Year}
            </AppText>
            <AppText
              style={
                item.LoanStatus === 'UNPAID'
                  ? styles.status_text_red
                  : styles.status_text_green
              }>
              {item.LoanStatus}
            </AppText>
          </View>

          <View style={styles.seperator} />

          <View style={styles.blockPadding}>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Type</AppText>
              <AppText style={styles.subheading}>{item.LoanType}</AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Total</AppText>
              <AppText style={styles.subheading}>{item.TotalAmount}</AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Paid</AppText>
              <AppText style={styles.paid_subheading}>{item.PaidAmount}</AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Balance</AppText>
              <AppText style={styles.unpaid_subheading}>{item.RemainingAmount}</AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Issuance Date</AppText>
              <AppText style={styles.subheading}>{item.IssuanceDate}</AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Last Deducted</AppText>
              <AppText style={styles.subheading}>{item.LastDeductedDate}</AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Description</AppText>
              <AppText style={styles.subheading}>{item.Description}</AppText>
            </View>
          </View>

          <View style={styles.seperator} />

          <View style={styles.lower_cardcontainer}>
            <View style={styles.Iconcontainer}>
              {item.LoanStatus !== 'UNPAID' && (
                <Icon
                  name="restore"
                  size={22}
                  color={colors.primary}
                  onPress={() => confirmLoanRevoke(item.EmployeeLoanId)}
                />
              )}
            </View>
          </View>
        </Card>
      ))
    ) : (
      <View style={styles.noDataContainer}>
        <AppText>No Loan Records Found</AppText>
      </View>
    );

  return (
    <AppScreen style={styles.container}>
      <AppActivityIndicator visible={loading} />
      {/* 🔙 Back Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ flexDirection: 'row', alignItems: 'center', margin: 15 }}
      >
        <Icon name="arrow-left" size={22} color="black" />
        <AppText style={{ fontSize: 16, color: 'black', marginLeft: 8, fontWeight: 'bold' }}>
          Loans
        </AppText>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ paddingBottom: 1 }}>
        {renderLoans()}
      </ScrollView>
      <View style={styles.lowercontainer}>
        <View style={styles.lower_innercontainer}>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Total</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary?.total}</AppText>
          </View>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Paid</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary?.paid}</AppText>
          </View>
          <View style={styles.seperatorW} />
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Balance</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary?.balance}</AppText>
          </View>
        </View>
      </View>
    </AppScreen>
  );
};

export default Loans;
