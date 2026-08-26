import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CallContext } from '../context/CallContext';
import apiClient from '../../../auth/api-client/api_client';
import { getAvatar } from '../../../storage/AvatarManager'; // ⚡ IMPORT AVATAR MANAGER

const baseUrl = apiClient.getBaseURL();
const newUrl = baseUrl.replace(/\/api\/?$/, "");

const { width } = Dimensions.get('window');

export const CallComingScreen = () => {
  const callContext = useContext(CallContext);
  
  // ⚡ State for Cached Avatar
  const [cachedAvatarPath, setCachedAvatarPath] = useState<string | null>(null);

  // ⚡ Animations
  const buttonPulseAnim = useRef(new Animated.Value(1)).current;
  const rippleScaleAnim = useRef(new Animated.Value(1)).current;
  const rippleOpacityAnim = useRef(new Animated.Value(0.5)).current;
  const slideUpAnim = useRef(new Animated.Value(100)).current;

  // ⚡ Fetch Cached Avatar on Mount
  useEffect(() => {
    const fetchCachedAvatar = async () => {
      if (callContext?.currentSession?.remoteUser) {
        const { id, avatar } = callContext.currentSession.remoteUser;
        console.log(callContext.currentSession.remoteUser);
        
        if (avatar) {
          try {
            const localPath = await getAvatar(String(id), avatar, 1);
            if (localPath) {
              setCachedAvatarPath(localPath);
            } else {
              const fallbackUrl = avatar.startsWith('http') || avatar.startsWith('file') ? avatar : `${newUrl}${avatar}`;
              setCachedAvatarPath(fallbackUrl);
            }
          } catch (error) {
            console.log("Failed to load cached avatar", error);
          }
        }
      }
    };
    fetchCachedAvatar();
  }, [callContext?.currentSession?.remoteUser]);

  useEffect(() => {
    Animated.spring(slideUpAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(buttonPulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
      ])
    ).start();

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

  // Decide avatar source
  const displayAvatar = cachedAvatarPath || remoteUser.avatar;

  return (
    <View style={styles.container}>
      
      {/* ── TOP SECTION ── */}
      <View style={styles.topSection}>
        <Icon name="lock" size={16} color="#64748b" style={{ marginBottom: 8 }} />
        <Text style={styles.encryptedText}>End-to-End Encrypted</Text>
      </View>

      {/* ── MIDDLE SECTION ── */}
      <View style={styles.middleSection}>
        
        <View style={styles.avatarWrapper}>
          <Animated.View style={[
            styles.avatarRipple, 
            { transform: [{ scale: rippleScaleAnim }], opacity: rippleOpacityAnim }
          ]} />
          
          <View style={styles.avatarContainer}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
            ) : (
              // ⚡ FIX: Show a default person icon instead of a letter
              <Icon name="account" size={80} color="#fff" />
            )}
          </View>
        </View>

        <Text style={styles.userName} numberOfLines={2}>{remoteUser.name || 'Unknown Caller'}</Text>
        <Text style={styles.statusText}>StreakSphere Audio...</Text>
      </View>

      {/* ── BOTTOM SECTION ── */}
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
  container: { flex: 1, backgroundColor: '#020617', justifyContent: 'space-between', paddingVertical: 60 },
  topSection: { alignItems: 'center', marginTop: 20 },
  encryptedText: { color: '#64748b', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  middleSection: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  avatarWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  avatarRipple: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#A855F7' },
  avatarContainer: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 4, borderColor: '#0f172a', elevation: 10 },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { color: '#fff', fontSize: 56, fontWeight: 'bold' },
  userName: { color: '#ffffff', fontSize: 32, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20, marginBottom: 12 },
  statusText: { color: '#A855F7', fontSize: 18, fontWeight: '500', letterSpacing: 0.5 },
  bottomSection: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 20, width: width },
  actionButtonWrapper: { alignItems: 'center' },
  actionLabel: { color: '#cbd5e1', fontSize: 14, marginTop: 12, fontWeight: '600' },
  declineBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
});