import {StyleSheet} from 'react-native';
import colors from '../../../shared/styling/colors';

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // light overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  loadingText: {
    marginTop: 10,
    color: colors.black, // Change text color to white for better contrast
    fontSize: 20, // Increase font size
    fontWeight: 'bold', // Set font weight to bold
    textAlign: 'center', // Center align text
  },
});

export default styles;
