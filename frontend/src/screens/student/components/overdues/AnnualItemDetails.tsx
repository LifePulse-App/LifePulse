import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '@rneui/base';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppText from '../../../../components/Layout/AppText/AppText';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import styles from './Overduesstyles';

const AnnualItemDetails = ({ route, navigation }: any) => {
  const { TypeName, StudentOverduesList } = route.params;

  const formatDate = (dateString: string) => {
    const [datePart] = dateString.split(' ');
    const [monthIndex, day, year] = datePart.split('/').map(Number);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[monthIndex - 1]} ${day}, ${year}`;
  };

  const filteredItems = StudentOverduesList?.filter(
    (item: any) => item.TypeName === TypeName
  ) || [];

  const summary = filteredItems.reduce(
    (acc: { total: number; paid: number; discount: number; balance: number }, item: any) => {
      acc.total += item.TotalAmount || 0;
      acc.paid += item.PaidAmount || 0;
      acc.discount += item.DiscountAmount || 0;
      acc.balance += item.RemainingAmount || 0;
      return acc;
    },
    { total: 0, paid: 0, discount: 0, balance: 0 }
  );

  const shouldShowEye = (item: any) => {
    const allowedStatuses = ['PAID', 'PARTIALLYPAID', 'DISCOUNTED', 'UNPAID'];
    return allowedStatuses.includes(item.StatusName) &&
      (item.PaidAmount > 0 || item.DiscountAmount > 0);
  };

  return (
    <AppScreen style={styles.container}>
      <AppActivityIndicator visible={false} />

      {/* 🔙 Back Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ flexDirection: 'row', alignItems: 'center', margin: 15 }}
      >
        <Icon name="arrow-left" size={22} color="black" />
        <AppText style={{ fontSize: 16, color: 'black', marginLeft: 8, fontWeight: 'bold' }}>
          Annual Items
        </AppText>
      </TouchableOpacity>

      <ScrollView style={{ flex: 0.95, paddingBottom: 20, borderTopColor: "grey", borderTopWidth: 0.5 }}>
        {filteredItems.length === 0 ? (
          <View style={styles.noDataContainer}>
            <AppText>No Details Found</AppText>
          </View>
        ) : (
          filteredItems.map((item: any, index: number) => (
            <Card containerStyle={styles.cards} key={index}>
              <View style={styles.innercontainer}>
                <View style={styles.summaryHeader}>
                  <View
                    style={[
                      styles.leftBadge,
                      item.StatusName === 'PAID' || item.StatusName === 'PARTIALLYPAID'
                        ? { backgroundColor: 'green' }
                        : item.StatusName === 'DISCOUNTED'
                          ? { backgroundColor: '#314299' }
                          : item.StatusName === 'UNPAID'
                            ? { backgroundColor: 'red' }
                            : { backgroundColor: '#617DC5' },
                    ]}
                  >
                    <AppText style={styles.badgeText}>{index + 1}</AppText>
                  </View>
                </View>

                <AppText
                  style={
                    item.StatusName === 'UNPAID'
                      ? styles.status_text_reds
                      : styles.status_text_greens
                  }
                >
                  {item.StatusName === 'PARTIALLYPAID'
                    ? 'P. Paid'
                    : item.StatusName === 'PARTIALLYWAIVEDOFF'
                      ? 'PART-WVD'
                      : item.StatusName}
                </AppText>
              </View>

              <View style={styles.blockPadding}>
                <View style={styles.textContainer}>
                  <AppText style={styles.textHeading}>Total</AppText>
                  <AppText style={styles.subheading}>{item.TotalAmount}</AppText>
                </View>
                <View style={styles.textContainer}>
                  <AppText style={styles.textHeading}>Discounted</AppText>
                  <AppText style={styles.discount_subheading}>{item.DiscountAmount}</AppText>
                </View>
                <View style={styles.textContainer}>
                  <AppText style={styles.textHeading}>Paid</AppText>
                  <AppText style={styles.paid_subheading}>{item.PaidAmount}</AppText>
                </View>
                <View style={styles.textContainer}>
                  <AppText style={styles.textHeading}>Balance</AppText>
                  <AppText style={styles.unpaid_subheading}>{item.RemainingAmount}</AppText>
                </View>
              </View>

              {/* 👁 Eye Icon and Date */}
              <View style={styles.Iconcontainer}>
                
                  <>
                    <AppText style={styles.Modified_headings}>
                      {formatDate(item?.ModifiedDate)}
                    </AppText>
                    <Icon
                      name="eye"
                      size={22}
                      color="#617DC5"
                      onPress={() =>
                        navigation.navigate('AdjustmentDetailScreen', {
                          overduesId: item.OverduesId,
                          OverduesAdjustmentId: item.OverduesAdjustmentId,
                        })
                      }
                    />
                  </>
               
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* 🔻 Bottom Summary */}
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
            <AppText style={{ color: 'white', fontWeight: 'bold' , fontSize: 15}}>Balance</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary?.balance}</AppText>
          </View>
        </View>
      </View>
    </AppScreen>
  );
};

export default AnnualItemDetails;
