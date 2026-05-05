import { app, BrowserWindow, ipcMain, shell, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import SftpClient from 'ssh2-sftp-client';
import pkg from 'minecraft-launcher-core';
import { exec } from 'child_process';
const { Client, Authenticator } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let isGameRunning = false;
const launcher = new Client();

function checkIfGameIsRunning() {
  return new Promise((resolve) => {
    // Sur Windows, on cherche si un processus javaw.exe est actif
    // On pourrait affiner en cherchant "minecraft" ou "ElderSea" dans la ligne de commande
    exec('tasklist /FI "IMAGENAME eq javaw.exe" /NH', (err, stdout) => {
      if (err) return resolve(false);
      resolve(stdout.toLowerCase().includes('javaw.exe'));
    });
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Si quelqu'un essaie de lancer une deuxième instance, on focalise notre fenêtre.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200, height: 800, frame: false, resizable: false, maximizable: false,
      title: "ElderSea Launcher",
      webPreferences: { 
        nodeIntegration: true, 
        contextIsolation: false,
        webSecurity: false 
      },
      backgroundColor: '#0a0a0a', show: false,
      icon: path.join(__dirname, '../public/logoapp.png')
    });

    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://127.0.0.1:5173');
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', async () => {
      mainWindow.show();
      // Vérification initiale si le jeu tourne déjà
      isGameRunning = await checkIfGameIsRunning();
      mainWindow.webContents.send('game-status', isGameRunning);
    });
  }

  app.whenReady().then(createWindow);

  // Vérification périodique (toutes les 10 secondes) au cas où le jeu est fermé manuellement
  setInterval(async () => {
    if (mainWindow) {
      const running = await checkIfGameIsRunning();
      if (running !== isGameRunning) {
        isGameRunning = running;
        mainWindow.webContents.send('game-status', isGameRunning);
      }
    }
  }, 10000);
}

app.on('window-all-closed', (e) => { e.preventDefault(); });

ipcMain.handle('check-game-running', async () => {
  isGameRunning = await checkIfGameIsRunning();
  return isGameRunning;
});

ipcMain.on('window-control', (event, action) => {
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'close') app.quit();
});

ipcMain.on('open-folder', (event, folderName) => {
  const root = "C:\\ElderSea";
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  shell.openPath(root);
});

ipcMain.handle('check-mojang', async (event, pseudo) => {
  return new Promise((resolve) => {
    https.get(`https://api.mojang.com/users/profiles/minecraft/${pseudo}`, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
});

ipcMain.handle('get-mods', async () => {
  try {
    const modsDir = "C:\\ElderSea\\mods";
    if (!fs.existsSync(modsDir)) return [];
    return fs.readdirSync(modsDir).filter(f => f.endsWith('.jar')).map(f => ({ name: f }));
  } catch (e) { return []; }
});

ipcMain.handle('get-screenshots', async () => {
  try {
    const screenshotDir = "C:\\ElderSea\\screenshots";
    if (!fs.existsSync(screenshotDir)) return [];
    return fs.readdirSync(screenshotDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)).map(f => {
      const fullPath = path.join(screenshotDir, f);
      return {
        name: f,
        url: `data:image/${path.extname(f).replace('.', '')};base64,${fs.readFileSync(fullPath).toString('base64')}`,
        fullPath: fullPath,
        time: fs.statSync(fullPath).mtimeMs
      };
    }).sort((a, b) => b.time - a.time);
  } catch (e) { return []; }
});

ipcMain.handle('delete-screenshot', async (event, fullPath) => {
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Erreur lors de la suppression du screenshot:', e);
    return false;
  }
});

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`[DL] Start: ${url}`);
    const request = net.request({ url: url, redirect: 'follow' });
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        console.error(`[DL ERROR] ${response.statusCode} for ${url}`);
        reject(new Error(`Status ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      response.on('data', (chunk) => file.write(chunk));
      response.on('end', () => { file.end(); resolve(); });
    });
    request.on('error', (err) => {
        console.error(`[DL FATAL] ${err.message}`);
        reject(err);
    });
    request.end();
  });
}

function downloadJson(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return downloadJson(res.headers.location, dest).then(resolve).catch(reject);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { fs.writeFileSync(dest, data); resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function setupFabric(gameRoot, mcVersion, loaderVersion) {
  const versionId = `fabric-loader-${loaderVersion}-${mcVersion}`;
  const versionDir = path.join(gameRoot, 'versions', versionId);
  const jsonPath = path.join(versionDir, `${versionId}.json`);
  if (fs.existsSync(jsonPath)) return versionId;
  if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });
  const url = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
  await downloadJson(url, jsonPath);
  return versionId;
}

async function syncSFTP(gameRoot) {
  const sftp = new SftpClient();
  const remoteRoot = '/home/pierre/ElderSea/launcher';
  try {
    await sftp.connect({ host: '51.210.14.105', port: 22, username: 'pierre', password: 'ZDiLoQpFC25RT8', readyTimeout: 15000 });
    
    async function syncDir(remoteDir, localDir) {
        if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
        
        const fileList = await sftp.list(remoteDir);
        const remoteFileNames = fileList.filter(f => f.type === '-').map(f => f.name);
        
        const isModsDir = localDir.endsWith('mods') || localDir.endsWith('mods\\') || localDir.endsWith('mods/');
        
        if (isModsDir) {
            const localFiles = fs.readdirSync(localDir);
            for (const localFile of localFiles) {
                if (localFile.endsWith('.jar')) {
                    const nameL = localFile.toLowerCase();
                    const whitelist = ['0_create', '1_fabric-api', '2_modmenu', '3_sodium', '3_indium', '4_trinkets', '6_valkyrienskies', '7_createbigcannons', '8_vlib', '9_eureka', '10_effective'];
                    const isOutdatedBridgedMod = (nameL.includes('create') && !nameL.includes('createbigcannons') && !nameL.includes('0_create')) ||
                                                (nameL.includes('sodium') && !nameL.includes('3_sodium')) ||
                                                (nameL.includes('indium') && !nameL.includes('3_indium')) ||
                                                (nameL.includes('valkyrienskies') && !nameL.includes('6_valkyrienskies')) ||
                                                (nameL.includes('createbigcannons') && !nameL.includes('7_createbigcannons')) ||
                                                (nameL.includes('vlib') && !nameL.includes('8_vlib')) ||
                                                (nameL.includes('eureka') && !nameL.includes('9_eureka')) ||
                                                (nameL.includes('effective') && !nameL.includes('10_effective'));
                                                
                    if (isOutdatedBridgedMod || !remoteFileNames.includes(localFile)) {
                        if (!whitelist.some(w => nameL.includes(w))) {
                            try { fs.unlinkSync(path.join(localDir, localFile)); console.log(`[SYNC] Fichier supprimé : ${localFile}`); } catch (e) {}
                        }
                    }
                }
            }
        }

        for (const file of fileList) {
            const remoteFile = `${remoteDir}/${file.name}`;
            const localFile = path.join(localDir, file.name);

            if (file.type === 'd') {
                await syncDir(remoteFile, localFile);
            } else if (file.type === '-') {
                if (isModsDir) {
                    const nameL = file.name.toLowerCase();
                    if (nameL.includes('sodium') || nameL.includes('indium') || nameL.includes('valkyrienskies') ||
                        (nameL.includes('create') && !nameL.includes('createbigcannons')) || nameL.includes('createbigcannons') ||
                        nameL.includes('vlib') || nameL.includes('fabric-api') || nameL.includes('modmenu') || nameL.includes('trinkets')) {
                        continue;
                    }
                    if (nameL.includes('embeddium') || nameL.includes('flywheel')) {
                        try { fs.unlinkSync(localFile); } catch (e) {}
                        continue;
                    }
                }
                
                if (!fs.existsSync(localFile) || fs.statSync(localFile).size !== file.size) {
                    console.log(`[SYNC] DL: ${remoteFile}`);
                    await sftp.fastGet(remoteFile, localFile);
                }
            }
        }
    }

    await syncDir(remoteRoot, gameRoot);
  } catch (err) { 
    console.error("[SFTP ERROR]", err.message); 
  } finally { 
    try { await sftp.end(); } catch(e) {} 
  }
    
  // TÉLÉCHARGEMENT DES PONTS (Moteur Fabric Pur)
  const localPath = path.join(gameRoot, 'mods');
  if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, { recursive: true });

  const bridgeMods = [
      { name: '0_Create.jar', url: 'https://cdn.modrinth.com/data/Xbc0uyRg/versions/XwEwQH3o/create-fabric-6.0.8.0%2Bbuild.1734-mc1.20.1.jar' },
      { name: '1_Fabric-API.jar', url: 'https://github.com/FabricMC/fabric/releases/download/0.92.6%2B1.20.1/fabric-api-0.92.6+1.20.1.jar' },
      { name: '2_ModMenu.jar', url: 'https://github.com/TerraformersMC/ModMenu/releases/download/v7.2.2/modmenu-7.2.2.jar' },
      { name: '3_Sodium.jar', url: 'https://cdn.modrinth.com/data/AANobbMI/versions/OihdIimA/sodium-fabric-0.5.13%2Bmc1.20.1.jar' },
      { name: '3_Indium.jar', url: 'https://cdn.modrinth.com/data/Orvt0mRa/versions/nQHYSjxO/indium-1.0.36%2Bmc1.20.1.jar' },
      { name: '4_Trinkets.jar', url: 'https://cdn.modrinth.com/data/5aaWiji9/versions/n787vT8n/trinkets-3.7.2.jar' },
      { name: '6_ValkyrienSkies.jar', url: 'https://cdn.modrinth.com/data/V5ujR2yw/versions/qJr3y5vI/valkyrienskies-120-2.4.11.jar' },
      { name: '7_CreateBigCannons.jar', url: 'https://cdn.modrinth.com/data/GWp4jCJj/versions/RCcu2wC2/createbigcannons-5.11.3%2Bmc.1.20.1-fabric.jar' },
      { name: '8_VLib.jar', url: 'https://cdn.modrinth.com/data/V1UmcEMX/versions/HOxwImyh/vlib-1.20.1-0.1.0%2Bfabric.jar' },
      { name: '9_Eureka.jar', url: 'https://cdn.modrinth.com/data/EO8aSHxh/versions/aJWa3eWO/eureka-1201-1.6.3.jar' },
      { name: '10_Effective.jar', url: 'https://cdn.modrinth.com/data/pcPXJeZi/versions/vwgKoecR/effective-2.3.2-1.20.1.jar' }
  ];

  for (const mod of bridgeMods) {
      const modPath = path.join(localPath, mod.name);
      if (!fs.existsSync(modPath) || fs.statSync(modPath).size < 1000) {
          console.log(`[BRIDGE] Downloading ${mod.name}...`);
          try {
              await downloadFile(mod.url, modPath);
          } catch (dlError) {
              console.error(`[BRIDGE ERROR] Failed to download ${mod.name}:`, dlError.message);
              // On n'annule pas le lancement pour autant, le fichier existe peut-être déjà
          }
      }
  }

  mainWindow.webContents.send('mods-updated');
}

ipcMain.on('launch-game', async (event, { pseudo, ram }) => {
  if (isGameRunning) return;
  isGameRunning = true;
  mainWindow.webContents.send('game-status', true);

  try {
    const gameRoot = "C:\\ElderSea";
    if (!fs.existsSync(gameRoot)) fs.mkdirSync(gameRoot, { recursive: true });

    mainWindow.webContents.send('launch-progress', { type: 'Chargement hybride...', task: 20, total: 100 });
    await syncSFTP(gameRoot);
    
    mainWindow.webContents.send('launch-progress', { type: 'Décollage...', task: 80, total: 100 });
    const fabricVersion = await setupFabric(gameRoot, "1.20.1", "0.18.3");

    const authMethod = {
      access_token: "0", client_token: "0", uuid: "00000000-0000-0000-0000-000000000000",
      name: pseudo || "Joueur", user_properties: "{}"
    };
    
    let opts = {
      authorization: authMethod,
      root: gameRoot,
      version: { number: "1.20.1", type: "release", custom: fabricVersion },
      memory: { max: `${ram}G`, min: "2G" },
      window: { title: "ElderSea Launcher", width: 1280, height: 720 },
      javaPath: "javaw"
    };
    
    let gameStarted = false;
    launcher.on('data', (e) => {
        console.log("[JVM]", e);
        if (!gameStarted) {
            gameStarted = true;
            mainWindow.webContents.send('hide-progress');
        }
    });

    launcher.on('debug', (e) => console.log("[DEBUG]", e));
    launcher.on('progress', (e) => mainWindow.webContents.send('launch-progress', e));
    launcher.on('close', () => {
        isGameRunning = false;
        mainWindow.webContents.send('game-status', false);
        mainWindow.webContents.send('launch-finished');
    });

    console.log("[FABRIC] Lancement du moteur...");
    launcher.launch(opts);
    
  } catch (error) {
    isGameRunning = false;
    mainWindow.webContents.send('game-status', false);
    console.error("[FATAL ERROR]", error);
    mainWindow.webContents.send('launch-error', error.message);
  }
});
