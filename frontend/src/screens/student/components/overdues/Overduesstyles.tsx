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
    marginVertical: 5,
    elevation: 4,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 10,
    paddingBottom: 20, 
    marginBottom: 10,
    marginTop: 10
  },
  cards: {
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
    padding: 0,
    paddingBottom: 20,
    marginBottom: 10,
    marginTop: 10
  },
  innercontainer: {
    flexDirection: 'row',
    alignItems: 'center', // Keep elements vertically aligned
    paddingBottom: 0, // Add padding bottom for spacing
  },
  iconMonthYearContainer: {
    flex: 1, // Make this container flexible and fill remaining space
    flexDirection: 'row', // Allow elements to be placed horizontally
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
  lower_cardcontainer: {
    flexDirection: 'row',
    paddingLeft: 10,
    justifyContent: 'space-between', // Keep elements spaced out
  },
  seperator: {
    borderTopWidth: 0.5,
    borderColor: "grey",
  },
  seperatorW: {
    borderTopWidth: 0.5,
    borderColor: "white",
    marginTop: 5
  },
  big_heading: {
    color: colors.black,
    fontSize: 15, // Adjusted font size
    fontWeight: 'bold',
  },
  big_headings: {
    color: colors.black,
    fontSize: 14, // Adjusted font size
    fontWeight: 'bold',
  },
  heading: {
    color: '#5a5a5a', // Darkened color
    fontSize: 14, // Adjusted font size
    textAlign: 'center',
    fontWeight: 'bold',
  },
  status_text_green: {
    textAlign: 'center',
    width: 100,
    color: colors.white,
    fontSize: 12,
    fontWeight: "bold",
    borderRadius: 0,
    paddingVertical: 2,
    backgroundColor: "green",
    marginLeft: 25,
    marginBottom: 5
  },
  status_text_red: {
    textAlign: 'center',
    width: 100,
    color: colors.white,
    fontSize: 12,
    borderRadius: 0,
    paddingVertical: 2,
    backgroundColor: "red",
    marginLeft: 25
  },
  status_text_greens: {
    textAlign: 'center',
    width: 100,
    color: colors.white,
    fontSize: 13,
    borderRadius: 0,
    paddingVertical: 2,
    backgroundColor: "green",
    marginLeft: 130,
    marginTop: 10, 
    fontWeight: "bold"
  },
  status_text_reds: {
    textAlign: 'center',
    width: 80,
    color: colors.white,
    fontSize: 13,
    borderRadius: 0,
    paddingVertical: 2,
    backgroundColor: "red",
    marginLeft: 150, 
    marginTop: 10,
    fontWeight: "bold"
  },
  badgeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
 
  },
  leftBadge: {
    backgroundColor: '#617DC5',
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    top: 0
  },
  blockPadding: {
    paddingTop: 5,
    paddingBottom: 5,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  subheading: {
    color: "colors.black",
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  Modified_heading: {
    color: "black",
    fontSize: 15, // Adjusted font size
    textAlign: 'left',
    marginTop: 5,
    marginRight: 20,
    fontWeight: 'bold',
  },
  Modified_headings: {
    color: "black",
    fontSize: 16, // Adjusted font size
    textAlign: 'left',
    marginRight: "50%",
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
    marginRight: 10,
    marginTop: 5
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 350,
  },
  noDataText: {
    fontSize: 14,
    color: 'gray',
  },
  labelValueContainer: {
    flex: 1,
    alignItems: 'flex-start', // Align items to the start
    paddingLeft: 30, // Add padding to align with the icon

  },
});

export default styles;
