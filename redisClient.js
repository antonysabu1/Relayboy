import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", err => console.error("❌ Redis error:", err));
redis.on("connect", () => console.log("🟢 Redis connected successfully"));

await redis.connect();
export default redis;