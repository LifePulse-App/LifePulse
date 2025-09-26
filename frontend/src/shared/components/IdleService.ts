import { AppState, AppStateStatus, Keyboard } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

let inactivityTimer: NodeJS.Timeout | null = null;
let countdownTimer: NodeJS.Timeout | null = null;
let tokenRefreshTimer: NodeJS.Timeout | null = null;

const IDLE_TIME = 5 * 60 * 1000; // 5 min
const COUNTDOWN_DURATION = 30; // sec
const TOKEN_CHECK_INTERVAL = 60 * 1000; // 1 min

export const useIdleService = ({
  getToken,
  refreshToken,
  logout,
  showAlert,
  dismissAlert,
}: {
  getToken: () => string | null;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  showAlert: (countdown: number, onStay: () => void) => void;
  dismissAlert: () => void;
}) => {
  const [countdown, setCountdown] = useState<number>(0);
  const lastActivityRef = useRef<Date>(new Date());

  const updateLastActivity = () => {
    lastActivityRef.current = new Date();
    resetInactivityTimer();
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    dismissAlert();

    inactivityTimer = setTimeout(startCountdown, IDLE_TIME);
  };

  const startCountdown = () => {
    let remaining = COUNTDOWN_DURATION;
    setCountdown(remaining);
    showAlert(remaining, updateLastActivity);

    countdownTimer = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimer!);
        dismissAlert();
        logoutDueToInactivity();
      }
    }, 1000);
  };

  const logoutDueToInactivity = async () => {
    if (countdownTimer) clearInterval(countdownTimer);
    if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);
    setCountdown(0);
    await logout();
  };

  const checkAndRefreshToken = async () => {
    const token = getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      const expiry = decoded.exp * 1000;
      const now = new Date().getTime();
      const timeLeft = expiry - now;
      const timeSinceLastActivity = (now - lastActivityRef.current.getTime()) / 1000;

      if (timeLeft <= 120000 && timeSinceLastActivity < 60) {
        try {
          await refreshToken();
        } catch (error) {
          await logoutDueToInactivity();
        }
      }
    }
  };

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') updateLastActivity();
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    const keyboardShowListener = Keyboard.addListener?.('keyboardDidShow', updateLastActivity);
    const keyboardHideListener = Keyboard.addListener?.('keyboardDidHide', updateLastActivity);

    resetInactivityTimer();
    tokenRefreshTimer = setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);
      appStateSubscription.remove();
      keyboardShowListener?.remove();
      keyboardHideListener?.remove();
    };
  }, []);
};
