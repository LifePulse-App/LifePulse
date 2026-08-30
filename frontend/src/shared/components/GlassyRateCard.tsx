import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InAppReview from 'react-native-in-app-review';

const GOOGLE_PLAY_PACKAGE_NAME = 'com.streaksphere';
const APPLE_APP_ID = '1234567890'; // Replace with your App Store ID later

interface GlassyRateCardProps {
  onDismiss?: () => void;
  onSendFeedback?: () => void; // Optional prop to handle navigation to a feedback screen
}

export default function GlassyRateCard({ onDismiss, onSendFeedback }: GlassyRateCardProps) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);

  const triggerNativeReview = async () => {
    try {
      if (InAppReview.isAvailable()) {
        await InAppReview.RequestInAppReview();
      } else {
        const url = Platform.select({
          ios: `itms-apps://itunes.apple.com/app/viewContentsUserReviews?id=${APPLE_APP_ID}&action=write-review`,
          android: `market://details?id=${GOOGLE_PLAY_PACKAGE_NAME}`,
        });
        console.log(url);
        
        if (url) {
          Linking.canOpenURL(url).then(supported => {
            if (supported){ Linking.openURL(url)}
            else{ console.log("no");}
            
          });
        }
        else {
            console.log("no url");
            
          }
      }
    } catch (e) {
      console.log('In-App Review Failed:', e);
    }
  };

  const handleRate = (stars: number) => {
    setRating(stars);
    
    setTimeout(() => {
      setSubmitted(true);
      
      if (stars >= 4) {
        // 4 or 5 stars -> Show Thank You & Send to App Store
        triggerNativeReview();
        if (onDismiss) {
          setTimeout(onDismiss, 2000);
        }
      } else {
        // 1 to 3 stars -> Show custom glassy feedback prompt
        setShowFeedbackPrompt(true);
      }
    }, 400);
  };

  // STATE 1: Custom Glassy Feedback Prompt (1 to 3 Stars)
  if (showFeedbackPrompt) {
    return (
      <View style={styles.container}>
        <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={15} />
        <View style={styles.content}>
          <MaterialCommunityIcons name="message-alert-outline" size={36} color="#94A3B8" style={{ marginBottom: 10 }} />
          <Text style={styles.title}>Thanks for the feedback!</Text>
          <Text style={styles.subtitle}>We are constantly improving StreakSphere. Want to tell us what we can do better?</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.glassButton} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={styles.glassButtonText}>No thanks</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.glassButton, styles.primaryButton]} 
              onPress={() => {
                if (onSendFeedback) onSendFeedback();
                if (onDismiss) onDismiss();
              }} 
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Send Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // STATE 2: Thank You Message (4 to 5 Stars)
  if (submitted && rating >= 4) {
    return (
      <View style={styles.container}>
        <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={15} />
        <View style={styles.content}>
          <MaterialCommunityIcons name="heart" size={40} color="#ec4899" style={{ marginBottom: 10 }} />
          <Text style={styles.title}>You're awesome!</Text>
          <Text style={styles.subtitle}>Thanks for supporting StreakSphere.</Text>
        </View>
      </View>
    );
  }

  // STATE 3: Initial Rating Stars
  return (
    <View style={styles.container}>
      <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={15} />
      
      <View style={styles.content}>
        <View style={styles.closeHeader}>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
             <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Enjoying StreakSphere?</Text>
        <Text style={styles.subtitle}>Tap a star to rate it on the Play Store.</Text>
        
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity 
              key={star} 
              activeOpacity={0.7} 
              onPress={() => handleRate(star)}
              style={styles.starButton}
            >
              <MaterialCommunityIcons 
                name={rating >= star ? "star" : "star-outline"} 
                size={38} 
                color={rating >= star ? "#fbbf24" : "rgba(255,255,255,0.3)"} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)', 
    backgroundColor: 'rgba(15, 23, 42, 0.65)', 
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  closeHeader: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  starButton: {
    padding: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  glassButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.8)', // Purple accent
    borderColor: '#A855F7',
  },
  glassButtonText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});