import {StyleSheet} from 'react-native';
import colors from '../../../../shared/styling/colors';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 5,
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
    paddingHorizontal: 5,
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
    marginBottom: 6,
  },
  
  heading: {
    fontSize: 13,
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
    height: '89.5%',
    width: 35,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#617DC5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownOutside: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.medium,
    borderRadius: 8,
    width: 160,
    zIndex: 9999,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  dropdownText: {
    fontSize: 14,
    color: colors.dark,
  },

  // ✅ New Styles
  statusBadge: {
    position: 'absolute',
    top: 3,
    right: 35,
    backgroundColor: '#617DC5',
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 11,
  },
});

export default styles;