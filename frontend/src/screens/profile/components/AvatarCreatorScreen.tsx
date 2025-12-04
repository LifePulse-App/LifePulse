import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import LoaderKitView from 'react-native-loader-kit';

import profileApi from '../services/api_profile';

// TODO: Replace with your actual Ready Player Me URL
const RPM_URL = 'https://your-subdomain.readyplayer.me/avatar?frameApi';

const AvatarCreatorScreen = () => {
  const navigation = useNavigation<any>();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // Ready Player Me sends various events; we care about avatar export
      // See: https://docs.readyplayer.me/ for exact event format
      if (data.eventName === 'v1.avatar.exported') {
        const avatarUrl = data.data?.url || data.data?.avatarUrl;

        if (avatarUrl) {
          // Save avatarUrl to backend
          try {
            await profileApi.updateAvatarUrl(avatarUrl, data.data || {});
          } catch {
            // handle error (toast etc.)
          } finally {
            navigation.goBack();
          }
        }
      }
    } catch (e) {
      // ignore malformed messages
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