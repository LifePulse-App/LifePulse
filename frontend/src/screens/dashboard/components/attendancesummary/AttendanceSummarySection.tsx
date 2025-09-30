import React, { useRef, useState } from 'react';
import { View, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Card } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppText from '../../../../components/Layout/AppText/AppText';
import { DashboardEmployeeSummaryResponse } from '../../models/dashboard/DashboardEmployeeSummaryResponse';
import { DashboardStudentSummaryResponse } from '../../models/dashboard/DashboardStudentSummaryResponse';
import styles from "../../../../shared/styling/styles"

interface Props {
  DashboardSummary: any
  swipeEnabled: boolean; // 👈 new prop added
}

const AttendanceSummarySection: React.FC<Props> = ({
  DashboardSummary,
  swipeEnabled
}) => {
  const width = Dimensions.get('window').width;
  const [expanded, setExpanded] = useState(false);
  const carouselRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const dummySummary = {
    today_classes: [
      {
        subject: "Object Oriented Programming",
        start_time: "9:00 AM",
        end_time: "10:00 AM"
      },
      {
        subject: "Data Structures",
        start_time: "10:15 AM",
        end_time: "11:15 AM"
      },
      {
        subject: "Artificial Intelligence",
        start_time: "11:30 AM",
        end_time: "12:30 PM"
      }
    ]
  };
 console.log(DashboardSummary);

  // prepare carousel data dynamically from today_classes
  const data =
  DashboardSummary?.today_classes && DashboardSummary.today_classes.length > 0
    ? DashboardSummary.today_classes.map((cls: any, idx: number) => ({
        key: `class-${idx}`,
        heading: cls.subject,
        icon: 'schedule',
        values: [
          { label: 'Subject', value: cls.subject },
          { label: 'Start', value: cls.start_time },
          { label: 'End', value: cls.end_time },
        ],
      }))
    : [
        {
          key: 'no-classes',
          heading: 'No classes today',
          icon: 'info',
          values: [{ label: 'Info', value: 'No classes scheduled for today' }],
        },
      ];


  return (
    <Card containerStyle={styles.cardCarosal}>
      <TouchableOpacity
        style={styles.mainHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.cardHeadingContainer}>
          <Icon name="today" size={22} color="black" style={styles.iconStyle} />
          <AppText style={styles.cardHeading}>Today`s Schedule</AppText>
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
            height={165}
            data={data}
            pagingEnabled
            loop={true}
            autoPlay={true}

            scrollAnimationDuration={1500}
            style={{ alignSelf: 'center' }}
            onSnapToItem={(index) => setCurrentIndex(index)}
            renderItem={({ item, index }) => (
              <Card containerStyle={styles.innercardCarosal} key={item.key}>
                <View style={styles.summaryHeader}>
                  <View style={styles.leftBadge}>
                    <AppText style={styles.badgeText}>{index + 1}</AppText>
                  </View>
                  <View style={styles.rightBadge}>
                    <Icon name={item.icon} size={15} color="white" />
                  </View>
                </View>

                {item.values.map((entry, i) => (
                  <View style={styles.blockPadding} key={i}>
                    <View style={styles.textConatiner}>
                      <AppText style={styles.textHeading}>
                        {entry.label}:
                      </AppText>
                      <AppText style={styles.textSubheading}>
                        {entry.value ?? '-'}
                      </AppText>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          />
        </View>
      )}
    </Card>
  );
};


export default AttendanceSummarySection;
