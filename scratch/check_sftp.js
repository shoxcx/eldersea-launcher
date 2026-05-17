import SftpClient from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('electron/config.json', 'utf-8'));
const decodeSecret = (str) => str ? Buffer.from(str, 'base64').toString('utf-8') : '';

async function listVersions() {
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: decodeSecret(config.sftp.host),
      port: config.sftp.port || 22,
      username: decodeSecret(config.sftp.username),
      password: decodeSecret(config.sftp.password),
    });
    const remoteRoot = decodeSecret(config.sftp.root) || '/home/pierre/ElderSea/launcher';
    const versionsDir = `${remoteRoot}/versions/1.20.1-forge-47.3.0`;
    console.log(`Checking: ${versionsDir}`);
    const files = await sftp.list(versionsDir);
    console.log(JSON.stringify(files, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await sftp.end();
  }
}

listVersions();
