const BASE_URL = 'https://eldersea.tekao.fr/api';

async function testAlt() {
  const paths = [
    '/api/factions',
    '/api/faction',
    '/api/teams',
    '/api/team',
    '/api/guilds',
    '/api/guild',
    '/api/clans',
    '/api/clan',
    '/api/users/2/team',
    '/api/users/2/faction'
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

testAlt();
