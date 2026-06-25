const BASE_URL = 'https://eldersea.tekao.fr/api/api';

async function testNested() {
  const paths = [
    '/crews/user/ZeWolf929',
    '/crew/user/ZeWolf929',
    '/crews/member/ZeWolf929',
    '/crew/member/ZeWolf929',
    '/crews/pseudo/ZeWolf929',
    '/crew/pseudo/ZeWolf929'
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
      // ignore
    }
  }
}

testNested();
