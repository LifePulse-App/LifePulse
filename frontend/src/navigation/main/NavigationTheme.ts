import { DefaultTheme } from "@react-navigation/native";
import colors from "../../shared/styling/lightModeColors";

export default {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.white
    }
};