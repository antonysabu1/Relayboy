async function testFetch() {
    const url = 'https://ppewmvaolnbedbqnmkpd.supabase.co/rest/v1/';
    console.log(`--- Testing Native fetch for ${url} ---`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const start = Date.now();
        const res = await fetch(url, { signal: controller.signal });
        const end = Date.now();
        console.log(`✅ Fetch Status: ${res.statusCode || res.status} (took ${end - start}ms)`);
    } catch (err) {
        console.error("❌ Fetch failed:", err.message);
        console.error("Code:", err.code);
    } finally {
        clearTimeout(timeoutId);
    }
}

testFetch();
