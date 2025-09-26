import { StyleSheet } from 'react-native';
import colors from '../../../shared/styling/colors';

export default StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  container: {
    width: '100%',
    padding:10,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 0,
    borderRadius: 16,
    elevation: 6,
    backgroundColor: "white",
    borderColor: "black",
    borderWidth: 0.1
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    
  },
  logo: {
    width: 140,
    height: 60,
  },
  input: {
    marginBottom: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    
  },
  button: {
    marginTop: 0,
    borderRadius: 8,
    backgroundColor: "#5a75c2",
    margin: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // light overlay
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
