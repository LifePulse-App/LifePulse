import { StyleSheet } from 'react-native';
import colors from '../../../../shared/styling/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingTop: 10,
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

  dropdownText: {
    fontSize: 16,
    textAlign: 'left',
  },

  disabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.3,
  },

  searchInput: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
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
});

export default styles;
