import React, {useEffect, useState} from 'react';
import {View, Alert, ScrollView, TouchableOpacity, LayoutAnimation, UIManager, Platform} from 'react-native';
import {Card} from '@rneui/base';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppText from '../../../../components/Layout/AppText/AppText';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import {StudentOverduesAdjustmentListResponse} from '../../models/StudentOverduesAdjustmentListResponse';
import api_Student from '../../services/api_Student';
import styles from './Adjustmentstyles';
import colors from '../../../../shared/styling/colors';
import Toast from 'react-native-toast-message';

const Adjustment = ({navigation, route}: any) => {
  const [AdjustmentList, setAdjustmentList] = useState<StudentOverduesAdjustmentListResponse>();
  const OverduesId = route.params.OverduesId;
  const [loading, setLoading] = useState<boolean>(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState<boolean>(true);

  const [dateStates, setDateStates] = useState<
    Array<{date: Date; mode: 'date' | 'time' | undefined; show: boolean}>
  >([]);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAdjustmentOpen(!isAdjustmentOpen);
  };

  const getAdjustmentList = async () => {
    setLoading(true);
    const response = await api_Student.getStudentOverduesAdjustmentList(OverduesId);
    if (!response.ok) {
      setLoading(false);
      return Toast.show({ type: 'error', text1: "Error Getting Overdues Adjustment List."});
    }

    if (typeof response.data === 'object' && response.data !== null) {
      setAdjustmentList(response.data);
      const initialDateStates = response.data.map(() => ({
        date: new Date(),
        mode: 'date' as 'date',
        show: false,
      }));
      setDateStates(initialDateStates);
    }
    setLoading(false);
  };

  function formatDate(date: Date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
  }

  const UpdateAdjustmentDetails = async (OverduesAdjustmentId: number, newDate: Date) => {
    setLoading(true);
    const response = await api_Student.updateOverdueAdjustmentModifiedDate(
      formatDate(newDate),
      OverduesAdjustmentId,
    );
    if (!response.ok) {
      setLoading(false);
      return Toast.show({ type: 'error', text1: "Error Updating Overdues Adjustment Date."});
    }

    if (typeof response.data === 'object' && response.data !== null) {
      getAdjustmentList();
    }
    setLoading(false);
  };

  useEffect(() => {
    getAdjustmentList();
  }, []);

  

  const RevokeStudentOverdues = async (values: any) => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to revoke overdues?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            setLoading(true);
            const response = await api_Student.StudentRevokeOverdues(values);
            if (!response.ok) {
              setLoading(false);
              return Toast.show({ type: 'error', text1: "Error Revoking Student Overdue."});
            }
            setLoading(false);
          },
        },
      ],
      {cancelable: false},
    );
  };

  const showDatepicker = (index: number) => {
    const updatedDateStates = [...dateStates];
    updatedDateStates[index].show = true;
    setDateStates(updatedDateStates);
  };

  const onChange = (
    event: any,
    selectedDate: any,
    index: number,
    OverduesAdjustmentId: number,
  ) => {
    const currentDate = selectedDate || dateStates[index].date;
    Alert.alert('Confirm', 'Do you really want to change the adjustment date?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'OK',
        onPress: () => {
          const updatedDateStates = [...dateStates];
          updatedDateStates[index].show = false;
          updatedDateStates[index].date = currentDate;
          setDateStates(updatedDateStates);
          UpdateAdjustmentDetails(OverduesAdjustmentId, currentDate);
        },
      },
    ]);
  };

  const summary = AdjustmentList?.reduce(
    (acc, item) => {
      acc.total += item.AdjustmentAmount;
      acc.paid += item.LastBalance;
      acc.discount += item.DiscountAmount;
      acc.balance += item.LastBalance - item.AdjustmentAmount - item.DiscountAmount;
      return acc;
    },
    {total: 0, paid: 0, discount: 0, balance: 0},
  );
   

  return (
    <AppScreen style={styles.container}>
      <AppActivityIndicator visible={loading} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <Icon
          name="arrow-left"
          size={20}
          color={colors.black}
          onPress={() => navigation.goBack()}
          style={styles.backIcon}
        />
        <AppText style={styles.headerTitle}>Adjustment Details</AppText>
      </View>

      <ScrollView style={{flex: 0.95}} contentContainerStyle={{paddingBottom: 10}}>
        
   
        

        {isAdjustmentOpen &&
        
          (AdjustmentList && AdjustmentList.length > 0 ? (
            
            
            AdjustmentList.map((item: any, index: any) => (
            
              
              <Card containerStyle={styles.card} key={index}>
                <View style={styles.innercontainer}>
                <View style={styles.summaryHeader}>
                <View
  style={[
    styles.leftBadge,
    item.Comments === 'PAID' || item.Comments === 'PartiallyPaid'
      ? { backgroundColor: 'green' }
      : item.Comments === 'Discounted'
      ? { backgroundColor: '#314299' }
      : {},
  ]}>
  <AppText style={styles.badgeText}>{index + 1}</AppText>
</View>
                    </View>
                   <AppText style={styles.status_text_green}>{item.ModifiedDate}</AppText> 
                </View>
                <View style={styles.seperator}></View>
                <View style={styles.blockPadding}>
                  <View style={styles.textContainer}>
                    <AppText style={styles.heading}>Amount</AppText>
                    <AppText style={styles.subheading}>{item.AdjustmentAmount}</AppText>
                  </View>
                  <View style={styles.textContainer}>
                    <AppText style={styles.heading}>Last Balance</AppText>
                    <AppText style={styles.paid_subheading}>{item.LastBalance}</AppText>
                  </View>
                  <View style={styles.textContainer}>
                    <AppText style={styles.heading}>Discounted</AppText>
                    <AppText style={styles.discount_subheading}>{item.DiscountAmount}</AppText>
                  </View>
                  <View style={styles.textContainer}>
                    <AppText style={styles.heading}>Adjusted By</AppText>
                    <AppText style={styles.unpaid_subheading}>{item.ModifiedBy}</AppText>
                  </View>
                  <View style={styles.textContaines}>
                    <AppText style={styles.heading}>Comments:</AppText>
                    <AppText style={styles.unpaid__subheading}>{item.Comments}</AppText>
                  </View>
                </View>
                
                <View style={styles.seperator}></View>
                <View style={styles.lower_cardcontainer}>
                  {/* <AppText style={styles.Modified_heading}>{item.ModifiedDate}</AppText> */}

                  {item.StatusName === 'ANNUALITEM' && (
  <View style={styles.Iconcontainer}>
    <Icon
      name="eye"
      size={22}
      color="#007EA7"
      style={{ marginRight: 10 }}
      onPress={() =>
        navigation.navigate('AdjustmentDetailScreen', {
          overduesId: OverduesId,
          OverduesAdjustmentId: item.OverduesAdjustmentId,
        })
      }
    />
  </View>
)}
{['PartiallyPaid', 'Paid', 'Discounted'].includes(item.Comments) && (
  <View style={styles.Iconcontainer}>
    <Icon
      name="eye"
      size={22}
      color="#617DC5"
      style={{ marginRight: 10 }}
      onPress={() =>
        navigation.navigate('AdjustmentDetailScreen', {
          overduesId: OverduesId,
          OverduesAdjustmentId: item.OverduesAdjustmentId,
        })
      }
    />
     <Icon
                  name="restore"
                  size={2}
                  color="#617DC5"
                  style={{marginLeft: 10, marginRight: 10}}
                  
                  onPress={() => RevokeStudentOverdues(item.OverduesId)}
                />
  </View>
)}


                </View>

                {dateStates[index]?.show && (
                  <DateTimePicker
                    testID={`dateTimePicker${index}`}
                    value={dateStates[index].date}
                    mode={dateStates[index].mode}
                    is24Hour={true}
                    display="spinner"
                    onChange={(event, selectedDate) =>
                      onChange(event, selectedDate, index, item.OverduesAdjustmentId)
                    }
                  />
                )}
              </Card>
            ))
          ) : (
            <View style={styles.noDataContainer}>
              <AppText>No Adjustments Found</AppText>
            </View>
          ))}
      
      </ScrollView>

      {/* Summary */}
      <View style={styles.lowercontainer}>
        <View style={styles.lower_innercontainer}>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Total</AppText>
            <AppText style={{ color: 'white', fontSize: 15  }}>{summary?.total}</AppText>
          </View>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15  }}>Discount</AppText>
            <AppText style={{ color: 'white', fontSize: 15  }}>{summary?.discount}</AppText>
          </View>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15  }}>Paid</AppText>
            <AppText style={{ color: 'white', fontSize: 15  }}>{summary?.paid}</AppText>
          </View>
          <View style={styles.seperator} />
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15  }}>Balance</AppText>
            <AppText style={{ color: 'white', fontSize: 15  }}>{summary?.balance}</AppText>
          </View>
        </View>
      </View>
    </AppScreen>
  );
};

export default Adjustment;
