import React, {useContext, useEffect, useState} from 'react';
import styles from './Feestyles';
import {Card} from '@rneui/base';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppText from '../../../../components/Layout/AppText/AppText';
import {Alert, View} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import colors from '../../../../shared/styling/colors';
import {useIsFocused} from '@react-navigation/native';
import AuthContext from '../../../../auth/user/UserContext';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {StudentFeeListResponse} from '../../models/StudentFeeListResponse';
import api_Student from '../../services/api_Student';
import Toast from 'react-native-toast-message';

const Fee = ({navigation, route}: any) => {
  const isFocused = useIsFocused();
  const [FeeList, setFeeList] = useState<StudentFeeListResponse>();
  const [loading, setLoading] = useState<boolean>(false);
  const StudentBasicId = route.params.StudentBasicId;
  const authContext = useContext(AuthContext);

  function formatISODate(inputDate: string) {
    var dateComponents = inputDate.split(/[-T]/);
    var day = dateComponents[2];
    var month = dateComponents[1];
    var year = dateComponents[0];
    var formattedDate = day + '-' + month + '-' + year;
    return formattedDate;
  }

  function formatDate(dateString: string) {
    // Split the date string into components (month, day, year)

    const [datePart, timePart] = dateString.split(' ');

    const [monthIndex, day, year] = datePart.split('/').map(Number);

    // Month names array (zero-based indexing)
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Format the month name
    const month = monthNames[monthIndex - 1];

    // Return the formatted date
    return `${month} ${day}, ${year}`;
  }

  const getStudentFeeList = async () => {
    setLoading(true);
    const response = await api_Student.getStudentFeeList(
      StudentBasicId,
      authContext?.User?.InstituteId ?? 0,
      formatISODate(authContext?.User?.InstituteProfile.StartDate || ''),
      formatISODate(authContext?.User?.InstituteProfile.EndDate || ''),
      false,
    );
    if (!response.ok) {
      setLoading(false);
      return Toast.show({ type: 'error', text1: "Error Getting Student Overdues List."});
    }
    if (typeof response.data === 'object' && response.data !== null) {
      setFeeList(response.data);
    }
    setLoading(false);
  };

  const RevokeStudentOverdues = async (values: any) => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to revoke fees?',
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
              return Toast.show({ type: 'error', text1: "Error Revoking Student Fee."});
            }
            if (typeof response.data === 'object' && response.data !== null) {
              getStudentFeeList();
            }
            setLoading(false);
          },
        },
      ],
      {cancelable: false},
    );
  };

  useEffect(() => {
    if (isFocused) {
      getStudentFeeList();
    }
  }, [isFocused]);

  //console.log(FeeList);
  

  const summary = FeeList?.reduce(
    (acc, item) => {
      acc.total += item.TotalAmount;
      acc.paid += item.PaidAmount;
      acc.discount += item.DiscountAmount;
      acc.balance += item.RemainingAmount;
      return acc;
    },
    {total: 0, paid: 0, discount: 0, balance: 0},
  );

  const renderedCards =
    FeeList && FeeList.length > 0 ? (
      FeeList?.map((item: any, index: any) => (
        <Card containerStyle={styles.card} key={index}>
          <View style={styles.innercontainer}>
            <Icon name="receipt" size={24} color="#617DC5" />
            <View style={styles.iconMonthYearContainer}>
              <AppText style={styles.big_heading}>
                {item.Month + ', ' + item.Year}
              </AppText>
            </View>
            <AppText
              style={
                item.StatusName === 'UNPAID'
                  ? styles.status_text_red
                  : styles.status_text_green
              }>
              {item.StatusName === 'WAIVEDOFF'
                ? 'WVD-OFF'
                : item.StatusName === 'PARTIALLYWAIVEDOFF'
                ? 'PART-WVD'
                : item.StatusName}
            </AppText>
          </View>
          <View style={styles.seperator}></View>
          <View style={styles.blockPadding}>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Total</AppText>
              <AppText style={styles.subheading}>{item.TotalAmount}</AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Paid</AppText>
              <AppText style={styles.paid_subheading}>
                {item.PaidAmount}
              </AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Discounted</AppText>
              <AppText style={styles.discount_subheading}>
                {item.DiscountAmount}
              </AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Balance</AppText>
              <AppText style={styles.unpaid_subheading}>
                {item.RemainingAmount}
              </AppText>
            </View>
          </View>
          <View style={styles.seperator}></View>
          <View style={styles.lower_cardcontainer}>
            {item.ModifiedDate && (
              <AppText style={styles.Modified_heading}>
                {formatDate(item.ModifiedDate)}
              </AppText>
            )}
            <View style={styles.Iconcontainer}>
              {item.StatusName !== 'UNPAID' &&
                item.StatusName !== 'WAIVEDOFF' && (
                  <Icon
                    name="eye"
                    size={30}
                    color="#617DC5"
                    onPress={() =>
                      navigation.navigate({
                        name: 'Adjustment',
                        params: {OverduesId: item.OverduesId},
                        merge: true,
                      })
                    }
                  />
                )}
              {item.StatusName === 'PAID' && (
                <Icon
                  name="restore"
                  size={30}
                  color={colors.primary}
                  onPress={() => RevokeStudentOverdues(item.OverduesId)}
                />
              )}
            </View>
          </View>
        </Card>
      ))
    ) : (
      <View style={styles.noDataContainer}>
        <AppText>No Data Found</AppText>
      </View>
    );

  return (
    <AppScreen style={styles.container}>
      <AppActivityIndicator visible={loading} />
      <ScrollView
  style={{flex: 0.95}}
  contentContainerStyle={{paddingBottom: 10}} // 👈 adds space below last card
>{renderedCards}</ScrollView>
<View style={styles.lowercontainer}>
        <View style={styles.lower_innercontainer}>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Total</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary?.total}</AppText>
          </View>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Discount</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary?.discount}</AppText>
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

export default Fee;
