// routes/webhook.js
import express from 'express';
import User from '../models/UserSchema.js';

const router = express.Router();

router.post('/revenuecat', async (req, res) => {
  console.log("🔔 REVENUECAT WEBHOOK RECEIVED");

  try {
    // 1. Authenticate the request
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    
    if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
      return res.status(401).send("Unauthorized Access");
    }

    // 2. Extract the event payload
    const { event } = req.body;
    console.log(event);
    
    const userId = event.app_user_id; 
    const eventType = event.type; 

    // Handle RevenueCat Dashboard "Test Webhook" fake IDs gracefully
    if (userId === '$RCAnonymousID:test_user' || userId === 'test_user') {
      return res.status(200).send("Test webhook received.");
    }

    // 3. Locate the user in MongoDB safely using findOne to prevent CastErrors
    let user;
    try {
      user = await User.findOne({ _id: userId });
    } catch (dbError) {
      console.log("❌ Invalid MongoDB ID format sent by RevenueCat:", userId);
      return res.status(200).send("Invalid ID format, ignoring."); 
    }

    if (!user) {
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