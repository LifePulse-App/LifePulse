import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, DeviceEventEmitter, Pressable, Image } from 'react-native';
import InCallManager from 'react-native-incall-manager';
import { MediaStream } from 'react-native-webrtc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallSession, CallUser } from '../types/Call';
import { webRTCService } from '../services/WebRTCService';
import { PermissionService } from '../services/PermissionService';
import { getSocket, setSocketInCallStatus } from '../../../auth/api-client/socket';

import { IncomingCallScreen } from '../components/IncomingCallScreen';
import { VoiceCallScreen } from '../components/VoiceCallScreen';
import { OutgoingCallScreen } from '../components/OutgoingCallScreen';
import { CallContext } from './CallContext';
import Sound from 'react-native-sound';
import apiClient from '../../../auth/api-client/api_client';
import notifee from '@notifee/react-native';
import { notificationNavState } from '../../../../index';

  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

Sound.setCategory('PlayAndRecord', true);

const playEndTone = () => {
  const tone = new Sound('endcalltone.mp3', Sound.MAIN_BUNDLE, error => {
    if (!error) {
      tone.play(() => {
        tone.release();
      });
    }
  });
};

const playOutgoingTone = () => {
    const tone = new Sound(
        'outgoingtone.mp3',
        Sound.MAIN_BUNDLE,
        error => {
            if (!error) {
                tone.setNumberOfLoops(-1); // loop
                tone.play();
            }
        }
    );

    return tone;
};

// ⚡ CUSTOM INCOMING RINGTONE SOUND
const playIncomingTone = () => {
  const tone = new Sound('ringtone.mp3', Sound.MAIN_BUNDLE, error => {
    if (!error) {
      tone.setNumberOfLoops(-1); // loop infinitely until stopped
      tone.play();
    }
  });
  return tone;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<CallSession | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // ⚡ REFS FOR TONES
  const outgoingToneRef = useRef<Sound | null>(null);
  const incomingToneRef = useRef<Sound | null>(null);

  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer: any;
    if (currentSession?.status === 'connected') {
      timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      setCallDuration(0); // Reset when call ends
    }
    return () => clearInterval(timer);
  }, [currentSession?.status]);

  // ⚡ AUDIO ROUTING STATES
  const [audioRoute, setAudioRoute] = useState<string>('EARPIECE');
  const [availableRoutes, setAvailableRoutes] = useState<string[]>(['EARPIECE', 'SPEAKER_PHONE']);
  const [routeMenuVisible, setRouteMenuVisible] = useState(false);

  const activeCallIdRef = useRef<string | null>(null);
  const hasHandledOfferRef = useRef(false);

  // ⚡ HELPER TO PROPERLY STOP BOTH TONES
  const stopAllTones = () => {
    if (outgoingToneRef.current) {
      outgoingToneRef.current.stop(() => {
        outgoingToneRef.current?.release();
        outgoingToneRef.current = null;
      });
    }
    if (incomingToneRef.current) {
      incomingToneRef.current.stop(() => {
        incomingToneRef.current?.release();
        incomingToneRef.current = null;
      });
    }
  };

  useEffect(() => {
    // ⚡ LISTEN FOR HARDWARE CHANGES (Bluetooth/Headphones plugged in)
    const subscription = DeviceEventEmitter.addListener('onAudioDeviceChanged', (data) => {
      let routes: string[] = [];
      if (typeof data.availableAudioDeviceList === 'string') {
        routes = data.availableAudioDeviceList.split(',');
      } else if (Array.isArray(data.availableAudioDeviceList)) {
        routes = data.availableAudioDeviceList;
      }
      
      // Ensure Earpiece and Speaker are always options
      if (!routes.includes('EARPIECE')) routes.push('EARPIECE');
      if (!routes.includes('SPEAKER_PHONE')) routes.push('SPEAKER_PHONE');
      
      setAvailableRoutes(routes);

      // Auto-route to Bluetooth or Wired if they just connected
      if (routes.includes('BLUETOOTH') && audioRoute !== 'BLUETOOTH') {
        setAudioRoute('BLUETOOTH');
        InCallManager.chooseAudioRoute('BLUETOOTH');
      } else if (routes.includes('WIRED_HEADSET') && audioRoute !== 'WIRED_HEADSET') {
        setAudioRoute('WIRED_HEADSET');
        InCallManager.chooseAudioRoute('WIRED_HEADSET');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [audioRoute]);

  useEffect(() => {
    let socketInterval: ReturnType<typeof setInterval>;

    webRTCService.init(
      (candidate) => {
        if (activeCallIdRef.current) {
          getSocket()?.emit("webrtc:ice-candidate", { callId: activeCallIdRef.current, candidate });
        }
      },
      (stream) => setRemoteStream(stream)
    );

    const attachListeners = (activeSocket: any) => {

      const handleNoAnswer = (payload: any) => {
        setCurrentSession((prev) => prev ? { ...prev, status: 'no-answer' } : null);
        
        stopAllTones();
        playEndTone();
        setTimeout(() => {
          cleanupCallSession();
        }, 5000);
      }; 

      const handleIncomingCall = (payload: any) => {
        activeCallIdRef.current = payload.callId;
        hasHandledOfferRef.current = false;
        
        // ⚡ FIX: Make sure the avatar string is perfectly formatted before setting state
        const rawAvatar = payload.caller?.avatarUrl || payload.caller?.avatar || "";
        const formattedAvatar = rawAvatar 
          ? (rawAvatar.startsWith('http') ? rawAvatar : `${apiClient.getBaseURL().replace(/\/api\/?$/, "")}${rawAvatar}`) 
          : "";

        setCurrentSession({
          sessionId: payload.callId,
          remoteUser: { 
            id: payload.callerId, 
            name: payload.caller?.name || 'User', 
            avatar: formattedAvatar // 👈 USE THE FORMATTED URL HERE
          },
          status: 'ringing',
          isIncoming: true,
        });
        
        stopAllTones();
        incomingToneRef.current = playIncomingTone();
        
        activeSocket.emit("call:ringing", { callId: payload.callId });
      };

      const handleCallRinging = (payload: any) => {
        setCurrentSession((prev) => 
          prev && prev.sessionId === payload.callId ? { ...prev, status: 'ringing' } : prev
        );
      };

      const handleCallAccepted = async (payload: any) => {
        InCallManager.stopRingback();
        InCallManager.stopRingtone();
        
        stopAllTones();
        
        InCallManager.start({ media: 'audio', auto: true, ringback: '' });
        
        // Auto-select route based on connected hardware
        let initialRoute = 'EARPIECE';
        if (availableRoutes.includes('BLUETOOTH')) initialRoute = 'BLUETOOTH';
        else if (availableRoutes.includes('WIRED_HEADSET')) initialRoute = 'WIRED_HEADSET';
        
        InCallManager.chooseAudioRoute(initialRoute);
        setAudioRoute(initialRoute);
        
        setSocketInCallStatus(true);
        setCurrentSession((prev) => prev ? { ...prev, status: 'connected' } : null);

        await webRTCService.setupConnection();

        if (payload.receiverId) {
          const offer = await webRTCService.createOffer();
          activeSocket.emit("webrtc:offer", { callId: payload.callId, offer });
        }
      };

      const handleWebRtcOffer = async (payload: any) => {
        if (hasHandledOfferRef.current) return; 
        hasHandledOfferRef.current = true; 
        const answer = await webRTCService.handleOffer(payload.offer);
        activeSocket.emit("webrtc:answer", { callId: payload.callId, answer });
      };

      const handleWebRtcAnswer = async (payload: any) => await webRTCService.handleAnswer(payload.answer);
      const handleIceCandidate = async (payload: any) => await webRTCService.addIceCandidate(payload.candidate);
      const handleCallEnd = () => cleanupCallSession();

      activeSocket.on("call:incoming", handleIncomingCall);
      activeSocket.on("call:ringing", handleCallRinging);
      activeSocket.on("call:accepted", handleCallAccepted);
      activeSocket.on("webrtc:offer", handleWebRtcOffer);
      activeSocket.on("webrtc:answer", handleWebRtcAnswer);
      activeSocket.on("webrtc:ice-candidate", handleIceCandidate);
      activeSocket.on("call:rejected", handleCallEnd);
      activeSocket.on("call:ended", handleCallEnd);
      activeSocket.on("call:cancelled", handleCallEnd);
      activeSocket.on("call:answered-elsewhere", handleCallEnd);
      activeSocket.on("call:missed", handleCallEnd);
      activeSocket.on("call:no-answer", handleNoAnswer);

      return () => {
        activeSocket.off("call:incoming", handleIncomingCall);
        activeSocket.off("call:ringing", handleCallRinging);
        activeSocket.off("call:accepted", handleCallAccepted);
        activeSocket.off("webrtc:offer", handleWebRtcOffer);
        activeSocket.off("webrtc:answer", handleWebRtcAnswer);
        activeSocket.off("webrtc:ice-candidate", handleIceCandidate);
        activeSocket.off("call:rejected", handleCallEnd);
        activeSocket.off("call:ended", handleCallEnd);
        activeSocket.off("call:cancelled", handleCallEnd);
        activeSocket.off("call:answered-elsewhere", handleCallEnd);
        activeSocket.off("call:missed", handleCallEnd);
        activeSocket.off("call:no-answer", handleNoAnswer);
      };
    };

    let cleanupListeners: (() => void) | undefined;
    let isAttached = false;

    const checkSocket = () => {
      const activeSocket = getSocket();
      if (activeSocket && activeSocket.connected && !isAttached) {
        isAttached = true;
        clearInterval(socketInterval);
        cleanupListeners = attachListeners(activeSocket);
      }
    };

    checkSocket();
    socketInterval = setInterval(checkSocket, 500);

    return () => {
      clearInterval(socketInterval);
      if (cleanupListeners) cleanupListeners();
    };
  }, []);

  // ⚡ FIX: The Call Interceptor (Handles Lock Screen & Banner Taps)
  useEffect(() => {
    
    const checkPendingCalls = async () => {
      // 1. Did the phone wake up from a locked screen?
      const initial = await notifee.getInitialNotification();
      const initialData = initial?.notification?.data;

      // 2. Did the user tap "Answer" while the app was backgrounded?
      const pendingData = notificationNavState.pending;

      const callData = initialData?.type === 'incoming_call' ? initialData : 
                       (pendingData?.type === 'incoming_call' ? pendingData : null);

      if (callData) {
        console.log('[CallProvider] Intercepted pending call:', callData);
        
        activeCallIdRef.current = callData.callId;
        
        // Clear the pending state so it doesn't fire twice
        notificationNavState.pending = null;

        // Mount the UI immediately!
        setCurrentSession({
          sessionId: callData.callId,
          remoteUser: { 
            id: callData.callerId, 
            name: callData.callerName || 'User', 
            avatar: '' 
          },
          status: 'ringing',
          isIncoming: true,
        });

        // Start playing the ringing sound
        stopAllTones();
        incomingToneRef.current = playIncomingTone();

        // If they explicitly tapped "Answer" on the banner, auto-accept!
        if (callData.autoAccept) {
          console.log('[CallProvider] Auto-accepting call from banner tap');
          // Wait 1.5 seconds for socket to finish connecting, then accept
          setTimeout(() => {
            const socket = getSocket();
            if (socket && socket.connected) {
              socket.emit("call:accept", { callId: callData.callId });
            } else {
               // Fallback: Try one more time if socket is slow
               setTimeout(() => getSocket()?.emit("call:accept", { callId: callData.callId }), 1000);
            }
          }, 1500);
        }
      }
    };

    // Run the check when the provider mounts
    checkPendingCalls();

    // ⚡ FIX: Gracefully handle offline remote terminations via FCM Push
    const terminateListener = DeviceEventEmitter.addListener('TERMINATE_CALL', (data) => {
        if (activeCallIdRef.current === data.callId) {
            console.log("Call terminated via Push Notification Event:", data.type);
            
            // If they explicitly rejected, show the UI before cleaning up
            if (data.type === 'call_rejected') {
                setCurrentSession(prev => prev ? { ...prev, status: 'rejected' } : null);
                
                stopAllTones();
                
                playEndTone(); // Play the hangup beep
                
                // Wait 2.5 seconds so the caller sees "Call Declined"
                setTimeout(() => {
                    cleanupCallSession();
                }, 2500);
            } else {
                // If it was just a normal hangup or miss, clean up instantly
                cleanupCallSession();
            }
        }
    });

    return () => {
        terminateListener.remove();
    };

  }, []); // Run once on mount

 const startCall = async (targetUser: CallUser, conversationId: string) => {
    const hasPermission = await PermissionService.checkAndRequestAudioPermission();
    if (!hasPermission) return;

    stopAllTones();
    outgoingToneRef.current = playOutgoingTone();
    setIsMinimized(false);

    InCallManager.start({ media: 'audio', auto: true, ringback: '' });
    InCallManager.chooseAudioRoute('EARPIECE');
    setAudioRoute('EARPIECE');

    // Starts in "initiating" (Calling...)
    setCurrentSession({ sessionId: "pending", remoteUser: targetUser, status: 'initiating', isIncoming: false });

    getSocket()?.emit("call:start", { receiverId: targetUser.id, type: "audio", conversationId }, (response: any) => {
      if (response.success) {
        activeCallIdRef.current = response.callId;
        // ⚡ FIX: Apply the 'ringing' status immediately from the backend response
        setCurrentSession((prev) => prev ? { 
            ...prev, 
            sessionId: response.callId,
            status: response.status || 'ringing' 
        } : null);
      } else if (response.message === "User busy") {
        // ⚡ HANDLE BUSY STATE
        setCurrentSession((prev) => prev ? { ...prev, status: 'busy' } : null);

        stopAllTones();
        playEndTone();
       
        // Wait 2.5 seconds so the user can read "User Busy", then hang up automatically
        setTimeout(() => {
          cleanupCallSession();
        }, 5000);
      } else {
        cleanupCallSession();
      }
    });
  };

  const acceptCall = async () => {
    if (!currentSession || !activeCallIdRef.current) return;
    const hasPermission = await PermissionService.checkAndRequestAudioPermission();
    if (!hasPermission) return; 
    getSocket()?.emit("call:accept", { callId: activeCallIdRef.current });
  };

  const rejectCall = () => {
    if (activeCallIdRef.current) getSocket()?.emit("call:reject", { callId: activeCallIdRef.current });
    cleanupCallSession();
  };

  const endCall = () => {
    if (activeCallIdRef.current) {
      if (currentSession?.status === "ringing" && !currentSession.isIncoming) {
        getSocket()?.emit("call:cancel", { callId: activeCallIdRef.current });
      } else {
        getSocket()?.emit("call:end", { callId: activeCallIdRef.current });
      }
    }
    cleanupCallSession();
  };

  const toggleMute = () => {
    if (webRTCService.localStream) {
      const audioTrack = webRTCService.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // ⚡ DYNAMIC AUDIO ROUTE SWITCHER
  const selectAudioRoute = (route: string) => {
    setAudioRoute(route);
    InCallManager.chooseAudioRoute(route);
    InCallManager.setForceSpeakerphoneOn(route === 'SPEAKER_PHONE');
    setRouteMenuVisible(false);
  };

  const handleSpeakerPress = () => {
    // If multiple options exist, open the menu. If only speaker/earpiece, toggle directly.
    if (availableRoutes.length > 2) {
      setRouteMenuVisible(true);
    } else {
      selectAudioRoute(audioRoute === 'SPEAKER_PHONE' ? 'EARPIECE' : 'SPEAKER_PHONE');
    }
  };

const toggleMinimize = () => {
    if (currentSession && !currentSession.isIncoming) {
      setIsMinimized(!isMinimized);
    } else if (currentSession?.status === 'connected') {
      setIsMinimized(!isMinimized);
    }
  };
  
  const cleanupCallSession = () => {
    InCallManager.stop();
    InCallManager.stopRingtone();
    InCallManager.stopRingback();
    webRTCService.cleanup();
    activeCallIdRef.current = null;
    
    stopAllTones();
    
    setCurrentSession(null);
    setRemoteStream(null);
    setIsMuted(false);
    setAudioRoute('EARPIECE');
    setIsMinimized(false);
    setSocketInCallStatus(false); 
  };

return (
    <CallContext.Provider value={{
      currentSession,
      remoteStream,
      isMuted,
      audioRoute,
      availableRoutes,
      isMinimized,
      callDuration,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      handleSpeakerPress,
      toggleMinimize
    }}>
      <View style={styles.masterWrapper}>
        
        {/* 📱 FIX: Show banner anytime it is minimized, not just when connected */}
        {currentSession && isMinimized && (
          <MinimizedCallBanner />
        )}

        {/* APP VIEWPORT */}
        <View style={styles.appContainer}>
          {children}

          {/* 📱 FULL SCREEN OVERLAYS */}
          {currentSession && !isMinimized && (
            <View 
              style={[StyleSheet.absoluteFill, { zIndex: 99999 }]} 
              pointerEvents={(currentSession.status === 'ringing' && currentSession.isIncoming) ? 'box-none' : 'auto'}
            >
            {/* ⚡ FIX: Render Outgoing Screen for ALL states until it connects or cleans up */}
              {(!currentSession.isIncoming && currentSession.status !== 'connected') && (
                <OutgoingCallScreen />
              )}

              {currentSession.status === 'ringing' && currentSession.isIncoming && (
                <IncomingCallScreen />
              )}

              {currentSession.status === 'connected' && (
                <VoiceCallScreen />
              )}
            </View>
          )}
        </View>

        {/* ⚡ AUDIO ROUTING MODAL */}
        <Modal visible={routeMenuVisible} transparent animationType="fade" onRequestClose={() => setRouteMenuVisible(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRouteMenuVisible(false)}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Audio Route</Text>
              
              {availableRoutes.includes('BLUETOOTH') && (
                <TouchableOpacity style={styles.routeItem} onPress={() => selectAudioRoute('BLUETOOTH')}>
                  <Icon name="bluetooth" size={24} color={audioRoute === 'BLUETOOTH' ? "#6366f1" : "#fff"} />
                  <Text style={[styles.routeText, audioRoute === 'BLUETOOTH' && styles.routeTextActive]}>Bluetooth Device</Text>
                </TouchableOpacity>
              )}

              {availableRoutes.includes('WIRED_HEADSET') && (
                <TouchableOpacity style={styles.routeItem} onPress={() => selectAudioRoute('WIRED_HEADSET')}>
                  <Icon name="headphones" size={24} color={audioRoute === 'WIRED_HEADSET' ? "#6366f1" : "#fff"} />
                  <Text style={[styles.routeText, audioRoute === 'WIRED_HEADSET' && styles.routeTextActive]}>Wired Headset</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.routeItem} onPress={() => selectAudioRoute('SPEAKER_PHONE')}>
                <Icon name="volume-high" size={24} color={audioRoute === 'SPEAKER_PHONE' ? "#6366f1" : "#fff"} />
                <Text style={[styles.routeText, audioRoute === 'SPEAKER_PHONE' && styles.routeTextActive]}>Speaker</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.routeItem} onPress={() => selectAudioRoute('EARPIECE')}>
                <Icon name="phone-in-talk" size={24} color={audioRoute === 'EARPIECE' ? "#6366f1" : "#fff"} />
                <Text style={[styles.routeText, audioRoute === 'EARPIECE' && styles.routeTextActive]}>Phone (Earpiece)</Text>
              </TouchableOpacity>

            </View>
          </Pressable>
        </Modal>

      </View>
    </CallContext.Provider>
  );
};

// ==========================================
// MINIMIZED TOP BLOCK COMPONENT
// ==========================================
const MinimizedCallBanner = () => {
  const callContext = useContext(CallContext);
  const insets = useSafeAreaInsets(); 



  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!callContext?.currentSession) return null;
  const { currentSession, isMuted, toggleMute, endCall, toggleMinimize, audioRoute, callDuration, availableRoutes, handleSpeakerPress } = callContext;

  let routeIcon = "phone-in-talk";
  if (audioRoute === 'BLUETOOTH') routeIcon = "bluetooth-audio";
  else if (audioRoute === 'WIRED_HEADSET') routeIcon = "headphones";
  else if (audioRoute === 'SPEAKER_PHONE') routeIcon = "volume-high";

  let statusText = "Active Call";
  let statusColor = "#22c55e"; 
  
  if (currentSession.status === 'initiating') {
    statusText = "Calling...";
    statusColor = "#94a3b8"; 
  } else if (currentSession.status === 'ringing' && !currentSession.isIncoming) {
    statusText = "Ringing...";
    statusColor = "#22c55e"; 
  } else if (currentSession.status === 'busy') {
    statusText = "User Busy...";
    statusColor = "#ef4444"; 
  } else if (currentSession.status === 'no-answer') {
    statusText = "No Response";
    statusColor = "#ef4444"; 
  } else if (currentSession.status === 'connected') {
    statusText = `${formatTime(callDuration)} • Active Call`;
  }

  

  const safeTopPadding = Math.max(insets.top, 20) + 12;

  return (
    <TouchableOpacity 
      style={[bannerStyles.minimizedContainer, { paddingTop: safeTopPadding }]} 
      activeOpacity={0.9} 
      onPress={toggleMinimize}
    >
      <View style={bannerStyles.leftSection}>
        
        {/* ⚡ THE AVATAR IMAGE FIX */}
    {/* ⚡ THE AVATAR IMAGE FIX */}
        <View style={[bannerStyles.minimizedAvatar, currentSession.remoteUser.avatar ? { backgroundColor: 'transparent' } : null]}>
          {currentSession.remoteUser.avatar ? (
            <Image 
              source={{ uri: currentSession.remoteUser.avatar }} 
              style={bannerStyles.minimizedAvatarImage} 
            />
          ) : (
            <Text style={bannerStyles.minimizedAvatarText}>
              {currentSession.remoteUser.name.charAt(0)}
            </Text>
          )}
        </View>

        <View style={bannerStyles.minimizedInfo}>
          <Text style={bannerStyles.minimizedName} numberOfLines={1}>
            {currentSession.remoteUser.name}
          </Text>
          <Text style={[bannerStyles.minimizedTime, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

      <View style={bannerStyles.rightControls}>
        <TouchableOpacity 
          style={[bannerStyles.actionIconBtn, audioRoute !== 'EARPIECE' && bannerStyles.btnActive]} 
          onPress={handleSpeakerPress}
        >
          <Icon name={routeIcon} size={20} color="#fff" />
          {availableRoutes.length > 2 && (
            <Icon name="chevron-down" size={12} color="#fff" style={bannerStyles.dropdownArrow} />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[bannerStyles.actionIconBtn, isMuted && bannerStyles.btnMutedActive]} 
          onPress={toggleMute}
        >
          <Icon name={isMuted ? "microphone-off" : "microphone"} size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={bannerStyles.minimizedEndBtn} onPress={endCall}>
          <Icon name="phone-hangup" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  masterWrapper: { flex: 1, backgroundColor: '#020617' },
  appContainer: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  routeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  routeText: { color: '#fff', fontSize: 18, marginLeft: 16, fontWeight: '500' },
  routeTextActive: { color: '#6366f1' },
});

const bannerStyles = StyleSheet.create({
  minimizedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingBottom: 16, // Added more padding at the bottom for height
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,102,241,0.25)',
  },
// ⚡ FIX: Added overflow: 'hidden' to the parent container
  minimizedAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  
  // ⚡ FIX: Forced the image to stretch and cover the container perfectly
  minimizedAvatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  dropdownArrow: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6 },
  leftSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  minimizedAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  minimizedInfo: { flex: 1, marginRight: 8 },
  minimizedName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  minimizedTime: { color: '#22c55e', fontSize: 13, marginTop: 2 },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  btnActive: { backgroundColor: '#4f46e5' },
  btnMutedActive: { backgroundColor: '#eab308' },
  minimizedEndBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
});