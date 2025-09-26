import React, { useEffect, useRef, useState } from 'react';
import { View, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Card } from '@rneui/themed';
import AppText from '../../../../components/Layout/AppText/AppText';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/FontAwesome';
import styles from '../../../../shared/styling/styles';
import { useSharedValue } from 'react-native-reanimated';
import { Button, Icon as RNEIcon } from '@rneui/themed';


const width = Dimensions.get('window').width;

interface BranchSummarySectionProps {
  StudentSummary: any;
  EmployeeSummary: any;
  swipeEnabled: boolean; // 👈 new prop added
}

const BranchSummarySection = ({ StudentSummary, EmployeeSummary, swipeEnabled }: BranchSummarySectionProps) => {
  const [expanded, setExpanded] = useState(true); // expanded by default
  const progressValue = useSharedValue(0); // used to control carousel manually
  const carouselRef = useRef(null);

const [currentIndex, setCurrentIndex] = useState(0);

const handleNext = () => {
  const nextIndex = (currentIndex + 1) % data.length;
  setCurrentIndex(nextIndex);
};

const handlePrev = () => {
  const prevIndex = (currentIndex - 1 + data.length) % data.length;
  setCurrentIndex(prevIndex);
};


  const data = [
    <Card containerStyle={styles.branchinnercard} key="branch">
      <View style={styles.branchsummaryHeader}>
        <View style={styles.branchleftBadge}>
          <AppText style={styles.branchbadgeText}>General Summary</AppText>
        </View>
        <View style={styles.branchrightBadge}>
          <Icon name="merge-type" size={17} color="white" />
        </View>
      </View>
      <View style={styles.branchblockPadding}>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}> Branches:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.DashboardBranchSummary.TotalBranches}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}> Classes:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.DashboardBranchSummary.TotalClasses}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}> Sections:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.DashboardBranchSummary.TotalSections}</AppText>
        </View>
      </View>
    </Card>,
    <Card containerStyle={styles.branchinnercard} key="student">
      <View style={styles.branchsummaryHeader}>
        <View style={styles.branchleftBadge}>
          <AppText style={styles.branchbadgeText}>Student Summary</AppText>
        </View>
        <View style={styles.branchrightBadge}>
          <Icon1 name="graduation-cap" size={17} color="white" />
        </View>
      </View>
      <View style={styles.branchblockPadding}>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Students:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.StudentSummary.TotalPersons}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Active:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.StudentSummary.TotalActive}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total InActive:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.StudentSummary.TotalInActive}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Passed Out:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.StudentSummary.TotalPassedOut}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Male:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.StudentSummary.TotalMale}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Female:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.StudentSummary.TotalFemale}</AppText>
        </View>
      </View>
    </Card>,
    <Card containerStyle={styles.branchinnercard} key="employee">
      <View style={styles.branchsummaryHeader}>
        <View style={styles.branchleftBadge}>
          <AppText style={styles.branchbadgeText}>Employee Summary</AppText>
        </View>
        <View style={styles.branchrightBadge}>
          <Icon name="people-alt" size={17} color="white" />
        </View>
      </View>
      <View style={styles.branchblockPadding}>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Employees:</AppText>
          <AppText style={styles.branchtextSubheading}>{EmployeeSummary?.EmployeeSummary.TotalPersons}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Active:</AppText>
          <AppText style={styles.branchtextSubheading}>{EmployeeSummary?.EmployeeSummary.TotalActive}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total InActive:</AppText>
          <AppText style={styles.branchtextSubheading}>{EmployeeSummary?.EmployeeSummary.TotalInActive}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Married:</AppText>
          <AppText style={styles.branchtextSubheading}>{EmployeeSummary?.EmployeeSummary.TotalMarried}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Male:</AppText>
          <AppText style={styles.branchtextSubheading}>{EmployeeSummary?.EmployeeSummary.TotalMale}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Total Female:</AppText>
          <AppText style={styles.branchtextSubheading}>{EmployeeSummary?.EmployeeSummary.TotalFemale}</AppText>
        </View>
      </View>
    </Card>,
  ];

  return (
    <Card containerStyle={styles.branchcard}>
      <TouchableOpacity style={styles.branchmainHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.branchcardHeadingContainer}>
          <Icon name="analytics" size={26} color="black" style={styles.iconStyle} />
          <AppText style={styles.branchcardheading}>Branches Summary</AppText>
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
      ref={carouselRef}
      width={width - 30}
      height={250}
      data={data}
      pagingEnabled
      loop
      autoPlay={true}
      enabled={swipeEnabled} // 🚫 disables swipe gestures!
      scrollAnimationDuration={1500}
      style={{ alignSelf: 'center' }}
      renderItem={({ item }) => item}
      onSnapToItem={(index) => setCurrentIndex(index)}
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
      disabled={currentIndex === data.length - 1}
              onPress={() => {
                const nextIndex = Math.min(currentIndex + 1, data.length - 1);
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



export default BranchSummarySection;
