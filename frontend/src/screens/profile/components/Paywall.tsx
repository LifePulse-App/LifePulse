import React, { useState, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView 
} from 'react-native';
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Purchases from 'react-native-purchases';
import MainLayout from '../../../shared/components/MainLayout';

// ⚡ Glassy Result Card Component
const GlassyResultCard = ({ visible, type = "success", message, onClose }) => {
  if (!visible) return null;
  return (
    <View style={styles.resultOverlay}>
      <View style={styles.resultCard}>
        <Text style={[
          styles.resultMessage,
          { color: type === "error" ? "#ef4444" : "#22c55e" }
        ]}>{message}</Text>
        <TouchableOpacity style={styles.resultOkBtn} onPress={onClose}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function PaywallScreen({ navigation }) {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // ⚡ Dynamic Subscription States
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activePlanName, setActivePlanName] = useState("StreakSphere+ Premium");
  const [expiryDate, setExpiryDate] = useState("");
  const [willRenew, setWillRenew] = useState(false);

  // ⚡ State for Glassy Alerts
  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });

  // ⚡ Helper function to extract dynamic subscription details
  const updateSubscriptionState = (customerInfo) => {
    const entitlement = customerInfo.entitlements.active['streaksphere_plus'];
    
    if (entitlement) {
      setIsSubscribed(true);
      setWillRenew(entitlement.willRenew);
      
      // Format the expiry date
      if (entitlement.expirationDate) {
        const date = new Date(entitlement.expirationDate);
        setExpiryDate(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      }

      // Dynamically determine if it's Monthly or Annual based on the product ID
      const productId = (entitlement.productIdentifier || "").toLowerCase();
      if (productId.includes('annual') || productId.includes('year')) {
        setActivePlanName("StreakSphere+ (Yearly)");
      } else if (productId.includes('month')) {
        setActivePlanName("StreakSphere+ (Monthly)");
      } else {
        setActivePlanName("StreakSphere+ Premium"); // Fallback
      }
    } else {
      setIsSubscribed(false);
    }
  };

useEffect(() => {
    const fetchPaywallData = async () => {
      try {
        // ⚡ REMOVED: await Purchases.invalidateCustomerInfoCache(); 
        // Now it will use the lightning-fast local cache!
        const customerInfo = await Purchases.getCustomerInfo();
        
        updateSubscriptionState(customerInfo);

        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (error) {
        console.error("Failed to load paywall data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaywallData();
  }, []);

  const handlePurchase = async (pkg) => {
    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (typeof customerInfo.entitlements.active['streaksphere_plus'] !== "undefined") {
        updateSubscriptionState(customerInfo);
      }
    } catch (error) {
      if (!error.userCancelled) {
        setResultCard({ visible: true, type: "error", message: error.message || "Purchase failed." });
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active['streaksphere_plus'] !== "undefined") {
        updateSubscriptionState(customerInfo);
        setResultCard({ visible: true, type: "success", message: "Your purchases have been restored!" });
      } else {
        setResultCard({ visible: true, type: "error", message: "No active subscription found to restore." });
      }
    } catch (error) {
      setResultCard({ visible: true, type: "error", message: error.message || "Restore failed." });
    } finally {
      setIsPurchasing(false);
    }
  };

  // ⚡ Open native Google Play / App Store subscription manager
  const handleManageSubscription = async () => {
    try {
      await Purchases.showManageSubscriptions();
    } catch (error) {
      setResultCard({ visible: true, type: "error", message: "Could not open subscription management. Please check your device settings." });
    }
  };

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
              <Text style={styles.headerSub}>
                All premium relationship features, themes, and leaderboard multipliers are active.
              </Text>
            </View>

            {/* ⚡ DYNAMIC: Active Plan */}
            <View style={styles.settingCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="check-decagram" size={24} color="#22c55e" />
                <Text style={styles.settingLabel}>Active Plan: {activePlanName}</Text>
              </View>
            </View>

            {/* ⚡ DYNAMIC: Expiry Date */}
            {expiryDate ? (
              <View style={styles.settingCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="calendar-clock" size={24} color="#a855f7" />
                  <Text style={styles.settingLabel}>
                    {willRenew ? "Renews On: " : "Expires On: "} {expiryDate}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* ⚡ DYNAMIC: Auto-Renew Status */}
            <View style={styles.settingCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name={willRenew ? "shield-check" : "shield-off"} size={24} color={willRenew ? "#3b82f6" : "#ef4444"} />
                <Text style={styles.settingLabel}>
                  Auto-Renewal: {willRenew ? "Enabled" : "Canceled"}
                </Text>
              </View>
            </View>

            {/* ⚡ NEW: Manage Subscription Button */}
            <TouchableOpacity 
              style={[styles.manageBtn, { backgroundColor: "rgba(99,102,241,0.2)", borderWidth: 1, borderColor: "#6366f1" }]} 
              onPress={handleManageSubscription}
            >
              <Text style={{ color: "#818cf8", fontWeight: "bold" }}>Manage Subscription</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.logoutBtn, { backgroundColor: "rgba(239, 68, 68, 0.15)", borderWidth: 1, borderColor: "#ef4444" }]} 
              onPress={() => navigation.goBack()}
            >
              <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            
            <View style={{ gap: 12, marginBottom: 24 }}>
              {packages.map((pkg) => {
                const isAnnual = pkg.packageType === 'ANNUAL';

                return (
                  <TouchableOpacity 
                    key={pkg.identifier} 
                    style={[styles.packageCard, isAnnual && styles.packageCardHighlighted]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isPurchasing}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                      <Text style={styles.packageSub}>{pkg.product.description || "Full access to all Plus features"}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                      <Text style={styles.packageDuration}>{isAnnual ? '/ year' : '/ month'}</Text>
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
                <Text style={styles.featureText}>View complete relationship history of yours</Text>
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

            <TouchableOpacity 
              style={styles.restoreBtn} 
              onPress={handleRestorePurchases}
              disabled={isPurchasing}
            >
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ⚡ ADDED: Glassy Result Card Overlay */}
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
  iconGlass: {
    width: 40, height: 40, borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.0)",
    borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10, elevation: 4, marginLeft: 0, marginTop: 5,
  },
  pageTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  rightSpacer: { width: 40, height: 40 },

  overlay: { flex: 1, paddingTop: 20, paddingHorizontal: 18 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  mainCard: { 
    backgroundColor: "rgba(15,23,42,0.4)", 
    borderRadius: 22, 
    padding: 20, 
    marginBottom: 20, 
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)"
  },
  badgeWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(251,191,36,0.12)",
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(251,191,36,0.3)"
  },
  headerTitle: { color: "#F9FAFB", fontWeight: "bold", fontSize: 20, textAlign: "center", marginBottom: 6 },
  headerSub: { color: "#9CA3AF", fontSize: 13, textAlign: "center", lineHeight: 18 },

  featuresListContainer: {
    marginBottom: 10,
    backgroundColor: "rgba(15,23,42,0.2)",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: "#F9FAFB", marginBottom: 12 },
  featureItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 14,
    gap: 12 
  },
  featureText: { 
    color: "#E5E7EB", 
    fontSize: 14, 
    flex: 1, 
    lineHeight: 20 
  },

  packageCard: {
    backgroundColor: "rgba(15,23,42,0.34)",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  packageCardHighlighted: {
    backgroundColor: "rgba(99,102,241,0.15)",
    borderColor: "rgba(99,102,241,0.5)",
  },
  packageTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "bold", marginBottom: 3 },
  packageSub: { color: "#9CA3AF", fontSize: 12 },
  packagePrice: { color: "#F9FAFB", fontSize: 18, fontWeight: "bold" },
  packageDuration: { color: "#9CA3AF", fontSize: 11, textAlign: 'right' },

  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: "#6366f1",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  settingCard: { 
    backgroundColor: "rgba(15,23,42,0.34)", 
    borderRadius: 14, 
    padding: 16, 
    marginBottom: 10, 
    flexDirection: "row", 
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)"
  },
  settingLabel: { color: "#F9FAFB", fontWeight: "bold", fontSize: 15, marginLeft: 13 },

  manageBtn: { borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginTop: 5, marginBottom: 10 },
  logoutBtn: { borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  restoreBtn: { alignItems: 'center', padding: 10, marginTop: 10 },
  restoreText: { color: "#6366f1", fontWeight: "bold", fontSize: 14 },
  activeContainer: { width: '100%', marginTop: 10 },

  // ⚡ Glassy Alert Styles
  resultOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(30,41,59,0.45)", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  resultCard: { backgroundColor: "rgba(15,23,42,0.94)", borderColor: "#fff", borderWidth: 1, borderRadius: 24, padding: 26, width: 270, alignItems: "center" },
  resultMessage: { fontSize: 17, fontWeight: "bold", textAlign: "center", marginBottom: 18, marginTop: 2 },
  resultOkBtn: { backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 34, marginTop: 2 }
});