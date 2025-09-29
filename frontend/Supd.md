# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Scope: Frontend (React Native mobile app)

Common commands (run from repo root)
- Install JS deps: yarn --cwd frontend install
- Start Metro bundler: yarn --cwd frontend start
- Run app
  - Android (debug): yarn --cwd frontend android
  - iOS (simulator): yarn --cwd frontend ios
- Environment presets (copies env file, then runs Android)
  - Dev: yarn --cwd frontend dev
  - Prod: yarn --cwd frontend prod
- Build Android release (Gradle assembleRelease): yarn --cwd frontend build
- Lint: yarn --cwd frontend lint
- Tests (Jest)
  - All: yarn --cwd frontend test
  - Single file: yarn --cwd frontend test path/to/MyComponent.test.tsx
  - By name: yarn --cwd frontend test -t "renders correctly"
- iOS CocoaPods (first time or after native deps change)
  - cd frontend/ios && bundle install && bundle exec pod install && cd -

Environment and tooling
- Node >= 18 (enforced in frontend/package.json engines)
- Yarn v1 is the configured package manager
- .env handling: scripts copy .env.development or .env.production to .env before running/building
- Jest preset: react-native (see frontend/jest.config.js)
- ESLint config: extends @react-native (see frontend/.eslintrc.js)

High-level architecture (frontend)
- Entry point: frontend/App.tsx
  - UI theme: React Native Paper’s PaperProvider; icons via react-native-vector-icons/MaterialCommunityIcons
  - Navigation: NavigationContainer with an AuthNavigator (from src/navigation/main/AuthNavigator)
  - Global state: AuthContext provider exposes User, BranchList, SelectedBranch and setters
  - Session inactivity: react-native-user-inactivity with a 5-minute threshold
    - On inactivity, shows a visible countdown toast; on reaching zero, logs the user out and resets navigation to Login
  - Token management
    - Every 60s, checks decoded JWT expiry (via jwt-decode)
    - If within 2 minutes of expiry and there has been recent activity, calls sharedApi.RefreshToken()
    - On success, updates Authorization header on apiClient; on failure, logs out
  - Toasts: react-native-toast-message with custom success/error styles
- Networking (referenced modules under src/)
  - sharedApi: feature-agnostic API calls (e.g., RefreshToken, LogoutUser)
  - apiClient: Axios-based client where the Authorization header is set after refresh

Native configuration highlights
- Android
  - Project name: QPHS_Portal (frontend/android/settings.gradle)
  - ApplicationId/namespace: com.SchoolApp (frontend/android/app/build.gradle)
  - Build plugin: React Native Gradle plugin; release build via assembleRelease (wired to yarn build)
- iOS
  - Pod target: QPHS_Portal (frontend/ios/Podfile)
  - Autolinking is enabled via use_react_native!

Notes
- The standard React Native quickstart (Metro, Android/iOS run, CocoaPods) also appears in frontend/README.md and is reflected in the commands above.
