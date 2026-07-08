import { useState, useEffect } from 'react';
import { CallSession } from '../types/Call';

export const useCallDuration = (currentSession: CallSession | null) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!currentSession || currentSession.status !== 'connected' || !currentSession.startTime) {
      setSeconds(0);
      return;
    }

    // Keep UI execution synced with system epoch time to avoid background JS lag drifts
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - currentSession.startTime!) / 1000);
      setSeconds(elapsed >= 0 ? elapsed : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  const formatDuration = (): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return formatDuration();
};