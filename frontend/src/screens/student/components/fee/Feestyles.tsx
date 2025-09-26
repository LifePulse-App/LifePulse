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
  blockPadding: {
    paddingTop: 5,
    paddingBottom: 5,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  card: {
    borderRadius: 15,
    padding:10,
    width: '91%',
    marginVertical: 10,
    elevation: 6, // Adding shadow for Android
    shadowColor: '#000', // Adding shadow for iOS
    shadowOffset: {width: 0, height: 2}, // Adding shadow for iOS
    shadowOpacity: 0.2, // Adding shadow for iOS
    shadowRadius: 4, // Adding shadow for iOS
    borderColor: "#617DC5",
    borderWidth: 2
  },
  innercontainer: {
    flexDirection: 'row',
    alignItems: 'center', // Keep elements vertically aligned
    paddingTop: 2,
    paddingLeft: 5,
    paddingBottom: 10, // Add padding bottom for spacing
    marginLeft: 2,
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
    color: '#5a5a5a', // Darkened color
    fontSize: 18, // Adjusted font size
    textAlign: 'center',
    fontWeight: 'bold',
  },
 
  status_text_green: {
    textAlign: 'center',
    width: 120,
    color: colors.white,
    fontSize: 12,
    borderRadius: 0,
    paddingVertical: 3,
    backgroundColor: "green",
    fontWeight: "bold"
  },
  status_text_red: {
    textAlign: 'center',
    width: 120,
    color: colors.white,
    fontSize: 12,
    borderRadius: 0,
    paddingVertical: 3,
    backgroundColor: "red",
    fontWeight: 'bold'
  },
  
  
  lowercontainer: {
    padding: 5,
    backgroundColor: '#617DC5',
    elevation: 6,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  lower_innercontainer: {
    justifyContent: 'space-around',
    marginHorizontal: 8,
  },
  seperator: {
    borderTopWidth: 0.5,
    borderColor: "grey",
    padding: 0
  },
  seperatorW: {
    borderTopWidth: 0.5,
    borderColor: "white",
    marginTop: 5
  },
  subheading: {
    color: "colors.black",
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  Modified_heading: {
    color: "colors.black",
    fontSize: 16, // Adjusted font size
    textAlign: 'left',
    marginRight: 20,
    fontWeight: 'bold',
  },
  Modified_headings: {
    color: "colors.black",
    fontSize: 16, // Adjusted font size
    textAlign: 'left',
    marginRight: 260,
    fontWeight: 'bold',
  },
  paid_subheading: {
    color: "green",
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  discount_subheading: {
    color: "#314299",
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'black',
  },
  unpaid_subheading: {
    color: "red",
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
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
    paddingLeft: 30, // Add padding to align with the icon

  },
});

export default styles;
