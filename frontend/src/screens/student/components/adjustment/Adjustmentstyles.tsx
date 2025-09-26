import {StyleSheet} from 'react-native';
import colors from '../../../../shared/styling/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  button_container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    
  },
  card: {
    borderRadius: 15,
    width: '95%',
    alignSelf: 'center',
    marginVertical: 10,
    elevation: 4,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 0,
    paddingBottom: 15,
    marginBottom: 10,
    marginTop: 10
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
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
  },
  innercard: {
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    elevation: 4,
    minWidth: 380,
  },
  line: {
     borderWidth: 10,
     borderColor: "black"
  },
  blockPadding: {
    paddingTop: 0,
    paddingBottom: 10,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  textContaines: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  innercontainer: {
    flexDirection: 'row',
    alignItems: 'center', // Keep elements vertically aligned

    paddingBottom: 10, // Add padding bottom for spacing

  },
  iconMonthYearContainer: {
    flex: 1, // Make this container flexible and fill remaining space
    flexDirection: 'row', // Allow elements to be placed horizontally
  },
  
  lower_cardcontainer: {
    flexDirection: 'row',
    paddingLeft: 10,
    justifyContent: 'space-between', // Keep elements spaced out
  },
 
  big_heading: {
    color: colors.black,
    fontSize: 16, // Adjusted font size
    fontWeight: 'bold',
  },
  heading: {
    color: 'black', // Darkened color
    fontSize: 14, // Adjusted font size
    textAlign: 'center',
    fontWeight: 'bold',
  },
  status_text_green: {
    textAlign: 'center',
    width: 130,
    color: colors.white,
    fontSize: 12,
    borderRadius: 25,
    marginLeft: "30%",
    marginTop: 5,
    paddingVertical: 2,
    backgroundColor: "green",
  },
  status_text_red: {
    textAlign: 'center',
    width: 200,
    color: colors.white,
    fontSize: 16,
    borderRadius: 25,
    marginLeft: 150,
    marginTop: 5,
    paddingVertical: 2,
    backgroundColor: "#314299",
  },
  seperator: {
    borderTopWidth: 0.5,
    borderColor: "white"
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
 
  },
  leftBadge: {
    backgroundColor: '#617DC5',
    borderTopLeftRadius: 15,
    borderBottomRightRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    top: 0
  },
  subheading: {
    color: colors.black,
    fontSize: 14, // Adjusted font size
    textAlign: 'center',
    fontWeight: "bold"
  },
  Modified_heading: {
    color: colors.black,
    fontSize: 15, // Adjusted font size
    textAlign: 'left',
    marginRight: 0,
    fontWeight: 'bold',
  },
  paid_subheading: {
    color: colors.black,
    fontSize: 14, // Adjusted font size
    textAlign: 'center',
    fontWeight: "bold"
  },
  discount_subheading: {
    color: colors.black,
    fontSize: 14, // Adjusted font size
    textAlign: 'center',
    fontWeight: "bold"
  },
  unpaid_subheading: {
    color: colors.black,
    fontSize: 14, // Adjusted font size
    textAlign: 'center',
    fontWeight: "bold"
  },
  unpaid__subheading: {
    color: colors.black,
    fontSize: 14, // Adjusted font size
    textAlign: 'center',
    fontWeight: "bold"
  },
  Iconcontainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Keep icons aligned to the end
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 350,
  },
  noDataText: {
    fontSize: 18,
    color: 'gray',
  },
  labelValueContainer: {
    flex: 1,
    alignItems: 'flex-start', // Align items to the start
    paddingLeft: 0, // Add padding to align with the icon

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
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    marginHorizontal: 12,
    borderRadius: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderColor: "#007EA7",
    borderWidth: 2
  },
  
  accordionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
  },

  lowercontainer: {
    padding: 12,
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
