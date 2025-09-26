import { StyleSheet, Dimensions } from 'react-native';
import colors from '../../../../shared/styling/colors';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 5,
    paddingTop: 1,
  },

  topBar: {
    marginVertical: 10,
    alignItems: 'flex-start',
  },

  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },

  dropdownText: {
    fontSize: 13,
    textAlign: "left"
  },
  

  dropdownButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 2.5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  
  dropdownButtonn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 2.5,
    paddingHorizontal: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  disabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.3,
  },

  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 10,
  
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },

  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  noDataText: {
    fontSize: 18,
    color: 'gray',
  },

  // WHEEL MODAL STYLES
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    minHeight: screenHeight * 0.35,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  singleDropdownRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  

  doneButton: {
    marginTop: 15,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default styles;
