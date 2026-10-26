const axios = require('axios');

async function testSearch(symbol) {
  try {
    const res = await axios.get(`https://www.chittorgarh.com/search.asp?q=${encodeURIComponent(symbol)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const scripts = res.data.match(/<script[^>]*src="([^"]+)"/gi) || [];
    console.log('Scripts:', scripts.slice(0, 5));
    // Let's see if there is __NEXT_DATA__
    const nextDataMatch = res.data.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      const json = JSON.parse(nextDataMatch[1]);
      console.log('NEXT_DATA pageProps keys:', Object.keys(json.props?.pageProps || {}));
      console.log('NEXT_DATA content:', JSON.stringify(json.props?.pageProps).substring(0, 500));
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}

testSearch('SWIGGY');
