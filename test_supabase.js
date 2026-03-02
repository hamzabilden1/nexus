require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testConnection() {
    console.log("Checking tables...");
    const tables = ['users', 'messages', 'knowledge', 'memories', 'processed_updates'];
    let allOk = true;

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`❌ Table '${table}' Error:`, error.message);
            allOk = false;
        } else {
            console.log(`✅ Table '${table}' OK.`);
        }
    }
    
    if (allOk) {
        console.log("Supabase connection and tables are fully working!");
    }
}
testConnection();
