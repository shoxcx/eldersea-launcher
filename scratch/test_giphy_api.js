import fetch from 'node-fetch';

async function testGiphy() {
  const url = 'https://api.giphy.com/v1/gifs/trending?api_key=l0HlIwPWyBBUDAUgM&limit=5&rating=pg';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data keys:', Object.keys(data));
    console.log('Meta:', data.meta);
    if (data.data) {
      console.log('First GIF:', data.data[0]);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testGiphy();
