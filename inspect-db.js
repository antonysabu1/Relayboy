import { supabase } from "./db.js";

async function inspectSchema() {
    console.log("🔍 Inspecting 'messages' table...");
    const { data, error } = await supabase.from("messages").select("*").limit(5);
    if (data && data.length > 0) {
        data.forEach(m => console.log(`- From ${m.from} to ${m.to}: ${m.timestamp}`));
    }
}

inspectSchema();
