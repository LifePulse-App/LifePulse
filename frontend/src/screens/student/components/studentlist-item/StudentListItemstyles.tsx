import {StyleSheet} from 'react-native';
import colors from '../../../../shared/styling/colors';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    flex: 1,
    position: 'relative',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    width: '95%',
    minHeight: 100,
    padding: 5,
    backgroundColor: colors.white,
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderColor: "#617DC5",
    borderWidth: 2
  },
  innercontainer: {
    flex: 1,

  },

  image: {
    maxWidth: 60,
    maxHeight: 60,
    minWidth: 60,
    minHeight: 60,
    borderRadius: 90,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "grey",
    elevation: 6,
    marginBottom: 5
  },
  logoContainer: {
    maxWidth: 60,
    maxHeight: 60,
    borderRadius: 90,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.medium,
    elevation: 6
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark,
  },
  rowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 3,
  },
  
  heading: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  subtext: {
    fontSize: 14,
    marginTop: 2,
  },
  rightMenu: {
    position: 'absolute',
    top: 15,
    right: 0,
    height: '86.5%',
    width: 35,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 12,
    backgroundColor: '#617DC5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownOutside: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.medium,
    borderRadius: 8,
    width: 120,
    zIndex: 9999,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,

  },
  dropdownItem: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderBottomWidth: 0.2,
    borderBottomColor: colors.black,
    zIndex: 9999,
  },
  dropdownText: {
    fontSize: 12,
    color: colors.dark,
  },

  // ✅ New Styles
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 45,
    backgroundColor: '#617DC5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
});

export default styles;
