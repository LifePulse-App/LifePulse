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
  DashboardSummary: any;
  swipeEnabled: boolean; // 👈 new prop added
}

const BranchSummarySection = ({ StudentSummary,DashboardSummary, swipeEnabled }: BranchSummarySectionProps) => {
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
          <AppText style={styles.branchtextHeading}>Student Name:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.name}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Student ID:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.student_id}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Campus:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.campus}</AppText>
        </View>
        <View style={styles.branchtextContainer}>
          <AppText style={styles.branchtextHeading}>Status:</AppText>
          <AppText style={styles.branchtextSubheading}>{StudentSummary?.status}</AppText>
        </View>
      </View>
    </Card>
  ];

  return (
    <Card containerStyle={styles.branchcard}>
      <TouchableOpacity style={styles.branchmainHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.branchcardHeadingContainer}>
          <Icon name="analytics" size={26} color="black" style={styles.iconStyle} />
          <AppText style={styles.branchcardheading}>Student Info</AppText>
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
      height={190}
      data={data}
      pagingEnabled
      autoPlay={false}
      enabled={swipeEnabled} // 🚫 disables swipe gestures!
      scrollAnimationDuration={1500}
      style={{ alignSelf: 'center' }}
      renderItem={({ item }) => item}
      onSnapToItem={(index) => setCurrentIndex(index)}
    />
  </View>
)}

    </Card>
  );
};



export default BranchSummarySection;
