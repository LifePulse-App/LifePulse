// hooks/useIdleTimer.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, BackHandler, TouchableWithoutFeedback } from 'react-native';

export function useIdleTimer(onIdle: () => void, timeout = 1 * 60 * 1000) {
  const timer = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onIdle();
    }, timeout);
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      resetTimer();
    }
    appState.current = nextAppState;
  };

  const handleUserInteraction = () => {
    resetTimer();
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      resetTimer();
      return false;
    });

    const events = [
      'touchstart',
      'mousedown',
      'keypress',
      'scroll',
      'mousemove',
    ];

    // Since RN doesn't have a 'document', we can't attach these
    // Instead, you handle interaction in a root `TouchableWithoutFeedback`

    resetTimer();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      subscription.remove();
      backHandler.remove();
    };
  }, []);
  
  return { handleUserInteraction };
}
