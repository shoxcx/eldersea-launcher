import fetch from 'node-fetch';

async function testGiphyProxy() {
  const url = 'https://giphy.com/api/v1/proxy/gifs/search?q=minecraft&limit=5';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data keys:', Object.keys(data));
    if (data.data) {
      console.log('First GIF:', data.data[0]);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testGiphyProxy();
