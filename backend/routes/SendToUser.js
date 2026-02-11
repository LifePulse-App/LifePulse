import { find } from '../models/PushToken';
import { sendNewMessagePush } from './fcm';

async function notifyUserNewMessage(receiverUserId, senderUsername) {
  const tokens = await find({ userId: receiverUserId, platform: 'android' }).lean();

  const results = [];
  for (const t of tokens) {
    try {
      const id = await sendNewMessagePush(t.token, senderUsername);
      results.push({ token: t.token, ok: true, messageId: id });
    } catch (e) {
      results.push({ token: t.token, ok: false, error: String(e?.message || e) });
    }
  }
  return results;
}

export default { notifyUserNewMessage };