const BASE_URL = 'https://eldersea.tekao.fr/api';

async function testRaw() {
  const paths = [
    '/crews',
    '/crew',
    '/utilities',
    '/eldersea-utilities',
    '/users/2/crew',
    '/users/ZeWolf929/crew',
    '/crews/ZeWolf929',
    '/crew/ZeWolf929'
  ];

  for (const p of paths) {
    const url = `${BASE_URL}${p}`;
    try {
      const res = await fetch(url);
      console.log(`URL: ${url}, status: ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        console.log(`Data:`, JSON.stringify(json).substring(0, 300));
      }
    } catch (e) {
      console.log(`URL: ${url} failed:`, e.message);
    }
  }
}

testRaw();
