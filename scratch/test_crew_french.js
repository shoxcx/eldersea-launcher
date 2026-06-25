const API_URL = 'https://eldersea.tekao.fr/api';

async function testFrenchEndpoints() {
  const endpoints = [
    '/api/equipages',
    '/api/equipage',
    '/api/crews/all',
    '/api/crews/list',
    '/api/users/2/crew',
    '/api/users/ZeWolf929/crew',
    '/api/users/2/equipage',
    '/api/users/ZeWolf929/equipage'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${API_URL}${ep}`);
      console.log(`Endpoint ${ep}: status ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        console.log(`Data for ${ep}:`, JSON.stringify(json).substring(0, 300));
      }
    } catch (e) {
      console.log(`Endpoint ${ep} failed:`, e.message);
    }
  }
}

testFrenchEndpoints();
