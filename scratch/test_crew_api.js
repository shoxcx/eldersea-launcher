const API_URL = 'https://eldersea.tekao.fr/api';

async function testEndpoints() {
  const endpoints = [
    '/api/crews',
    '/api/crew',
    '/api/crews/members',
    '/api/crews/member',
    '/api/eldersea-utilities',
    '/api/utilities',
    '/api/users/crews',
    '/api/users/crew'
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

testEndpoints();
