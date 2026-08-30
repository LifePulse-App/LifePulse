package com.streaksphere

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.microsoft.codepush.react.CodePush 

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<com.facebook.react.ReactPackage> =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here
        }

      override fun getJSMainModuleName(): String = "index"
      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
      
      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED

      // ⚡ CodePush hook: Android will pull the updated bundle from here
      override fun getJSBundleFile(): String? {
        return CodePush.getJSBundleFile()
      }
    }

  override val reactHost: ReactHost by lazy {
    // ⚡ FIX: Removed the invalid String parameter. 
    // It now correctly takes just context + reactNativeHost and reads the CodePush bundle directly from it.
    getDefaultReactHost(this.applicationContext, this.reactNativeHost)
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}