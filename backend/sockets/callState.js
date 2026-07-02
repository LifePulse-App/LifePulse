// sockets/callState.js

/**
 * userId -> socket.id
 */
export const onlineUsers = new Map();

/**
 * callId -> call information
 */
export const activeCalls = new Map();

/**
 * userId -> callId
 * Used for busy detection
 */
export const userCalls = new Map();