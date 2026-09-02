# ==========================================
# STREAKSPHERE: CUSTOM PROGUARD / R8 RULES
# ==========================================

# 1. React Native Core & Networking (Apisauce/Axios)
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-keep class okio.** { *; }
-keep interface okio.** { *; }
-dontwarn okio.**

# 2. UI, Animations, & Worklets (Swmansion)
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.reanimated.layoutReanimation.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.common.GestureHandlerStateManager { *; }
-dontwarn com.swmansion.reanimated.**

# 3. Vision Camera, Nitro Modules, & Worklets (Margelo Ecosystem)
# These use heavy C++/JNI bindings that R8 will destroy if not kept.
-keep class com.mrousavy.** { *; }
-keep class com.margelo.** { *; }
-dontwarn com.mrousavy.**
-dontwarn com.margelo.**

# 4. WebRTC & InCall Manager
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
-keep class com.zxcpoiu.incallmanager.** { *; }

# 5. MapLibre
-keep class org.maplibre.** { *; }
-dontwarn org.maplibre.**
-keep class com.mapbox.** { *; }
-dontwarn com.mapbox.**

# 6. React Native Video (v7 uses AndroidX Media3/ExoPlayer)
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**

# 7. ViroReact (AR / VR)
-keep class com.viro.core.** { *; }
-keep class com.viromedia.** { *; }
-dontwarn com.viro.core.**

# 8. FastImage (Glide Image Loading)
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class com.bumptech.glide.** { *; }
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** {
  **[] $VALUES;
  public *;
}

# 9. Image Crop Picker (UCrop Library)
-keep class com.yalantis.ucrop.** { *; }
-keep class com.yalantis.ucrop.model.** { *; }

# 10. CodePush & Firebase / Notifee
-keep class com.microsoft.codepush.react.** { *; }
-keep class app.notifee.** { *; }

# 11. Biometrics & KeyChain
-keep class com.oblador.keychain.** { *; }
-keep class com.rnbiometrics.** { *; }

-keep class com.revenuecat.purchases.** { *; }

# 12. BootSplash (Prevent R8 from stripping splash screen logic)
-keep class com.zoontek.rnbootsplash.** { *; }

# 13. Fresco & WebP (Bitmap Optimisation engine)
-keep class com.facebook.fresco.** { *; }
-keep class com.facebook.imagepipeline.** { *; }

