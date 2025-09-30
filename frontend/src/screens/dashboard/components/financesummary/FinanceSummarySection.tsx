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
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import colors from '../../../../shared/styling/colors';

const { width } = Dimensions.get('window');

interface Props {
  DashboardSummary: any
  swipeEnabled: boolean; // 👈 new prop added
}

const FinanceSummarySection = ({ DashboardSummary }: Props) => {
  const [expanded, setExpanded] = useState(false); // initially open
  const carouselRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <Card containerStyle={styles.financecard}>
      <TouchableOpacity style={styles.financemainHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.financecardHeadingContainer}>
          <Icon1 name="chart-pie" size={22} color="black" style={styles.financeiconStyle} />
          <AppText style={styles.financecardheading}>Overall CGPA</AppText>
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
  data={[{ type: "student" }]} // 👈 Add data here (array of slides)
  width={width - 30}
  height={203}
  pagingEnabled
  enabled={false} // 🚫 disables swipe gestures!
  style={{ alignSelf: "center" }}
  onSnapToItem={(index) => setCurrentIndex(index)}
  renderItem={({ item, index }) => (
      <View style={{ alignItems: "center", marginVertical: 10 }}>
        <AnimatedCircularProgress
          size={180}
          width={15}
          fill={
            DashboardSummary?.academic_standings?.cgpa
              ? (DashboardSummary.academic_standings.cgpa / 4.0) * 100
              : 0
          }
          tintColor={colors.primary}
          backgroundColor="#eee"
          rotation={0}
          lineCap="round"
        >
          {(fill) => (
            <AppText style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>
              {DashboardSummary?.academic_standings?.cgpa
                ? DashboardSummary.academic_standings.cgpa.toFixed(2)
                : "0.00"}{" "}
             
            </AppText>
          )}
        </AnimatedCircularProgress>
      </View>
  )}
/>

    </View>
      )}

    </Card>
  );
};


export default FinanceSummarySection;
