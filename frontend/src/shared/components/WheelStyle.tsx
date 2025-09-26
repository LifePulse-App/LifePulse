import { StyleSheet, Dimensions } from 'react-native';
import colors from '../styling/colors';

const { height, width } = Dimensions.get('window');

export default StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  modal: {
    backgroundColor: '#fff',
    paddingTop: 20,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    maxHeight: height * 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },

  content: {
    paddingBottom: 10,
  },

  list: {
    maxHeight: height * 0.35,
    width: '100%',
  },

  item: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#dcdcdc',
    backgroundColor: '#fff',
  },

  selectedItem: {
    backgroundColor: '#e6f0ff',
  },

  itemText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'left',
    marginLeft: 15
  },

  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 15,
    alignSelf: 'center',
    width: width * 0.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  doneText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
