// routes/webhook.js
import express from 'express';
import User from '../models/UserSchema.js';

const router = express.Router();

router.post('/revenuecat', async (req, res) => {
  console.log("🔔 REVENUECAT WEBHOOK RECEIVED");

  try {
    // 1. Authenticate the request
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
      return res.status(401).send("Unauthorized Access");
    }

    // 2. Extract the event payload
    const { event } = req.body;
    const userId = event.app_user_id; 
    const eventType = event.type; 

    // 3. Gracefully ignore ALL anonymous IDs and dashboard test webhooks
    if (!userId || userId.startsWith('$RCAnonymousID') || userId === 'test_user') {
      console.log(`⚠️ Ignored Webhook: ID is anonymous or test (${userId})`);
      return res.status(200).send("Anonymous or test ID, skipping DB update.");
    }

    // 4. Locate the user in MongoDB safely using findOne
    let user;
    try {
      user = await User.findOne({ _id: userId });
    } catch (dbError) {
      console.log("❌ Invalid MongoDB ID format sent by RevenueCat:", userId);
      return res.status(200).send("Invalid ID format, ignoring."); 
    }

    if (!user) {
      console.log(`❌ User not found for valid ID: ${userId}`);
      return res.status(200).send("User not found, but webhook received.");
    }

    // 5. Update access based on the event type
    if (['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE'].includes(eventType)) {
      // Grant or Extend Premium Access
      user.isPremium = true;
      user.premiumExpirationDate = new Date(event.expiration_at_ms); 
      user.activeEntitlement = event.entitlement_ids?.[0] || 'streaksphere_plus';
      
      console.log(`✅ Granted Premium to user: ${userId}`);
    } 
    else if (eventType === 'EXPIRATION') {
      // Revoke Premium Access ONLY when the time completely runs out
      user.isPremium = false;
      user.activeEntitlement = null;
      
      console.log(`🚫 Revoked Premium from user: ${userId} (Time Expired)`);
    }
    else if (eventType === 'CANCELLATION') {
      // The user turned off auto-renew, but still has access until their expiration date.
      // We do NOT set isPremium to false here.
      console.log(`⚠️ User ${userId} canceled auto-renew. Access remains until expiration.`);
    }
    else if (eventType === 'UNCANCELLATION') {
      console.log(`🔄 User ${userId} turned auto-renew back on.`);
    }

    await user.save();
    
    // 6. Respond with 200 OK
    return res.status(200).send("Webhook Processed");

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).send("Server Error");
  }
});

export default router;