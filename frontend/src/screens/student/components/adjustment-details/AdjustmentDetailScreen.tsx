// AdjustmentDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Platform,
  UIManager,
  LayoutAnimation,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Card } from '@rneui/themed';
import Carousel from 'react-native-reanimated-carousel';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';

import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppText from '../../../../components/Layout/AppText/AppText';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import styles from './AdjustmentDetailScreenStyles';
import colors from '../../../../shared/styling/colors';
import api_Student from '../../services/api_Student';
import Toast from 'react-native-toast-message';

const AdjustmentDetailScreen = ({ route, navigation }: any) => {
  const { overduesId } = route.params;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(true);

  const toggleAccordion = (type: 'items' | 'adjustments') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (type === 'items') setIsItemsOpen(!isItemsOpen);
    else setIsAdjustmentsOpen(!isAdjustmentsOpen);
  };

  const fetchAdjustmentDetail = async () => {
    setLoading(true);
    const response = await api_Student.getAnnualItemInvoiceById(overduesId);
    if (!response.ok) {
      setLoading(false);
      return Toast.show({ type: 'error', text1: "Failed to fetch adjustment detail."});
    }
    setData(response.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAdjustmentDetail();
  }, []);

  const summary = {
    total: data?.TotalAmount || 0,
    paid: data?.PaidAmount || 0,
    discount: data?.DiscountAmount || 0,
    balance: data?.RemainingAmount || 0,
  };

  const getTextColor = (label: string = ''): string => {
    const lower = label.toLowerCase();
    if (lower.includes('paid')) return '#509D4E';
    if (lower.includes('salary') || lower.includes('salaries')) return '#509D4E';
    if (lower.includes('overdues') || lower.includes('funded') || lower.includes('fund')) return '#314299';
    if (lower.includes('balance')) return '#E91E63';
    if (lower.includes('discount') || lower.includes('loans') || lower.includes('loan')) return '#E25141';
    return '#555';
  };

  return (
    <AppScreen style={styles.container}>
      <AppActivityIndicator visible={loading} />

      <View style={styles.headerContainer}>
        <Icon
          name="arrow-left"
          size={22}
          color={colors.black}
          onPress={() => navigation.goBack()}
          style={styles.backIcon}
        />
        <AppText style={styles.headerTitle}>Adjustment Receipt</AppText>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Item Details Accordion */}
        <Card containerStyle={styles.card}>
          <TouchableOpacity onPress={() => toggleAccordion('items')}>
            <View style={styles.cardHeadingContainer}>
              <MaterialIcon name="inventory" size={23} color="black" style={styles.iconStyle} />
              <AppText style={styles.cardheading}>Item Details</AppText>
              <MaterialIcon
                name={isItemsOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={26}
                color="black"
                style={{ marginLeft: "40%" }}
              />
            </View>
          </TouchableOpacity>

          {isItemsOpen && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Carousel
  loop
  width={Dimensions.get('window').width - 40}
  height={160}
  autoPlay
  autoPlayInterval={3000}
  scrollAnimationDuration={1500}
  data={data?.AnnualItemInvoiceDetailRequest}
  renderItem={({ item, index }) => (
    <Card key={index} containerStyle={styles.innercard}>
      <View style={styles.summaryHeader}>
        <View style={styles.leftBadge}>
          <AppText style={styles.badgeText}>{index + 1}</AppText>
        </View>
        <View style={styles.rightBadge}>
          <MaterialIcon name="inventory-2" size={15} color="white" />
        </View>
      </View>
      <View style={styles.blockPadding}>
        <View style={styles.textContainer}>
          <AppText style={styles.textSubheading}>{item?.ItemName}</AppText>
        </View>
        <View style={styles.contain}>
          <AppText style={styles.textHeading}>Qty</AppText>
          <AppText style={styles.textHeading}>Price</AppText>
        </View>
        <View style={styles.contain}>
          <AppText style={styles.text_Subheading}>{item?.Quantity}</AppText>
          <AppText style={styles.text_Subheading}>Rs {item?.Price}</AppText>
        </View>
      </View>
    </Card>
  )}
/>

              
            </ScrollView>
          )}
        </Card>

        {/* Adjustments Accordion */}
        <Card containerStyle={styles.card}>
          <TouchableOpacity onPress={() => toggleAccordion('adjustments')}>
            <View style={styles.cardHeadingContainer}>
              <FontAwesomeIcon name="money" size={22} color="black" style={styles.iconStyle} />
              <AppText style={styles.cardheading}>Adjustments</AppText>
              <MaterialIcon
                name={isAdjustmentsOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={26}
                color="black"
                style={{ marginLeft: "40%" }}
              />
            </View>
          </TouchableOpacity>

          {isAdjustmentsOpen && (
            <View>
              {data?.AnnualItemAdjustments?.map((adj: any, index: number) => {
                const status = adj.Status?.toLowerCase();
                const isDiscounted = status === 'discounted';
                const isPaid = status === 'paid' || status === 'partiallypaid';

                const textColor = isDiscounted
                  ?"#314299"
                  : isPaid
                  ? "#509D4E"
                  : "#314299";

                return (
                  <Card
                    key={index}
                    containerStyle={
                      styles.innercard}
                  >
                    <View style={styles.summaryHeader}>
                      <View style={[styles.leftBadge, { backgroundColor: textColor }]}>
                        <AppText style={styles.badgeText}>{index + 1}</AppText>
                      </View>
                      <View style={[styles.rightBadge, { backgroundColor: textColor }]}>
                        <FontAwesomeIcon name="money" size={16} color="white" />
                      </View>
                    </View>

                    <View style={styles.blockPadding}>
                      <View style={styles.textContainer}>
                        <AppText style={styles.textHeading}>Status</AppText>
                        <AppText style={{ color: textColor, fontWeight: "bold", fontSize: 13 }}>
                          {adj.Status}
                        </AppText>
                      </View>
                      <View style={styles.textContainer}>
                        <AppText style={styles.textHeading}>Discount</AppText>
                        <AppText style={{color: "#314299",fontWeight: "bold", fontSize: 13}}>{adj.DiscountAmount}</AppText>
                      </View>
                      <View style={styles.textContainer}>
                        <AppText style={styles.textHeading}>Paid</AppText>
                        <AppText style={{color: "green",fontWeight: "bold", fontSize: 13}}>{adj.PaidAmount}</AppText>
                      </View>
                      <View style={styles.textContainer}>
                        <AppText style={styles.textHeading}>Balance</AppText>
                        <AppText style={{color: "red", fontWeight: "bold", fontSize: 13}}>{adj.RemainingAmount}</AppText>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>

      <View style={styles.lowercontainer}>
        <View style={styles.lower_innercontainer}>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Total</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary.total}</AppText>
          </View>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Discount</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary.discount}</AppText>
          </View>
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Paid</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary.paid}</AppText>
          </View>
          <View style={styles.seperator} />
          <View style={styles.textContainer}>
            <AppText style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Balance</AppText>
            <AppText style={{ color: 'white', fontSize: 15 }}>{summary.balance}</AppText>
          </View>
        </View>
      </View>
    </AppScreen>
  );
};

export default AdjustmentDetailScreen;
