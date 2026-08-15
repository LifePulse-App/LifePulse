import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView, 
  Platform,
  Linking
} from 'react-native';
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Purchases from 'react-native-purchases';
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeIcon, getIcon } from 'react-native-change-icon';
import MainLayout from '../../../shared/components/MainLayout';
import apiClient from "../../../auth/api-client/api_client"; 

const PREMIUM_PREFS_CACHE_KEY = 'streaksphere_premium_prefs';

// ⚡ MOCK PRICING FOR iOS ONLY (To keep UI intact without Apple Dev Account)
const MOCK_IOS_PACKAGES = [
  {
    identifier: '$rc_monthly',
    packageType: 'MONTHLY',
    product: {
      identifier: 'premium_monthly',
      title: 'Monthly Premium',
      description: 'Full access billed monthly',
      priceString: '$4.99',
      price: 4.99,
    },
  },
  {
    identifier: '$rc_annual',
    packageType: 'ANNUAL',
    product: {
      identifier: 'premium_annual',
      title: 'Annual Premium',
      description: 'Save 30% billed yearly',
      priceString: '$39.99',
      price: 39.99,
    },
  },
];

// ⚡ Premium Glassy Result Card
const GlassyResultCard = ({ visible, type = "success", message, onClose }) => {
  if (!visible) return null;

  const isSuccess = type === "success";
  const iconName = isSuccess ? "check-decagram" : "alert-circle";
  const accentColor = isSuccess ? "#10b981" : "#ef4444"; 
  const accentGlow = isSuccess ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";

  return (
    <View style={styles.resultOverlay}>
      <View style={styles.resultCard}>
        <View style={[styles.resultIconWrapper, { backgroundColor: accentGlow, borderColor: accentColor }]}>
          <Icon name={iconName} size={42} color={accentColor} />
        </View>
        <Text style={styles.resultTitle}>{isSuccess ? "Success!" : "Oops!"}</Text>
        <Text style={styles.resultMessage}>{message}</Text>
        <TouchableOpacity style={[styles.resultOkBtn, { backgroundColor: accentColor }]} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.resultBtnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function PaywallScreen({ navigation }) {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // ⚡ Subscription States
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activePlanName, setActivePlanName] = useState("StreakSphere+ Premium");
  const [expiryDate, setExpiryDate] = useState("");
  const [willRenew, setWillRenew] = useState(false);

  // ⚡ Feature Toggle States
  const [hideRelationship, setHideRelationship] = useState(false);
  const [xpMultiplier, setXpMultiplier] = useState(true);
  const [premiumBadge, setPremiumBadge] = useState(true);
  const [prefLoading, setPrefLoading] = useState(false);

  // ⚡ History & Icon States
  const [relationshipHistory, setRelationshipHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMode, setHistoryMode] = useState("my");
  const [currentAppIcon, setCurrentAppIcon] = useState('Default');

  // ⚡ UI States
  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });
  const historySheetRef = useRef(null);
  const iconSheetRef = useRef(null);

  const availableIcons = [
    { id: 'Default', name: 'Original', icon: 'star-circle', color: '#6366f1' },
    { id: 'Dark', name: 'Midnight Dark', icon: 'weather-night', color: '#1e293b' },
    { id: 'Gold', name: 'Premium Gold', icon: 'crown', color: '#fbbf24' },
    { id: 'Neon', name: 'Neon Pink', icon: 'lightning-bolt', color: '#ec4899' },
  ];

  const updateSubscriptionState = (customerInfo) => {
    const entitlement = customerInfo?.entitlements?.active['streaksphere_plus'];
    if (entitlement) {
      setIsSubscribed(true);
      setWillRenew(entitlement.willRenew);
      if (entitlement.expirationDate) {
        setExpiryDate(new Date(entitlement.expirationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      }
      const productId = (entitlement.productIdentifier || "").toLowerCase();
      if (productId.includes('annual') || productId.includes('year')) setActivePlanName("StreakSphere+ (Yearly)");
      else if (productId.includes('month')) setActivePlanName("StreakSphere+ (Monthly)");
      else setActivePlanName("StreakSphere+ Premium");
    } else {
      setIsSubscribed(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 1. Fetch Real Subscription Status (Works on both iOS & Android)
        const customerInfo = await Purchases.getCustomerInfo();
        updateSubscriptionState(customerInfo);

        // 2. Fetch Pricing 
        if (Platform.OS === 'ios') {
          // Block iOS StoreKit API call, use UI mock data
          setPackages(MOCK_IOS_PACKAGES);
        } else {
          // Normal Android Google Play fetch
          const offerings = await Purchases.getOfferings();
          if (offerings.current?.availablePackages.length > 0) {
            setPackages(offerings.current.availablePackages);
          }
        }

        // Fetch user preferences
        const cachedPrefs = await AsyncStorage.getItem(PREMIUM_PREFS_CACHE_KEY);
        if (cachedPrefs) {
          const p = JSON.parse(cachedPrefs);
          if (p.hideRelationship !== undefined) setHideRelationship(p.hideRelationship);
          if (p.xpMultiplier !== undefined) setXpMultiplier(p.xpMultiplier);
          if (p.premiumBadge !== undefined) setPremiumBadge(p.premiumBadge);
        }

        const res = await apiClient.get('/profile/premium-preferences');
        if (res.data?.success) {
          const fresh = res.data.preferences;
          setHideRelationship(fresh.hideRelationship);
          setXpMultiplier(fresh.xpMultiplier);
          setPremiumBadge(fresh.premiumBadge);
          await AsyncStorage.setItem(PREMIUM_PREFS_CACHE_KEY, JSON.stringify(fresh));
        }
      } catch (error) {
        console.error("Initialization Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handlePurchase = async (pkg) => {
    if (Platform.OS === 'ios') {
      // ⚡ BLOCK iOS PURCHASES ENTIRELY
      setResultCard({ 
        visible: true, 
        type: "error", 
        message: "In-app purchases are disabled on this iOS build. Please upgrade via an Android device." 
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['streaksphere_plus']) updateSubscriptionState(customerInfo);
    } catch (error) {
      if (!error.userCancelled) setResultCard({ visible: true, type: "error", message: error.message || "Purchase failed." });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsPurchasing(true);
    try {
      let customerInfo;
      if (Platform.OS === 'ios') {
        // ⚡ Bypass Apple's restore API, just refresh RevenueCat server status
        customerInfo = await Purchases.getCustomerInfo();
      } else {
        // Real restore for Android
        customerInfo = await Purchases.restorePurchases();
      }

      if (customerInfo?.entitlements?.active['streaksphere_plus']) {
        updateSubscriptionState(customerInfo);
        setResultCard({ visible: true, type: "success", message: "Premium status verified and restored!" });
      } else {
        setResultCard({ visible: true, type: "error", message: "No active subscription found." });
      }
    } catch (error) {
      setResultCard({ visible: true, type: "error", message: error.message || "Restore failed." });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleManageSubscription = async () => {
    if (Platform.OS === 'ios') {
      setResultCard({ visible: true, type: "error", message: "Subscription management is disabled on this device." });
      return;
    }
    try {
      await Purchases.showManageSubscriptions();
    } catch (error) {
      await Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const togglePreference = async (key, currentValue, setter) => {
    if (prefLoading) return;
    const newValue = !currentValue;
    setter(newValue); 
    AsyncStorage.getItem(PREMIUM_PREFS_CACHE_KEY).then(cached => {
      const p = cached ? JSON.parse(cached) : {};
      p[key] = newValue;
      AsyncStorage.setItem(PREMIUM_PREFS_CACHE_KEY, JSON.stringify(p));
    });

    setPrefLoading(true);
    try {
      await apiClient.post('/profile/premium-preferences', { [key]: newValue });
    } catch (error) {
      setter(currentValue);
      setResultCard({ visible: true, type: "error", message: "Failed to sync setting with server." });
    } finally {
      setPrefLoading(false);
    }
  };

  const openHistorySheet = async (mode) => {
    setHistoryMode(mode);
    setHistoryLoading(true);
    await historySheetRef.current?.present();
    
    try {
      const endpoint = mode === "my" ? '/relationship/history' : '/relationship/partner-history';
      const res = await apiClient.get(endpoint);
      if (res.data?.success) {
        setRelationshipHistory(res.data.history || []);
      }
    } catch(error) {
      setResultCard({ visible: true, type: "error", message: `Failed to load ${mode === "my" ? "your" : "partner's"} relationship history.` });
    } finally {
      setHistoryLoading(false);
    }
  };

  const openIconSheet = async () => {
    try {
      const activeIcon = await getIcon();
      setCurrentAppIcon(activeIcon === 'default' ? 'Default' : activeIcon);
    } catch(e) { }
    await iconSheetRef.current?.present();
  };

  const handleSelectIcon = async (iconId) => {
    try {
      await changeIcon(iconId === 'Default' ? null : iconId);
      setCurrentAppIcon(iconId);
      iconSheetRef.current?.dismiss();
      setResultCard({ visible: true, type: "success", message: "App Icon changed! Check your home screen in a few moments." });
    } catch(e) {
      setResultCard({ visible: true, type: "error", message: "Icon change failed. Ensure native icons are configured." });
    }
  };

  const renderHistorySheet = () => (
    <TrueSheet ref={historySheetRef} detents={[0.65]} cornerRadius={28} backgroundColor="#0F172A" grabber={false}>
      <View style={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.sheetTitle}>
          {historyMode === "my" ? "My Relationship History" : "Partner's History"}
        </Text>
        <Text style={styles.sheetSubtitle}>
          {historyMode === "my" 
            ? "A complete record of your past connections." 
            : "View your current partner's past connections."}
        </Text>
        
        {historyLoading ? (
          <ActivityIndicator size="large" color="#fbbf24" style={{ marginTop: 40 }} />
        ) : relationshipHistory.length === 0 ? (
          <Text style={{ color: "#9CA3AF", textAlign: "center", marginTop: 40 }}>No past relationships found.</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
            {relationshipHistory.map((hist, idx) => (
              <View key={hist._id || idx} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{hist.partnerName}</Text>
                  <Text style={styles.historySub}>Duration: {hist.durationDays} Days</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.historyDate}>Ended on</Text>
                  <Text style={[styles.historyDate, { color: "#F9FAFB" }]}>
                    {new Date(hist.endDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </TrueSheet>
  );

  const renderIconSheet = () => (
    <TrueSheet ref={iconSheetRef} detents={[0.55]} cornerRadius={28} backgroundColor="#0F172A" grabber={false}>
      <View style={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.sheetTitle}>Custom App Icon</Text>
        <Text style={styles.sheetSubtitle}>Choose how StreakSphere looks on your home screen.</Text>
        
        <View style={{ marginTop: 10, gap: 12 }}>
          {availableIcons.map((icon) => {
            const isActive = currentAppIcon === icon.id;
            return (
              <TouchableOpacity 
                key={icon.id}
                style={[styles.iconSelectionCard, isActive && styles.iconCardActive]}
                onPress={() => handleSelectIcon(icon.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconPreviewBox, { backgroundColor: icon.color }]}>
                  <Icon name={icon.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.iconSelectionName}>{icon.name}</Text>
                {isActive && <Icon name="check-circle" size={24} color="#10b981" />}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </TrueSheet>
  );

  if (isLoading) {
    return (
      <MainLayout hideNavBar={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ color: "#9CA3AF", marginTop: 10 }}>Loading StreakSphere+...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideNavBar={true}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass} onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>StreakSphere+</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView style={styles.overlay} showsVerticalScrollIndicator={false}>
        
        {isSubscribed ? (
          <View style={styles.activeContainer}>
            <View style={styles.mainCard}>
              <View style={styles.badgeWrap}>
                <Icon name="crown" size={50} color="#fbbf24" />
              </View>
              <Text style={styles.headerTitle}>You are a Plus Member 🌟</Text>
              <Text style={styles.headerSub}>Manage your exclusive benefits and plan settings.</Text>
            </View>

            <Text style={styles.sectionTitle}>Plan Details</Text>
            <View style={styles.settingCard}>
              <Icon name="check-decagram" size={24} color="#22c55e" />
              <Text style={styles.settingLabel}>{activePlanName}</Text>
            </View>
            {expiryDate ? (
              <View style={styles.settingCard}>
                <Icon name="calendar-clock" size={24} color="#a855f7" />
                <Text style={styles.settingLabel}>{willRenew ? "Renews: " : "Expires: "} {expiryDate}</Text>
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Plus Settings</Text>

            <TouchableOpacity activeOpacity={0.88} style={styles.toggleRow} onPress={() => togglePreference('hideRelationship', hideRelationship, setHideRelationship)}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Icon name="eye-off" size={20} color={hideRelationship ? "#22c55e" : "#94a3b8"} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.toggleTitle}>Hide Relationship Status</Text>
                  <Text style={styles.toggleSub}>Hide your relationship from your public profile.</Text>
                </View>
              </View>
              <View style={[styles.togglePill, hideRelationship ? styles.pillOn : styles.pillOff]}>
                <View style={[styles.toggleDot, hideRelationship ? styles.dotOn : styles.dotOff]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.88} style={styles.toggleRow} onPress={() => togglePreference('xpMultiplier', xpMultiplier, setXpMultiplier)}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Icon name="star-shooting" size={20} color={xpMultiplier ? "#60a5fa" : "#94a3b8"} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.toggleTitle}>2x XP Multiplier</Text>
                  <Text style={styles.toggleSub}>Earn double points for leaderboard ranking.</Text>
                </View>
              </View>
              <View style={[styles.togglePill, xpMultiplier ? styles.pillOn : styles.pillOff]}>
                <View style={[styles.toggleDot, xpMultiplier ? styles.dotOn : styles.dotOff]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.88} style={styles.toggleRow} onPress={() => togglePreference('premiumBadge', premiumBadge, setPremiumBadge)}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Icon name="star-circle" size={20} color={premiumBadge ? "#fbbf24" : "#94a3b8"} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.toggleTitle}>Show Premium Badge</Text>
                  <Text style={styles.toggleSub}>Display the star badge next to your name.</Text>
                </View>
              </View>
              <View style={[styles.togglePill, premiumBadge ? styles.pillOn : styles.pillOff]}>
                <View style={[styles.toggleDot, premiumBadge ? styles.dotOn : styles.dotOff]} />
              </View>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Exclusive Actions</Text>

            <TouchableOpacity style={styles.actionCard} onPress={() => openHistorySheet("my")}>
              <Icon name="history" size={24} color="#fbbf24" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionCardTitle}>My Relationship History</Text>
                <Text style={styles.actionCardSub}>View your past relationship details</Text>
              </View>
              <Icon name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => openHistorySheet("partner")}>
              <Icon name="account-search" size={24} color="#f43f5e" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionCardTitle}>Partner's History</Text>
                <Text style={styles.actionCardSub}>See your current partner's past connections</Text>
              </View>
              <Icon name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { opacity: 0.5 }]}>
              <Icon name="palette" size={24} color="#a855f7" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionCardTitle}>Custom App Icon</Text>
                <Text style={styles.actionCardSub}>Coming Soon</Text>
              </View>
               <Icon name="lock-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={[styles.actionCard, { opacity: 0.5 }]}>
              <Icon name="theme-light-dark" size={24} color="#ec4899" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionCardTitle}>App Themes</Text>
                <Text style={[styles.actionCardSub, { color: "#ec4899" }]}>Coming Soon</Text>
              </View>
              <Icon name="lock-outline" size={20} color="#9CA3AF" />
            </View>

            <TouchableOpacity 
              style={[styles.manageBtn, { backgroundColor: "rgba(99,102,241,0.2)", borderWidth: 1, borderColor: "#6366f1", marginTop: 10, marginBottom: 20 }]} 
              onPress={handleManageSubscription}
            >
              <Text style={{ color: "#818cf8", fontWeight: "bold" }}>Manage Subscription</Text>
            </TouchableOpacity>

          </View>
        ) : (
          /* FREE TIER VIEW */
          <>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            
            <View style={{ gap: 12, marginBottom: 24 }}>
             {packages.map((pkg) => {
                const isAnnual = pkg.packageType === 'ANNUAL';

                const displayTitle = isAnnual
                  ? "StreakSphere+ (Yearly)"
                  : "StreakSphere+ (Monthly)";

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      isAnnual && styles.packageCardHighlighted
                    ]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isPurchasing}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageTitle}>
                        {displayTitle}
                      </Text>

                      <Text style={styles.packageSub}>
                        {pkg.product.description || "Full access to all Plus features"}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.packagePrice}>
                        {pkg.product.priceString}
                      </Text>

                      <Text style={styles.packageDuration}>
                        {isAnnual ? '/ year' : '/ month'}
                      </Text>
                    </View>

                    {isAnnual && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>BEST VALUE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.featuresListContainer}>
              <Text style={styles.sectionTitle}>Plus Benefits</Text>
              
              <View style={styles.featureItem}>
                <Icon name="history" size={22} color="#fbbf24" />
                <Text style={styles.featureText}>View complete relationship history of yours and your partner's past connections</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="heart-broken" size={22} color="#f87171" />
                <Text style={styles.featureText}>Instant break-up without the 24-hour timer</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="backup-restore" size={22} color="#34d399" />
                <Text style={styles.featureText}>Restore relationship streaks within 24 hours</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="eye-off" size={22} color="#94a3b8" />
                <Text style={styles.featureText}>Hide your relationship status from your profile</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="palette" size={22} color="#a855f7" />
                <Text style={styles.featureText}>Custom App Icon & Premium App Themes</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="star-shooting" size={22} color="#60a5fa" />
                <Text style={styles.featureText}>2x Multiplier on all Leaderboard points</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="star-circle" size={22} color="#fbbf24" />
                <Text style={styles.featureText}>Exclusive Premium Star Badge for your profile</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.restoreBtn} onPress={handleRestorePurchases} disabled={isPurchasing}>
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderHistorySheet()}
      {renderIconSheet()}

      <GlassyResultCard
        visible={resultCard.visible}
        type={resultCard.type}
        message={resultCard.message}
        onClose={() => setResultCard({ ...resultCard, visible: false })}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", marginTop: 3, paddingHorizontal: 18 },
  iconGlass: { width: 40, height: 40, borderRadius: 16, backgroundColor: "rgba(15, 23, 42, 0.0)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.4)", justifyContent: "center", alignItems: "center" },
  pageTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  rightSpacer: { width: 40, height: 40 },
  overlay: { flex: 1, paddingTop: 20, paddingHorizontal: 18 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainCard: { backgroundColor: "rgba(15,23,42,0.4)", borderRadius: 22, padding: 20, marginBottom: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.15)" },
  badgeWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(251,191,36,0.12)", justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  headerTitle: { color: "#F9FAFB", fontWeight: "bold", fontSize: 20, textAlign: "center", marginBottom: 6 },
  headerSub: { color: "#9CA3AF", fontSize: 13, textAlign: "center", lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: "#F9FAFB", marginBottom: 12 },
  settingCard: { backgroundColor: "rgba(15,23,42,0.34)", borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.15)" },
  settingLabel: { color: "#F9FAFB", fontWeight: "bold", fontSize: 15, marginLeft: 13 },
  toggleRow: { width: "100%", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, backgroundColor: "rgba(15,23,42,0.55)", borderWidth: 1, borderColor: "rgba(148,163,184,0.35)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleTitle: { color: "#F9FAFB", fontWeight: "800", fontSize: 14 },
  toggleSub: { color: "#9CA3AF", fontSize: 11, marginTop: 3, lineHeight: 14 },
  togglePill: { width: 44, height: 24, borderRadius: 999, padding: 3, justifyContent: "center" },
  pillOn: { backgroundColor: "rgba(34,197,94,0.45)" },
  pillOff: { backgroundColor: "rgba(148,163,184,0.25)" },
  toggleDot: { width: 18, height: 18, borderRadius: 999 },
  dotOn: { backgroundColor: "#22c55e", alignSelf: "flex-end" },
  dotOff: { backgroundColor: "#e5e7eb", alignSelf: "flex-start" },
  actionCard: { backgroundColor: "rgba(15,23,42,0.34)", borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.15)" },
  actionCardTitle: { color: "#F9FAFB", fontWeight: "bold", fontSize: 15 },
  actionCardSub: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  featuresListContainer: { marginBottom: 10, backgroundColor: "rgba(15,23,42,0.2)", padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.1)" },
  featureItem: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 },
  featureText: { color: "#E5E7EB", fontSize: 14, flex: 1, lineHeight: 20 },
  packageCard: { backgroundColor: "rgba(15,23,42,0.34)", borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)" },
  packageCardHighlighted: { backgroundColor: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.5)" },
  packageTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "bold", marginBottom: 3 },
  packageSub: { color: "#9CA3AF", fontSize: 12 },
  packagePrice: { color: "#F9FAFB", fontSize: 18, fontWeight: "bold" },
  packageDuration: { color: "#9CA3AF", fontSize: 11, textAlign: 'right' },
  badge: { position: 'absolute', top: -10, right: 16, backgroundColor: "#6366f1", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  manageBtn: { borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  restoreBtn: { alignItems: 'center', padding: 10, marginTop: 10 },
  restoreText: { color: "#6366f1", fontWeight: "bold", fontSize: 14 },
  activeContainer: { width: '100%', marginTop: 10 },
  sheetTitle: { color: "#F9FAFB", fontSize: 20, fontWeight: "bold", textAlign: "center" },
  sheetSubtitle: { color: "#9CA3AF", fontSize: 13, textAlign: "center", marginBottom: 16, marginTop: 4 },
  historyCard: { backgroundColor: "rgba(30,41,59,0.5)", padding: 16, borderRadius: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.15)" },
  historyName: { color: "#F9FAFB", fontWeight: "bold", fontSize: 16 },
  historySub: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  historyDate: { color: "#fbbf24", fontSize: 12, fontWeight: "bold" },
  iconSelectionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30,41,59,0.5)", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "rgba(148,163,184,0.15)" },
  iconCardActive: { backgroundColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.4)" },
  iconPreviewBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  iconSelectionName: { color: "#F9FAFB", fontSize: 16, fontWeight: "bold", flex: 1 },
  resultOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.65)", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  resultCard: { backgroundColor: "rgba(30, 41, 59, 0.95)", borderColor: "rgba(255, 255, 255, 0.12)", borderWidth: 1, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 32, width: '82%', alignItems: "center" },
  resultIconWrapper: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  resultTitle: { fontSize: 22, fontWeight: "bold", color: "#F9FAFB", marginBottom: 10 },
  resultMessage: { fontSize: 15, color: "#D1D5DB", textAlign: "center", lineHeight: 22, marginBottom: 28, paddingHorizontal: 10 },
  resultOkBtn: { borderRadius: 16, paddingVertical: 14, width: '100%', alignItems: "center" },
  resultBtnText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.5 }
});