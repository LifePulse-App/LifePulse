import { StyleSheet } from 'react-native';
import colors from '../../shared/styling/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 5,
    paddingTop: 5,
  },

  // HEADER SECTION
  uppercontainer: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heading: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 28,
  },
  subheading: {
    color: colors.medium,
    fontSize: 13,
    textAlign: 'center',
  },

  // CARD STYLE
  card: {
    borderRadius: 15,
    width: '93%',
    minHeight: 90,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 6,
    padding: 5,
    marginVertical: 3,
    alignSelf: 'center',
  },
  innercard: {
    borderRadius: 15,
    width: '100%',
    minHeight: 200,
    backgroundColor: colors.light,
    padding: 15,
    marginTop: 10,
  },
  cardheading: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 22,
  },
  counterheading: {
    color: colors.secondary,
    fontWeight: 'bold',
    fontSize: 22,
  },
  innercardheading: {
    alignSelf: 'center',
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 18,
    marginVertical: 5,
  },

  // IMAGE & AVATAR
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.medium,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginVertical: 30,
  },
  logoContainer: {
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  logoText: {
    fontSize: 28,
    color: colors.black,
    fontWeight: 'bold',
  },

  // TEXT LAYOUT
  lowertext: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '500',
    color: colors.dark,
  },
  text_conatiner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 5,
  },
  text_heading: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 15,
  },
  text_subheading: {
    color: colors.medium,
    fontSize: 12,
    textAlign: 'center',
  },
  title: {
    color: colors.dark,
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },

  // ICON & MENU
  Iconcontainer: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  menuContainer: {
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light,
  },
  subMenuContainer: {
    marginLeft: 20,
    marginTop: 5,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light,
  },

  // MISC
  imagecontainer: {
    marginRight: 10,
  },
  details_container: {
    flex: 1,
    justifyContent: 'center',
  },
  lowercontainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  innercontainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
});

export default styles;
