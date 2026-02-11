// --- TOP OF FILE, BEFORE ANYTHING ELSE ---
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { Crypto } from '@peculiar/webcrypto';

if (!global.Buffer) global.Buffer = Buffer;
if (!global.crypto) global.crypto = new Crypto();
else if (!global.crypto.subtle) global.crypto.subtle = new Crypto().subtle;

// If your RN runtime lacks TextEncoder/TextDecoder, uncomment:
// global.TextEncoder = require('text-encoding').TextEncoder;
// global.TextDecoder = require('text-encoding').TextDecoder;

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { name as appName } from './app.json';
import App from './App';

import { showIncomingMessageNotification } from './src/screens/notifications/components/notify';

// Background / killed: data-only pushes come here
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const username = remoteMessage?.data?.username;
  await showIncomingMessageNotification(username);
});

AppRegistry.registerComponent(appName, () => App);