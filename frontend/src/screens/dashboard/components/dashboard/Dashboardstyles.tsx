import { StyleSheet, Platform } from 'react-native';
import colors from '../../../../shared/styling/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  uppercontainer: {
    backgroundColor: colors.primary,
    height: 80,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 0 : 20, // Adjust for iOS status bar
  },

  Iconcontainer: {
    marginRight: 'auto',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  heading: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 24,
  },



  card: {
    borderRadius: 15,
    width: '95%',
    minHeight: 200,
    alignSelf: 'center',
    marginVertical: 10,
    elevation: 4,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  innercard: {
    borderRadius: 15,
    width: '100%',
    marginLeft: 1,
    minHeight: 200,
  },

  cardheading: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 10,
  },

  counterheading: {
    color: colors.secondary,
    fontWeight: 'bold',
    fontSize: 22,
  },

  innercardheading: {
    alignSelf: 'center',
    color: colors.secondary,
    fontWeight: 'bold',
    fontSize: 18,
  },

  subheading: {
    color: colors.black,
    paddingTop: 20,
    fontWeight: 'bold',
    fontSize: 20,
  },

  lowercontainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
  },
  dropdown: {
    margin: 10,
    borderColor: "grey",
    borderWidth: 1,
    borderRadius: 12,
    maxWidth: 430,
    minHeight: 50,
    backgroundColor: colors.white,
    zIndex: 999, // needed if overlapping other components
  },
  
  dropdownContainer: {
    borderColor: "grey",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    margin: 10,
    maxWidth: 430,
    backgroundColor: '#f9f9f9',
  },
  
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  
  dropdownLabel: {
    fontSize: 16,
    color: '#0A4D68',
    fontWeight: "bold",
  },
  
  dropdownPlaceholder: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '500',
  },
  
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginTop: 50,
    marginBottom: 50,
  },

  lowertext: {
    textAlign: 'center',
    fontSize: 20,
  },

  text_conatiner: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
  },

  text_heading: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 16,
  },

  text_subheading: {
    color: colors.black,
    fontSize: 16,
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },

  loadingText: {
    marginTop: 10,
    color: colors.primary,
  },
});

export default styles;
