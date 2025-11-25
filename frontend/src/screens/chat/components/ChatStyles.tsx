import { StyleSheet } from 'react-native';
import colors from '../../../shared/styling/lightModeColors';
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 0,
  },
  devText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
  },
  
  logoutButton: {
    marginTop: 0,
    flexDirection: 'row',
    minWidth: "100%",
    borderColor: colors.primary, // use your theme color, e.g. red
    borderTopWidth: 2,
    borderBottomWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  logoutText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    width: '91%',
    maxWidth: 420,
    paddingVertical: 20,
    paddingHorizontal: 3,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 20,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
    marginLeft: 5
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5
  },
  logoText: {
    fontSize: 32,
    color: colors.white,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 12,
    color: colors.primary,
  },
  infoText: {
    fontSize: 12,
    color: colors.black,
    fontWeight: '500',
  },
  uppercontainer: {
    backgroundColor: colors.primary,
    height: 50,
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
});

export default styles;
