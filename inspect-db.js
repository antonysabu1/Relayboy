import { supabase } from "./db.js";

async function inspectSchema() {
    console.log("🔍 Inspecting 'messages' table schema...");

    // Try to get one row to see the keys
    const { data, error } = await supabase.from("messages").select("*").limit(1);

    if (error) {
        console.error("❌ Error fetching from messages:", error);
        // If table doesn't exist, we'll get a different error
        return;
    }

    if (data && data.length > 0) {
        console.log("✅ Found row. Columns are:", Object.keys(data[0]));
    } else {
        console.log("⚠️ Table is empty. Trying to insert a dummy row to see allowed columns (this might fail but give a better error).");
        const { error: insertError } = await supabase.from("messages").insert([{
            non_existent_column_test: "test"
        }]);
        console.log("Insert result:", insertError ? insertError.message : "Success (unexpected)");
    }
}

inspectSchema();
