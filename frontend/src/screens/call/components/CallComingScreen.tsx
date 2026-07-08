import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CallContext } from '../context/CallContext';
import apiClient from '../../../auth/api-client/api_client';

const baseUrl = apiClient.getBaseURL();
const newUrl = baseUrl.replace(/\/api\/?$/, "");

const { width } = Dimensions.get('window');

export const CallComingScreen = () => {
  const callContext = useContext(CallContext);
  
  // ⚡ Animations
  const buttonPulseAnim = useRef(new Animated.Value(1)).current;
  const rippleScaleAnim = useRef(new Animated.Value(1)).current;
  const rippleOpacityAnim = useRef(new Animated.Value(0.5)).current;
  const slideUpAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    // 1. Slide up the action buttons on mount
    Animated.spring(slideUpAnim, { 
      toValue: 0, 
      tension: 50, 
      friction: 8, 
      useNativeDriver: true 
    }).start();

    // 2. Accept button "breathe" animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(buttonPulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
      ])
    ).start();

    // 3. Avatar "Sonar/Ripple" animation for ringing effect
    Animated.loop(
      Animated.parallel([
        Animated.timing(rippleScaleAnim, { toValue: 1.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(rippleOpacityAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
      ])
    ).start();

  }, [buttonPulseAnim, rippleScaleAnim, rippleOpacityAnim, slideUpAnim]);

  if (!callContext || !callContext.currentSession) return null;
  const { currentSession, acceptCall, rejectCall } = callContext;
  const { remoteUser } = currentSession;

  // Resolve avatar URL if it's a relative path (optional usage of newUrl)
  const avatarSource = remoteUser.avatar?.startsWith('http') 
    ? remoteUser.avatar 
    : `${newUrl}${remoteUser.avatar}`;

  return (
    <View style={styles.container}>
      
      {/* ── TOP SECTION ── */}
      <View style={styles.topSection}>
        <Icon name="lock" size={16} color="#64748b" style={{ marginBottom: 8 }} />
        <Text style={styles.encryptedText}>End-to-End Encrypted</Text>
      </View>

      {/* ── MIDDLE SECTION (Caller Info & Avatar) ── */}
      <View style={styles.middleSection}>
        
        <View style={styles.avatarWrapper}>
          {/* Animated Sonar Ripple */}
          <Animated.View style={[
            styles.avatarRipple, 
            { 
              transform: [{ scale: rippleScaleAnim }],
              opacity: rippleOpacityAnim 
            }
          ]} />
          
          {/* Static Avatar */}
          <View style={styles.avatarContainer}>
            {remoteUser.avatar ? (
              <Image source={{ uri: avatarSource }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{remoteUser.name?.charAt(0) || '?'}</Text>
            )}
          </View>
        </View>

        <Text style={styles.userName} numberOfLines={2}>{remoteUser.name || 'Unknown Caller'}</Text>
        <Text style={styles.statusText}>StreakSphere Audio...</Text>
      </View>

      {/* ── BOTTOM SECTION (Actions) ── */}
      <Animated.View style={[styles.bottomSection, { transform: [{ translateY: slideUpAnim }] }]}>
        
        <View style={styles.actionButtonWrapper}>
          <TouchableOpacity style={styles.declineBtn} onPress={rejectCall} activeOpacity={0.7}>
            <Icon name="phone-hangup" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Decline</Text>
        </View>
        
        <View style={styles.actionButtonWrapper}>
          <Animated.View style={{ transform: [{ scale: buttonPulseAnim }] }}>
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptCall} activeOpacity={0.8}>
              <Icon name="phone" size={32} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.actionLabel}>Accept</Text>
        </View>

      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Deep dark blue/black
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  
  // Header
  topSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  encryptedText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Middle Content
  middleSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  avatarRipple: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#A855F7', // Purple tint for the ripple
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3b82f6', // Solid fallback color
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#0f172a', // Creates a slight gap effect from the ripple
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarText: {
    color: '#fff',
    fontSize: 56,
    fontWeight: 'bold',
  },
  userName: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statusText: {
    color: '#A855F7', // StreakSphere purple
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Bottom Actions
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 20,
    width: width,
  },
  actionButtonWrapper: {
    alignItems: 'center',
  },
  actionLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  declineBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
});