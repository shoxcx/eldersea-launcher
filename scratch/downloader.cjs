const https = require('https');
const fs = require('fs');
const path = require('path');

const files = [
    {
        url: "https://bmclapi2.bangbang93.com/maven/net/minecraftforge/forge/1.20.1-47.3.0/forge-1.20.1-47.3.0-client.jar",
        dest: "C:\\ElderSea\\libraries\\net\\minecraftforge\\forge\\1.20.1-47.3.0\\forge-1.20.1-47.3.0-client.jar"
    },
    {
        url: "https://bmclapi2.bangbang93.com/maven/net/minecraft/client/1.20.1-20230612.114412/client-1.20.1-20230612.114412-srg.jar",
        dest: "C:\\ElderSea\\libraries\\net\\minecraft\\client\\1.20.1-20230612.114412\\client-1.20.1-20230612.114412-srg.jar"
    },
    {
        url: "https://bmclapi2.bangbang93.com/maven/net/minecraft/client/1.20.1-20230612.114412/client-1.20.1-20230612.114412-extra.jar",
        dest: "C:\\ElderSea\\libraries\\net\\minecraft\\client\\1.20.1-20230612.114412\\client-1.20.1-20230612.114412-extra.jar"
    }
];

async function download(url, dest) {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${url} to ${dest}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

(async () => {
    for (const f of files) {
        try {
            await download(f.url, f.dest);
        } catch (e) {
            console.error(e.message);
        }
    }
})();
