import { StyleSheet } from "react-native";

import defaultStyles from "../../../shared/styling/styles";

const styles = StyleSheet.create({
  container: {
    backgroundColor: defaultStyles.colors.light,
    borderRadius: 25,
    flexDirection: "row",
    width: "100%",
    padding: 5,
    marginVertical: 5
  },
  
  icon: {
    margin: 10,
  }
});

export default styles;
