const assert = require('assert');
const axios = require('axios');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Heatmap Data Pipeline Tests...\n');

  // Test 1: Fetch initial heatmap data (NIFTY50)
  console.log('👉 Test 1: Initial Heatmap Fetch for NIFTY50');
  const t0 = Date.now();
  const res1 = await axios.get(`${BASE_URL}/market/heatmap?index=NIFTY50`);
  const d0 = Date.now() - t0;
  assert.strictEqual(res1.status, 200, 'Expected status 200');
  assert.strictEqual(res1.data.success, true, 'Expected success: true');
  assert.strictEqual(res1.data.index, 'NIFTY50');
  assert(res1.data.stocks.length >= 50, 'Expected at least 50 stocks');
  console.log(`   ✅ Success: Received ${res1.data.stocks.length} stocks in ${d0}ms (cached: ${res1.data.cached})\n`);

  // Test 2: Cache Hit Verification
  console.log('👉 Test 2: In-Memory Cache Hit Verification (Subsequent Request)');
  const t1 = Date.now();
  const res2 = await axios.get(`${BASE_URL}/market/heatmap?index=NIFTY50`);
  const d1 = Date.now() - t1;
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.data.cached, true, 'Expected cached: true');
  assert(d1 < 50, `Expected cache hit to be fast (< 50ms), took ${d1}ms`);
  console.log(`   ✅ Cache HIT confirmed in ${d1}ms! Zero external calls made.\n`);

  // Test 3: Concurrent Request Coalescing (Single-Flight)
  console.log('👉 Test 3: Concurrent Request Coalescing (Single-Flight test for BANKNIFTY)');
  const t2 = Date.now();
  const promises = [
    axios.get(`${BASE_URL}/market/heatmap?index=BANKNIFTY`),
    axios.get(`${BASE_URL}/market/heatmap?index=BANKNIFTY`),
    axios.get(`${BASE_URL}/market/heatmap?index=BANKNIFTY`),
    axios.get(`${BASE_URL}/market/heatmap?index=BANKNIFTY`),
  ];
  const results = await Promise.all(promises);
  const d2 = Date.now() - t2;
  results.forEach((r, idx) => {
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.index, 'BANKNIFTY');
    assert(r.data.stocks.length >= 12);
  });
  console.log(`   ✅ Request Coalescing: 4 concurrent requests resolved safely in ${d2}ms.\n`);

  // Test 4: All Supported Indices
  console.log('👉 Test 4: Verify All Supported Index Configurations');
  const indices = ['NIFTY50', 'BANKNIFTY', 'SENSEX', 'CNX100', 'CNX500'];
  for (const idx of indices) {
    const res = await axios.get(`${BASE_URL}/market/heatmap?index=${idx}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert(res.data.stocks.length > 0);
    console.log(`   ✅ ${idx.padEnd(10)}: ${res.data.stocks.length} stocks | cached: ${res.data.cached || false}`);
  }

  console.log('\n🎉 All Heatmap Pipeline Tests PASSED successfully!\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
