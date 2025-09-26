import { Dimensions, Platform } from "react-native";
import colors from "./colors";

const { height, width } = Dimensions.get('window');

export default {
    colors,
    text: {
        color: colors.dark,
        fontSize: 18,
        fontFamily: Platform.OS === "android" ? "Roboto" : "Avenir",
    },
    container: {
        flex: 1,
        backgroundColor: colors.white,
      },
    
      uppercontainer: {
        backgroundColor: colors.primary,
        height: 80,
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
    
      heading: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 24,
      },
    
      card: {
        borderRadius: 15,
        width: '95%',
        minHeight: 200,
        alignSelf: 'center',
        marginVertical: 10,
        elevation: 4,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
    
      innercard: {
        borderRadius: 15,
        width: '100%',
        marginLeft: 1,
        minHeight: 200,
      },
    
      cardheading: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 22,
        marginBottom: 10,
      },
    
      counterheading: {
        color: colors.secondary,
        fontWeight: 'bold',
        fontSize: 22,
      },
    
      innercardheading: {
        alignSelf: 'center',
        color: colors.secondary,
        fontWeight: 'bold',
        fontSize: 18,
      },
    
      subheading: {
        color: colors.black,
        paddingTop: 20,
        fontWeight: 'bold',
        fontSize: 20,
      },
    
      lowercontainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        alignContent: 'flex-start',
      },
      dropdown: {
        margin: 5,
        borderColor: "grey",
        borderWidth: 1,
        borderRadius: 12,
        maxWidth: "96.5%",
        minHeight: 50,
        backgroundColor: colors.white,
        zIndex: 999, // needed if overlapping other components
      },
      
      dropdownContainer: {
        borderColor: "grey",
        borderWidth: 1,
        borderRadius: 12,
        padding: 4,
        margin: 5,
        maxWidth: "96.5%",
        backgroundColor: '#f9f9f9',
      },
      
      dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 15,
      },
      
      dropdownLabel: {
        fontSize: 15,
        color: '#0A4D68',
        fontWeight: "bold",
      },
      
      dropdownPlaceholder: {
        color: '#aaa',
        fontSize: 16,
        fontWeight: '500',
      },
      
      logo: {
        width: 80,
        height: 80,
        alignSelf: 'center',
        marginTop: 50,
        marginBottom: 50,
      },
    
      lowertext: {
        textAlign: 'center',
        fontSize: 20,
      },
    
      text_conatiner: {
        justifyContent: 'space-between',
        flexDirection: 'row',
        width: '100%',
        marginBottom: 8,
      },
    
      text_heading: {
        color: colors.black,
        fontWeight: '900',
        fontSize: 16,
      },
    
      text_subheading: {
        color: colors.black,
        fontSize: 16,
      },
    
      loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      },
    
      loadingText: {
        marginTop: 10,
        color: colors.primary,
      },
      overlay: {
        flex: 1 as const,
        justifyContent: 'flex-end' as const,
        backgroundColor: 'rgba(0, 0, 0, 0.5)' as const,
      },
    
      modal: {
        backgroundColor: '#fff',
        paddingTop: 10,
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
        maxHeight: height * 0.45,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
      },
    
      content: {
        paddingBottom: 10,
      },
    
      list: {
        maxHeight: height * 0.35,
        width: '100%' as const,
      },
    
      item: {
        width: '100%',
        height: 50,
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#dcdcdc',
        backgroundColor: '#fff',
      },
    
      selectedItem: {
        backgroundColor: '#e6f0ff',
      },
    
      itemText: {
        fontSize: 13,
        color: '#333',
        textAlign: 'left',
        marginLeft: 15
      },
    
      doneButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 30,
        alignItems: 'center',
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 15,
        alignSelf: 'center',
        width: 200,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
    
      doneText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
      },
      modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
      },
      modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
      },
      input: {
        width: '100%',
        marginBottom: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 5,
        backgroundColor: '#f5f5f5',
      },
      errorText: {
        color: 'red',
        marginBottom: 10,
        width: '100%',
        textAlign: 'left',
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        width: '100%',
      },
      button: {
        flex: 1,
        padding: 10,
        marginHorizontal: 5,
        borderRadius: 5,
        backgroundColor: colors.primary,
        alignItems: 'center',
      },
      cancelButton: {
        backgroundColor: colors.danger,
      },
      buttonText: {
        color: 'white',
        fontWeight: 'bold',
      },
      bottomBar: {
        backgroundColor: '#f6f6f6',
        elevation: 6,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: Platform.OS === 'android' ? 60 : 90,
        paddingBottom: 3,
        overflow: 'hidden',
        justifyContent: 'center',
      },
      cardCarosal: {
        borderRadius: 16,
        padding: 0,
        marginBottom: 10,
        elevation: 5,
        backgroundColor: '#fff',
      },
      mainHeader: {
        backgroundColor: '#F1F6F9',
        borderRadius: 10,
        elevation: 4,
        marginBottom: 0,
        paddingVertical: 3, // Added to improve touch area
      },
      cardHeadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
      },
      iconStyle: {
        marginRight: 8,
      },
      innercardCarosal: {
        borderRadius: 16,
        padding: 0,
        backgroundColor: '#F8F9FA',
        elevation: 4,
        paddingBottom: 5,
      },
      textConatiner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        padding: 8,
        marginBottom: 0.5,
      },
      textHeading: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'System',
      },
      textSubheading: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#314299',
        fontFamily: 'System',
      },
      summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      },
      leftBadge: {
        backgroundColor: '#314299',
        borderTopLeftRadius: 15,
        borderBottomRightRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
      },
      blockPadding: {
        paddingTop: 1,
        paddingBottom: 1.5,
      },
      rightBadge: {
        backgroundColor: '#314299',
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
      },
      badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
      },
      cardHeading: {
        fontSize: 17,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',
        color: 'black',
        fontFamily: 'System',
      },
      containerEmployeeList: {
        flex: 1,
        backgroundColor: colors.white,
        paddingHorizontal: 10,
        paddingTop: 10,
      },
    
      topBar: {
        marginVertical: 10,
        alignItems: 'flex-start',
      },
    
      dropdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 8,
      },
    
      dropdownButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingVertical: 2.5,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        borderWidth: 1,
        borderColor: '#ddd',
      },
    
      dropdownText: {
        fontSize: 14,
        textAlign: 'left',
      },
    
      disabled: {
        backgroundColor: '#e0e0e0',
        opacity: 0.3,
      },
    
      searchInput: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 10,
        fontSize: 13,
        backgroundColor: '#f9f9f9',
      },
    
      noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
      },
    
      noDataText: {
        fontSize: 18,
        color: 'gray',
      },
      branchcard: {
        borderRadius: 16,
        padding: 0,
        marginBottom: 10,
        elevation: 5,
        backgroundColor: '#fff',
      },
      branchinnercard: {
        borderRadius: 16,
        padding: 0,
        backgroundColor: '#F8F9FA',
        elevation: 4,
        maxWidth: 370,
      },
      branchblockPadding: {
        paddingTop: 5,
        paddingBottom: 5,
      },
      branchtextContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        padding: 10,
      },
      branchmainHeader: {
        backgroundColor: '#ECEFF1',
        borderRadius: 8,
        elevation: 6,
        paddingVertical: 8,
      },
      branchcardHeadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
      branchiconStyle: {
        marginRight: 8,
      },
      branchtextHeading: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'System',
      },
      branchtextSubheading: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#E25141',
        fontFamily: 'System',
      },
      branchsummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      branchleftBadge: {
        backgroundColor: '#E25141',
        borderTopLeftRadius: 15,
        borderBottomRightRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
      },
      branchrightBadge: {
        backgroundColor: '#E25141',
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
      },
      branchbadgeText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
      },
      branchcardheading: {
        fontSize: 17,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',
        color: 'black',
        fontFamily: 'System',
      },
      financecard: {
        borderRadius: 16,
        padding: 0,
        marginBottom: 10,
        elevation: 5,
        backgroundColor: '#fff',
      },
      financemainHeader: {
        backgroundColor: '#F1F6F9',
        borderRadius: 10,
        elevation: 4,
      },
      financecardHeadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
      },
      financeiconStyle: {
        marginRight: 8,
      },
      financeinnercard: {
        borderRadius: 16,
        padding: 0,
        paddingBottom: 5,
        backgroundColor: '#F8F9FA',
        elevation: 4,
      },
      financetext_conatiner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        padding: 15,
        marginBottom: 0.5,
      },
      financeblockPadding: {
        paddingTop: 1,
        paddingBottom: 1,
      },
      financetext_heading: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'System',
      },
      financetext_subheading: {
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'System',
      },
      financehrLine: {
        height: 1,
        backgroundColor: '#ccc',
        marginVertical: 10,
        opacity: 0.6,
      },
      financecardheading: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',
        color: 'black',
        fontFamily: 'System',
      },
      financesummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      },
      financeleftBadge: {
        backgroundColor: '#EC5281',
        borderTopLeftRadius: 15,
        borderBottomRightRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
      },
      financerightBadge: {
        backgroundColor: '#EC5281',
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
      },
      financebadgeText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
      },
      financesectionHeadingContainer: {
        marginTop: 1,
        marginBottom: 5,
        alignItems: 'center',
      },
      financesectionHeadingText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'grey',
        textAlign: 'center',
        fontFamily: 'System',
      },
      
}