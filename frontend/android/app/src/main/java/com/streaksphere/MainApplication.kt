package com.streaksphere

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.microsoft.codepush.react.CodePush // ⚡ CODEPUSH IMPORT

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<com.facebook.react.ReactPackage> =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here
        }

      override fun getJSMainModuleName(): String = "index"
      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
      
      // ⚡ REQUIRED FOR RN 0.76+ / 0.86 TO PREVENT CRASHES
      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED

      // ⚡ Tell Android to use the CodePush bundle from the hard drive
      override fun getJSBundleFile(): String? {
        return CodePush.getJSBundleFile()
      }
    }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      this.applicationContext,
      this.reactNativeHost,
      CodePush.getJSBundleFile() ?: "assets://index.android.bundle"
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}