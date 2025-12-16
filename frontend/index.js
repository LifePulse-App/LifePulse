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

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);