const BASE_URL = 'https://eldersea.tekao.fr/api/api';

async function brute() {
  const paths = [
    '/crews-list',
    '/crew-list',
    '/get-crews',
    '/get-crew',
    '/crew/list',
    '/crews/list',
    '/crew/all',
    '/crew-member',
    '/crew-members',
    '/crews-member',
    '/crews-members',
    '/utilities/crews',
    '/utilities/crew',
    '/eldersea/crews',
    '/eldersea/crew',
    '/eldersea-utilities/crews',
    '/eldersea-utilities/crew'
  ];

  for (const p of paths) {
    const url = `${BASE_URL}${p}`;
    try {
      const res = await fetch(url);
      if (res.status !== 404) {
        console.log(`FOUND! URL: ${url}, status: ${res.status}`);
        const text = await res.text();
        console.log(text.substring(0, 300));
      }
    } catch (e) {
      // ignore
    }
  }
  console.log("Brute force finished.");
}

brute();
