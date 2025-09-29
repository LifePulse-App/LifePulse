# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Focus on the frontend React Native app, with an additional AI model workspace:
  - frontend: React Native mobile app (Android/iOS) using TypeScript, Jest, ESLint, React Navigation, React Native Paper.
  - ai_model: Python ML workspace (TensorFlow, PyTorch, Ultralytics). Not wired into app code here.

Common commands (from repo root)
Frontend (React Native)
- Install dependencies:
  - yarn --cwd frontend install
  - iOS pods (first time or after native deps change):
    - cd frontend/ios && bundle install && bundle exec pod install && cd -
- Start Metro bundler:
  - yarn --cwd frontend start
- Run app:
  - Android (debug): yarn --cwd frontend android
  - iOS (simulator): yarn --cwd frontend ios
- Environment presets:
  - Android Dev: yarn --cwd frontend dev (copies .env.development → .env, then runs Android)
  - Android Prod: yarn --cwd frontend prod (copies .env.production → .env, then runs Android)
- Build Android release APK/AAB:
  - yarn --cwd frontend build (runs Gradle assembleRelease)
- Lint:
  - yarn --cwd frontend lint
- Tests (Jest):
  - All tests: yarn --cwd frontend test
  - Single file: yarn --cwd frontend test path/to/MyComponent.test.tsx
  - Single test by name: yarn --cwd frontend test -t "renders correctly"

AI model (Python)
- Create a virtual environment and install deps:
  - python3 -m venv .venv && source .venv/bin/activate
  - pip install -r ai_model/requirements.txt
- This workspace includes heavy ML packages (TensorFlow, PyTorch, Ultralytics). Use a suitable Python/CPU/GPU setup as needed.

High-level architecture
Frontend (React Native mobile app)
- Entry: frontend/App.tsx sets up:
  - PaperProvider (React Native Paper theme) with MaterialCommunityIcons
  - AuthContext Provider exposing User, BranchList, and SelectedBranch state
  - React Navigation NavigationContainer with AuthNavigator
  - UserInactivity for session timeout (5 minutes). When inactive, a visible countdown toast starts and logs the user out when it reaches zero.
  - Periodic token refresh: every 60 seconds, if the access token is within 2 minutes of expiry and the user has been active, a refresh request runs. On success, Authorization header is updated on api client; on failure, user is logged out.
- APIs and state:
  - Uses sharedApi and apiClient (Axios-based) modules for network calls.
  - JWT access token is decoded with jwt-decode to determine expiry and manage refresh cadence.
  - Toasts are centralized via react-native-toast-message with custom styles for success/error.
- Native projects:
  - Android namespace/applicationId: com.SchoolApp; React Native Gradle plugin; release builds via assembleRelease. Project name in settings.gradle: QPHS_Portal.
  - iOS target: QPHS_Portal with CocoaPods configured in Podfile and React Native autolinking.

Environment and configuration
- Frontend environment files are managed by scripts that copy .env.development or .env.production to .env prior to running/building. Ensure the appropriate .env.* files exist under frontend/.

Repository notes
- No CLAUDE.md, Cursor rules, or Copilot instruction files were found.
- The top-level README.md is empty; the frontend/README.md includes the standard React Native quickstart (Metro, run commands, CocoaPods). The essential parts are reflected above.
