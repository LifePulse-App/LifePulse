export type CallStatusType = 'idle' | 'initiating' | 'ringing' | 'connected' | 'reconnecting' | 'disconnected' | 'busy' | 'no-answer';

export interface CallUser {
  id: string;
  name: string;
  avatar: string;
}

export interface CallSession {
  sessionId: string;
  remoteUser: CallUser;
  status: CallStatusType;
  isIncoming: boolean;
  startTime?: number;
}