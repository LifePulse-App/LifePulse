import { io, Socket } from "socket.io-client";
import apiClient from "./api_client";
import UserStorage from "../user/UserStorage";

const wsBase = apiClient.getBaseURL().replace(/\/api\/?$/, "");

let socket: Socket | null = null;
let connectPromise: Promise<Socket | null> | null = null; // ⚡ THE LOCK

let isSocketInCall = false; 

export const setSocketInCallStatus = (status: boolean) => {
    isSocketInCall = status;
};

export const connectSocket = async () => {
    // 1. If socket already exists, just return/wake it
    if (socket) {
        if (!socket.connected && !socket.active) {
            console.log("🔄 Waking up existing socket...");
            socket.connect();
        }
        return socket;
    }

    // 2. ⚡ If a connection is currently being established, wait for it! (Prevents Phantom Sockets)
    if (connectPromise) {
        return connectPromise;
    }

    // 3. Lock the initialization process
    connectPromise = (async () => {
        const token = await UserStorage.getAccessToken();

        if (!token) {
            console.log("❌ No access token found. Skipping socket connection.");
            connectPromise = null;
            return null; 
        }
socket = io(wsBase, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: { token },
});

socket.connect();

        socket.on("connect", () => console.log("✅ Socket Connected"));
        socket.on("disconnect", reason => console.log("❌ Socket Disconnected:", reason));
        socket.on("connect_error", err => console.log("⚠️ Socket Error:", err.message));

        connectPromise = null; // Release the lock
        return socket;
    })();

    return connectPromise;
};

export const getSocket = () => socket;

export const updateSocketToken = (newToken: string) => {
    if (socket) {
        console.log("🔄 Updating socket auth token...");
        socket.auth = { token: newToken };
        
        if (!isSocketInCall) {
            console.log("Safely restarting socket with new token.");
            socket.disconnect();
            
            // ⚡ Give the network layer time to cleanly drop the TCP link
            setTimeout(() => {
                if (socket && !socket.connected) {
                    socket.connect();
                }
            }, 1500); 
        } else {
            console.log("⚠️ In an active call! Token updated, but keeping current TCP link alive.");
        }
    }
};

export const disconnectSocket = () => {
    socket?.disconnect();
    socket = null;
    connectPromise = null;
};