import https from 'https';

const url = 'https://eldersea.tekao.fr/launcher/';

console.log('Fetching', url);
const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    console.log('Status code:', res.statusCode);
    console.log('Headers:', res.headers);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Data length:', data.length);
        console.log('Sample data:', data.slice(0, 1000));
    });
});

req.on('error', (err) => {
    console.error('Error fetching URL:', err);
});
