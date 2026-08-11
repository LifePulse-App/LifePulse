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

    // ⚡ FIX: Gracefully ignore ALL anonymous IDs and dashboard test webhooks
    // If RevenueCat sends an anonymous ID, the frontend will eventually merge it 
    // when Purchases.logIn() is called, triggering a new valid webhook later.
    if (!userId || userId.startsWith('$RCAnonymousID') || userId === 'test_user') {
      console.log(`⚠️ Ignored Webhook: ID is anonymous or test (${userId})`);
      return res.status(200).send("Anonymous or test ID, skipping DB update.");
    }

    // 3. Locate the user in MongoDB safely using findOne
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

    // 4. Update access based on the event type
    if (['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION'].includes(eventType)) {
      // Grant Premium Access
      user.isPremium = true;
      user.premiumExpirationDate = new Date(event.expiration_at_ms); 
      user.activeEntitlement = event.entitlement_ids[0]; 
      
      console.log(`✅ Granted Premium to user: ${userId}`);
    } 
    else if (eventType === 'EXPIRATION' || eventType === 'CANCELLATION') {
      // Revoke Premium Access
      user.isPremium = false;
      user.activeEntitlement = null;
      
      console.log(`🚫 Revoked Premium from user: ${userId}`);
    }

    await user.save();
    
    // 5. Respond with 200 OK
    return res.status(200).send("Webhook Processed");

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).send("Server Error");
  }
});

export default router;