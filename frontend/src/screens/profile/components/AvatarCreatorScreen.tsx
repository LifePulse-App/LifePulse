import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import LoaderKitView from 'react-native-loader-kit';

import profileApi from '../services/api_profile';

const RPM_URL = 'https://streaksphere.readyplayer.me/avatar?frameApi';

const AvatarCreatorScreen = () => {
  const navigation = useNavigation<any>();
  const webViewRef = useRef<WebView | null>(null);
  const [loading, setLoading] = useState(true);

  const handleMessage = async (event: WebViewMessageEvent) => {
    const raw = event.nativeEvent.data;
    let parsed: any = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    // CASE 1: plain URL string (or quoted URL)
    if (typeof parsed === 'string' || (typeof raw === 'string' && raw.startsWith('http'))) {
      const url = typeof parsed === 'string' ? parsed : raw;
      const cleanedUrl = url.replace(/^"|"$/g, '');

      try {
        await profileApi.updateAvatarUrl(cleanedUrl);
      } catch {
        // handle error (toast, etc.)
      } finally {
        navigation.goBack();
      }
      return;
    }

    // CASE 2: structured event
    const data = parsed;
    if (!data || typeof data !== 'object') return;

    if (data.source && data.source !== 'readyplayerme') return;

    switch (data.eventName) {
      case 'v1.frame.ready':
        // Frame ready – could send queries if needed
        break;

      case 'v1.avatar.exported': {
        const avatarUrl = data.data?.url;
        if (!avatarUrl) return;

        try {
          await profileApi.updateAvatarUrl(avatarUrl, data.data || {});
        } catch {
          // handle error
        } finally {
          navigation.goBack();
        }
        break;
      }

      default:
        break;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Create 3D Avatar</Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );

  return (
    <View style={styles.root}>
      {renderHeader()}

      <View style={styles.webviewWrapper}>
        {loading && (
          <View style={styles.loaderOverlay}>
            <LoaderKitView
              style={{ width: 32, height: 32 }}
              name="BallSpinFadeLoader"
              animationSpeedMultiplier={1.0}
              color="#6366F1"
            />
            <Text style={{ marginTop: 6, color: '#111827', fontSize: 12 }}>
              Loading avatar creator...
            </Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: RPM_URL }}
          style={styles.webview}
          onMessage={handleMessage}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 48,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  webviewWrapper: {
    flex: 1,
    marginTop: 4,
  },
  webview: {
    flex: 1,
  },
  loaderOverlay: {
    position: 'absolute',
    zIndex: 10,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AvatarCreatorScreen;