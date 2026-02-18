import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
    console.log("Testing connection to Supabase...");
    console.log("URL:", process.env.SUPABASE_URL);

    const start = Date.now();
    try {
        const { data, error } = await supabase.from("users").select("username").limit(1);
        const end = Date.now();

        if (error) {
            console.error("❌ Connection failed:", error.message);
            console.error("Details:", error);
        } else {
            console.log(`✅ Connection successful! (took ${end - start}ms)`);
            console.log("Data sample:", data);
        }
    } catch (err) {
        console.error("🔥 Critical fetch error:", err.message);
        console.error(err);
    }
}

testConnection();
