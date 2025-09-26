// AdjustmentDetailScreenStyles.ts
import { StyleSheet, Dimensions, Platform } from 'react-native';
import colors from '../../../../shared/styling/colors';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    elevation: 4,
  },
  backIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
  },
  card: {
    borderRadius: 15,
    width: '95%',
    alignSelf: 'center',
    marginVertical: 5,
    elevation: 4,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 8,
    paddingBottom: 20,
    
  },
  innercard: {
    borderRadius: 16,
    padding: 0,
    backgroundColor: '#F8F9FA',
    elevation: 6,
    minWidth: "95%",
    maxHeight: 150,
    marginLeft: 10,
    marginBottom: 8
    // borderBottomWidth: 0.5,
    // borderBottomColor: "black"
  },
  seperator: {
    borderTopWidth: 0.5,
    borderColor: "white"
  },
  cardHeadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,
    elevation: 0,
    padding: 0,
    paddingTop: 10,
    marginTop: 0,
  },
  iconStyle: {
    marginRight: 8,
  },
  cardheading: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
 
  },
  leftBadge: {
    backgroundColor: '#E25141',
    borderTopLeftRadius: 15,
    borderBottomRightRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    top: 0
  },
  rightBadge: {
    backgroundColor: '#E25141',
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  blockPadding: {
    paddingTop: 5,
    paddingBottom: 5,
  },
  contain: {
    paddingVertical: 5,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  textHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'black',
  },
  text_Subheading: {
    fontSize: 13,
    fontWeight: 'bold',
   marginLeft: 10,
   marginRight: -10
  },
  textSubheading: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lowercontainer: {
    padding: 8,
    backgroundColor: '#617DC5',
    elevation: 6,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  lower_innercontainer: {
    justifyContent: 'space-around',
    marginHorizontal: 10,
  },
});

export default styles;
