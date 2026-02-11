import { apps, initializeApp, credential as _credential, messaging } from 'firebase-admin';
import serviceAccount from '../crucial-mender-474816-u9-firebase-adminsdk-fbsvc-a2b2bfad7f.json';

if (!apps.length) {
  initializeApp({
    credential: _credential.cert(serviceAccount),
  });
}

async function sendNewMessagePush(token, username) {
  return messaging().send({
    token,
    data: { username: String(username || 'Someone') },
    android: { priority: 'high' },
  });
}

export default { sendNewMessagePush };