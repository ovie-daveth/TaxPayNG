const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.validateSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to check subscription status'
    );
  }

  const userId = data.userId || context.auth.uid;
  
  if (userId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Users can only check their own subscription status'
    );
  }

  try {
    const userProfileDoc = await admin.firestore()
      .collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (userProfileDoc.empty) {
      return {
        hasAccess: false,
        reason: 'user_profile_not_found'
      };
    }

    const profile = userProfileDoc.docs[0].data();
    const now = admin.firestore.Timestamp.now();
    const nowDate = now.toDate();

    if (profile.isSubscribe === true && profile.subscriptionExpiryDate) {
      const subscriptionExpiry = profile.subscriptionExpiryDate.toDate();
      
      if (subscriptionExpiry > nowDate) {
        const daysRemaining = Math.ceil((subscriptionExpiry - nowDate) / (1000 * 60 * 60 * 24));
        return {
          hasAccess: true,
          reason: 'active_subscription',
          daysRemaining: daysRemaining,
          subscriptionType: profile.subscriptionType || null
        };
      } else {
        return {
          hasAccess: false,
          reason: 'subscription_expired',
          expiredDate: subscriptionExpiry.toISOString()
        };
      }
    }

    if (profile.freeTrialUsed === true && profile.freeTrialEndDate) {
      const trialEndDate = profile.freeTrialEndDate.toDate();
      const diffTime = trialEndDate.getTime() - nowDate.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining > 0) {
        return {
          hasAccess: true,
          reason: 'free_trial_active',
          daysRemaining: daysRemaining,
          isExpiringSoon: daysRemaining <= 2
        };
      } else {
        return {
          hasAccess: false,
          reason: 'free_trial_expired',
          expiredDate: trialEndDate.toISOString()
        };
      }
    }

    return {
      hasAccess: false,
      reason: 'no_subscription_or_trial'
    };

  } catch (error) {
    console.error('Error validating subscription:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while validating subscription status',
      error.message
    );
  }
});

exports.checkExpiredSubscriptions = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Africa/Lagos')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const nowDate = now.toDate();

    try {
      const userProfilesRef = admin.firestore().collection('userProfiles');
      const snapshot = await userProfilesRef.get();

      const batch = admin.firestore().batch();
      let updateCount = 0;

      snapshot.docs.forEach((doc) => {
        const profile = doc.data();
        let needsUpdate = false;
        const updates = {};

        if (profile.isSubscribe === true && profile.subscriptionExpiryDate) {
          const expiryDate = profile.subscriptionExpiryDate.toDate();
          if (expiryDate < nowDate && profile.isSubscribe === true) {
            updates.isSubscribe = false;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          batch.update(doc.ref, updates);
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`Updated ${updateCount} expired subscriptions`);
      }

      return null;
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
      return null;
    }
  });