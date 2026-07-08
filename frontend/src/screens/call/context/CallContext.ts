import { createContext } from 'react';
import { MediaStream } from 'react-native-webrtc';
import { CallSession, CallUser } from '../types/Call';

export interface CallContextProps {
  currentSession: CallSession | null;
  remoteStream: MediaStream | null;
  
  // States
  isMuted: boolean;
  isMinimized: boolean;
  
  // ⚡ New Audio Routing States
  audioRoute: 'EARPIECE' | 'SPEAKER_PHONE' | 'BLUETOOTH' | 'WIRED_HEADSET' | string;
  availableRoutes: string[];

  callDuration: number

  // Actions
  startCall: (targetUser: CallUser, conversationId: string) => Promise<void>; 
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  
  // Toggles
  toggleMute: () => void;
  toggleMinimize: () => void;
  handleSpeakerPress: () => void; // ⚡ Replaced toggleSpeaker with the dynamic menu handler
}

// Create and export the Context
export const CallContext = createContext<CallContextProps | undefined>(undefined);