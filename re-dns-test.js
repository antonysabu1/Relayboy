import dns from 'dns';
import https from 'https';

const url = 'ppewmvaolnbedbqnmkpd.supabase.co';

console.log(`--- Diagnostics for ${url} ---`);

// 1. DNS Lookup
dns.lookup(url, (err, address, family) => {
    if (err) {
        console.error("❌ DNS Lookup failed:", err.message);
    } else {
        console.log(`✅ DNS Lookup: ${address} (family: IPv${family})`);
    }
});

// 2. Raw HTTPS Ping
const req = https.get(`https://${url}/rest/v1/`, (res) => {
    console.log(`✅ HTTPS Status: ${res.statusCode}`);
    res.on('data', () => { });
});

req.on('error', (err) => {
    console.error("❌ HTTPS Request failed:", err.message);
    console.error("Code:", err.code);
});

req.setTimeout(5000, () => {
    console.log("⏰ HTTPS Request timed out (5s)");
    req.destroy();
});
