import { StyleSheet } from "react-native";

import colors from "../../../shared/styling/colors";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 15,
    flex: 1,
  },
  card: {
    borderRadius: 15,
    width: '95%',
    minHeight: 200,
  },
  innercontainer: {
    flex: 1,
    justifyContent: 'center'
  },
  lowercontainer: {
    flex: 1,
    justifyContent: 'center'
  },
  buttoncontainer: {
      flexDirection: 'row',
      padding: 15,
      justifyContent: "space-between"
      
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 35,
    marginRight: 5,
    borderWidth: 1,
    borderColor: colors.black
  },
  title:{
    fontWeight: 'bold',
    color: colors.black
  },
  description:{
    color: colors.medium,
  },
  logoContainer: {
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 10,
  },
  logoText: {
    fontSize: 40,
    color: colors.black, 
  },
});

export default styles;
