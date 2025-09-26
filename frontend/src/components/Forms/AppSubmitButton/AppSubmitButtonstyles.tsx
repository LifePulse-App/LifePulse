import { StyleSheet } from "react-native";

import defaultStyles from "../../../shared/styling/styles";

const styles = StyleSheet.create({
  button: {
    backgroundColor: defaultStyles.colors.primary,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    padding: 15,
  },
  text: {
    color: defaultStyles.colors.white,
    fontSize: 18,
    textTransform: 'uppercase',
    fontWeight: 'bold'
  }
});

export default styles;
