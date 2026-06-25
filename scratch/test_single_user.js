async function testSingleUser() {
  const urls = [
    'https://eldersea.tekao.fr/api/api/users/2',
    'https://eldersea.tekao.fr/api/api/users/ZeWolf929'
  ];
  for (const url of urls) {
    const res = await fetch(url);
    console.log(`URL: ${url}, status: ${res.status}`);
    if (res.ok) {
      const json = await res.json();
      console.log(`Data:`, JSON.stringify(json, null, 2));
    }
  }
}
testSingleUser();
