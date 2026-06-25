async function fetchApiHome() {
  const urls = [
    'https://eldersea.tekao.fr/api/',
    'https://eldersea.tekao.fr/api/api/'
  ];
  for (const url of urls) {
    const res = await fetch(url);
    console.log(`URL: ${url}, status: ${res.status}`);
    const text = await res.text();
    console.log(text.substring(0, 500));
  }
}
fetchApiHome();
