import { createClient } from "redis";

let pubClient = null;
let subClient = null;

export async function initializeRedis() {
    if (pubClient && subClient) {
        return { pubClient, subClient };
    }

    pubClient = createClient({
        url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    });

    subClient = pubClient.duplicate();

    pubClient.on("connect", () => {
        console.log("✅ Redis Publisher Connected");
    });

    subClient.on("connect", () => {
        console.log("✅ Redis Subscriber Connected");
    });

    pubClient.on("error", (err) => {
        console.error("❌ Redis Publisher Error:", err);
    });

    subClient.on("error", (err) => {
        console.error("❌ Redis Subscriber Error:", err);
    });

    await pubClient.connect();
    await subClient.connect();

    return {
        pubClient,
        subClient,
    };
}

export function getRedisClients() {
    return {
        pubClient,
        subClient,
    };
}