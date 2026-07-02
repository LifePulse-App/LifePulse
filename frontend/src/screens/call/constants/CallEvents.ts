export const CallEvents = {
  SOCKET: {
    CALL_START: 'call:start',
    CALL_RINGING: 'call:ringing',
    CALL_ACCEPTED: 'call:accepted',
    CALL_REJECTED: 'call:rejected',
    CALL_END: 'call:end',
    WEBRTC_OFFER: 'webrtc:offer',
    WEBRTC_ANSWER: 'webrtc:answer',
    WEBRTC_ICE: 'webrtc:ice',
  }
} as const;