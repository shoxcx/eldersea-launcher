import { app, BrowserWindow, ipcMain, shell, protocol, net, dialog, Tray, Menu, screen, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import http from 'http';
import nodeNet from 'node:net';

import pkg from 'minecraft-launcher-core';
import { exec } from 'child_process';
const { Client, Authenticator } = pkg;

import pkgUpdater from 'electron-updater';
const { autoUpdater } = pkgUpdater;

import DiscordRPC from 'discord-rpc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let isGameRunning = false;
let isQuitting = false;
let tray = null;
let backgroundMode = true; // Match the Zustand store default value
let showConsole = false;
let consoleWindow = null;
let logBuffer = [];
let localServerPort = null;

function startLocalServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';
      
      let filePath = path.join(__dirname, '../dist', urlPath);
      
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        filePath = path.join(__dirname, '../dist/index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
      };
      
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading file');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        server.listen(0, '127.0.0.1', () => {
          resolve(server.address().port);
        });
      }
    });

    server.listen(37562, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

const launcher = new Client();
const GAME_ROOT = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME), '.eldersea');

// Configuration du Discord Rich Presence
// Pour afficher "Joue à ElderSea", créez une application nommée "ElderSea" sur le portail des développeurs Discord :
// https://discord.com/developers/applications
// Copiez ensuite son "Application ID" (Client ID) ci-dessous.
const clientId = '1509891048309133434'; // Remplacer par votre Client ID Discord réel
let rpc = null;
let rpcReady = false;

function initDiscordRPC() {
  if (rpc) return;
  
  // Validation du Client ID pour éviter les tentatives de connexion avec un ID fictif ou invalide
  if (!clientId || clientId === '137766699999999999' || !/^\d{17,19}$/.test(clientId)) {
    console.log('[DISCORD] Rich Presence inactive (Client ID non configuré ou fictif).');
    console.log('[DISCORD] Pour configurer la Rich Presence :');
    console.log('[DISCORD] 1. Allez sur https://discord.com/developers/applications');
    console.log('[DISCORD] 2. Créez une application nommée "ElderSea"');
    console.log('[DISCORD] 3. Remplacez "clientId" dans electron/main.js par votre "Application ID"');
    return;
  }

  try {
    rpc = new DiscordRPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
      console.log('[DISCORD] Rich Presence connected!');
      rpcReady = true;
      setDiscordActivity('Dans le launcher', 'Prêt à naviguer');
    });

    rpc.login({ clientId }).catch(err => {
      console.error('[DISCORD ERROR] Échec de connexion à Discord:', err.message);
    });
  } catch (err) {
    console.error('[DISCORD INIT ERROR]', err);
  }
}

function setDiscordActivity(details, state, startTime = null, showPlayButton = false) {
  if (!rpc || !rpcReady) return;
  try {
    const activity = {
      details,
      state,
      largeImageKey: 'logoapp',
      largeImageText: 'ElderSea RPG',
      instance: false,
      buttons: [
        { label: 'Rejoindre', url: 'https://eldersea.tekao.fr' }
      ]
    };
    
    if (startTime) {
      activity.startTimestamp = startTime;
    }
    
    if (showPlayButton) {
      activity.smallImageKey = 'play';
      activity.smallImageText = 'En Jeu';
    }

    rpc.setActivity(activity).catch(err => {
      console.error('[DISCORD SET ACTIVITY ERROR]', err);
    });
  } catch (err) {
    console.error('[DISCORD ACTIVITY ERROR]', err);
  }
}

function appendToLogBuffer(log) {
  if (!log) return;
  logBuffer.push(log);
  if (logBuffer.length > 500) {
    logBuffer.shift();
  }
  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.webContents.send('new-log', log);
  }
}

function createConsoleWindow() {
  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.focus();
    return;
  }

  consoleWindow = new BrowserWindow({
    width: 900,
    height: 550,
    frame: false,
    resizable: true,
    minWidth: 600,
    minHeight: 400,
    title: "ElderSea - Console de Lancement",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    backgroundColor: '#090c10',
    show: false,
    icon: getIconPath()
  });

  consoleWindow.loadFile(path.join(__dirname, 'console.html'));

  consoleWindow.once('ready-to-show', () => {
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      consoleWindow.show();
      consoleWindow.webContents.send('init-logs', logBuffer);
      consoleWindow.webContents.send('game-status', isGameRunning ? 'running' : 'idle');
    }
  });

  consoleWindow.on('closed', () => {
    consoleWindow = null;
  });
}

const getIconPath = () => {
  const devPath = path.join(__dirname, '../public/logoapp.png');
  const prodPath = path.join(__dirname, '../dist/logoapp.png');
  return fs.existsSync(prodPath) ? prodPath : devPath;
};


function checkIfGameIsRunning() {
  return new Promise((resolve) => {
    exec('powershell "Get-CimInstance Win32_Process -Filter \\"Name = \'javaw.exe\'\\" | Select-Object -ExpandProperty CommandLine"', (err, stdout) => {
      if (err) {
        exec('tasklist /FI "IMAGENAME eq javaw.exe" /NH', (err2, stdout2) => {
            if (err2) return resolve(false);
            return resolve(stdout2.toLowerCase().includes('javaw.exe'));
        });
        return;
      }
      // On cherche strictement le dossier .eldersea pour éviter de détecter d'autres instances Minecraft
      const isRunning = stdout.toLowerCase().includes('.eldersea');
      resolve(isRunning);
    });
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Si quelqu'un essaie de lancer une deuxième instance, on focalise notre fenêtre.
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

  function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Calcul adaptatif dynamique selon la résolution de l'écran de l'utilisateur
    let targetWidth = 1200;
    let targetHeight = 800;

    if (screenHeight < 800) {
      // Petits écrans / pc portables (ex: 1366x768, 1280x720)
      targetHeight = Math.max(540, Math.floor(screenHeight * 0.90));
      targetWidth = Math.max(880, Math.min(Math.floor(screenWidth * 0.92), Math.floor(targetHeight * 1.48)));
    } else if (screenHeight <= 950) {
      // Résolutions moyennes (1600x900, 1440x900)
      targetHeight = Math.floor(screenHeight * 0.85);
      targetWidth = Math.min(Math.floor(screenWidth * 0.88), Math.floor(targetHeight * 1.5));
    } else if (screenHeight >= 1400) {
      // Très grands écrans (1440p 2K, 4K)
      targetHeight = Math.min(Math.floor(screenHeight * 0.72), 1150);
      targetWidth = Math.min(Math.floor(screenWidth * 0.75), Math.floor(targetHeight * 1.5));
    } else {
      // Écrans 1080p standard (1920x1080)
      targetHeight = Math.min(800, Math.floor(screenHeight * 0.82));
      targetWidth = Math.min(1240, Math.floor(screenWidth * 0.85));
    }

    // Sécurités dimensionnelles
    targetWidth = Math.max(920, Math.min(targetWidth, screenWidth - 30));
    targetHeight = Math.max(540, Math.min(targetHeight, screenHeight - 30));

    mainWindow = new BrowserWindow({
      width: targetWidth,
      height: targetHeight,
      minWidth: 920,
      minHeight: 540,
      frame: false,
      resizable: true,
      maximizable: true,
      center: true,
      title: "ElderSea",
      webPreferences: { 
        nodeIntegration: true, 
        contextIsolation: false,
        webSecurity: false 
      },
      backgroundColor: '#0a0a0a',
      show: false,
      icon: getIconPath()
    });

    mainWindow.on('maximize', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window-maximized-state', true);
      }
    });

    mainWindow.on('unmaximize', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window-maximized-state', false);
      }
    });

    mainWindow.on('close', (event) => {
      if (backgroundMode && !isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        createTray();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://127.0.0.1:5173');
    } else {
      mainWindow.loadURL(`http://127.0.0.1:${localServerPort}`);
    }

    mainWindow.once('ready-to-show', async () => {
      mainWindow.show();
      // Vérification initiale si le jeu tourne déjà
      isGameRunning = await checkIfGameIsRunning();
      mainWindow.webContents.send('game-status', isGameRunning);

      // Patch préventif des icônes d'assets Minecraft avec le logo ElderSea
      patchMinecraftAssetIcons();

      // Vérification des mises à jour automatiques via GitHub
      if (process.env.NODE_ENV !== 'development') {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
          console.error('[UPDATER ERROR]', err);
        });
      }
    });
  }

  app.whenReady().then(async () => {
    if (process.env.NODE_ENV !== 'development') {
      localServerPort = await startLocalServer();
    }
    createWindow();
    initDiscordRPC();
  });

  // Vérification périodique (toutes les 10 secondes) au cas où le jeu est fermé manuellement
  setInterval(async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const running = await checkIfGameIsRunning();
      if (running !== isGameRunning) {
        isGameRunning = running;
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('game-status', isGameRunning);
        }
      }
    }
  }, 10000);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('check-game-running', async () => {
  isGameRunning = await checkIfGameIsRunning();
  return isGameRunning;
});

ipcMain.handle('is-window-maximized', () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
});

ipcMain.on('window-control', (event, action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'maximize') {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
  if (action === 'close') {
    if (backgroundMode && !isQuitting) {
      mainWindow.hide();
      createTray();
    } else {
      isQuitting = true;
      app.quit();
    }
  }
});

ipcMain.on('console-window-control', (event, action) => {
  if (!consoleWindow || consoleWindow.isDestroyed()) return;
  if (action === 'minimize') consoleWindow.minimize();
  if (action === 'close') consoleWindow.close();
});

ipcMain.on('set-show-console', (event, enable) => {
  showConsole = enable;
  console.log(`[SETTINGS] Set showConsole to ${enable}`);
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  if (rpc) {
    try {
      rpc.destroy();
    } catch (e) {}
  }
});

ipcMain.on('set-launch-on-startup', (event, enable) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath
    });
    console.log(`[STARTUP] Set openAtLogin to ${enable}`);
  } catch (err) {
    console.error('[STARTUP ERROR]', err);
  }
});

ipcMain.on('set-background-mode', (event, enable) => {
  backgroundMode = enable;
  console.log(`[SETTINGS] Set backgroundMode to ${enable}`);
});

ipcMain.on('open-folder', (event, folderName) => {
  let targetPath = GAME_ROOT;
  if (folderName) {
    targetPath = path.join(GAME_ROOT, folderName);
  }
  if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
  shell.openPath(targetPath);
});

ipcMain.on('show-item', (event, fullPath) => {
  if (fs.existsSync(fullPath)) {
    shell.showItemInFolder(fullPath);
  }
});

ipcMain.on('open-external-url', (event, url) => {
  shell.openExternal(url);
});

function encodeVarInt(value) {
  const buffer = [];
  while (true) {
    if ((value & ~0x7F) === 0) {
      buffer.push(value);
      break;
    } else {
      buffer.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
  }
  return Buffer.from(buffer);
}

function readVarInt(buffer, offset = 0) {
  let value = 0;
  let length = 0;
  let currentByte;
  while (true) {
    if (offset + length >= buffer.length) return null;
    currentByte = buffer[offset + length];
    value |= (currentByte & 0x7F) << (length * 7);
    length++;
    if ((currentByte & 0x80) !== 0x80) break;
  }
  return { value, length };
}

function pingMinecraftSingle(host = 'eldersea.tekao.fr', port = 25565, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new nodeNet.Socket();
    let fullBuffer = Buffer.alloc(0);
    let resolved = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const hostBuf = Buffer.from(host, 'utf8');
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port);

      // Minecraft 1.20.1 handshake (id 0x00, protocol 763, host, port, nextState 1)
      const handshakePayload = Buffer.concat([
        encodeVarInt(0x00),
        encodeVarInt(763),
        encodeVarInt(hostBuf.length),
        hostBuf,
        portBuf,
        encodeVarInt(1)
      ]);
      const handshakePacket = Buffer.concat([
        encodeVarInt(handshakePayload.length),
        handshakePayload
      ]);

      // Status Request (packet id 0x00)
      const statusPacket = Buffer.concat([
        encodeVarInt(1),
        encodeVarInt(0x00)
      ]);

      socket.write(handshakePacket);
      socket.write(statusPacket);
    });

    socket.on('data', (chunk) => {
      fullBuffer = Buffer.concat([fullBuffer, chunk]);
      try {
        let offset = 0;
        const packetLen = readVarInt(fullBuffer, offset);
        if (!packetLen) return;
        offset += packetLen.length;

        if (fullBuffer.length < offset + packetLen.value) return;

        const packetId = readVarInt(fullBuffer, offset);
        if (!packetId) return;
        offset += packetId.length;

        const strLen = readVarInt(fullBuffer, offset);
        if (!strLen) return;
        offset += strLen.length;

        const jsonStr = fullBuffer.toString('utf8', offset, offset + strLen.value);
        const data = JSON.parse(jsonStr);

        resolved = true;
        cleanup();
        resolve(data);
      } catch (e) {}
    });

    socket.on('error', () => {
      if (!resolved) { resolved = true; cleanup(); resolve(null); }
    });

    socket.on('timeout', () => {
      if (!resolved) { resolved = true; cleanup(); resolve(null); }
    });
  });
}

async function pingMinecraftDirect(host = 'eldersea.tekao.fr', port = 25565) {
  const result = await pingMinecraftSingle(host, port, 2000);
  if (!result || !result.players) return null;

  return {
    online: true,
    players: typeof result.players.online === 'number' ? result.players.online : 0,
    maxPlayers: typeof result.players.max === 'number' ? result.players.max : 200
  };
}

function fetchJsonUrl(url, headers = {}, timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: timeoutMs }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP timeout'));
    });
  });
}

ipcMain.handle('get-server-status', async () => {
  // 1. Direct Minecraft SLP Ping via native TCP socket (~50ms, 0s cache, exact player count)
  try {
    const directResult = await pingMinecraftDirect('eldersea.tekao.fr', 25565);
    if (directResult && directResult.online) {
      return directResult;
    }
  } catch (err) {
    console.warn('[STATUS] Direct TCP ping failed, falling back to HTTP APIs...', err.message);
  }

  // 2. Fallback: mcstatus.io (rapide 2s, sans sample bloqué)
  try {
    const json = await fetchJsonUrl('https://api.mcstatus.io/v2/status/java/eldersea.tekao.fr', {}, 2000);
    if (json && typeof json.online === 'boolean') {
      return {
        online: json.online,
        players: json.players?.online ?? 0,
        maxPlayers: json.players?.max ?? 0
      };
    }
  } catch (err) {}

  // 3. Fallback: mcsrvstat.us
  try {
    const json = await fetchJsonUrl('https://api.mcsrvstat.us/3/eldersea.tekao.fr', { 'User-Agent': 'ElderSea-Launcher/1.0' }, 2000);
    if (json && typeof json.online === 'boolean') {
      return {
        online: json.online,
        players: json.players?.online ?? 0,
        maxPlayers: json.players?.max ?? 0
      };
    }
  } catch (err) {}

  return { online: false, players: 0, maxPlayers: 0 };
});

ipcMain.handle('verify-files', async () => {
  try {
    await syncHTTP(GAME_ROOT, true);
    return { success: true };
  } catch (err) {
    console.error('[INTEGRITY ERROR]', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('check-mojang', async (event, pseudo) => {
  return new Promise((resolve) => {
    https.get(`https://api.mojang.com/users/profiles/minecraft/${pseudo}`, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
});

ipcMain.handle('upload-image-to-web', async (event, { base64Data, filename, mimeType }) => {
  try {
    if (!base64Data) {
      return { success: false, error: "Aucune donnée de fichier." };
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Contrôle de taille maximale : 10 Mo
    if (buffer.length > 10 * 1024 * 1024) {
      return { success: false, error: "Le fichier dépasse la taille maximale autorisée (10 Mo)." };
    }

    // 2. Contrôle strict de l'extension
    const ext = path.extname(filename || '').toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
      return { success: false, error: "Extension non autorisée. Seules les images PNG, JPG, GIF et WEBP sont acceptées." };
    }

    // 3. Contrôle strict des Magic Bytes (signatures binaires) - Empêche l'injection de scripts/PHP/malwares
    const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isGif = buffer.length > 4 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    const isWebp = buffer.length > 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP';

    if (!isPng && !isJpg && !isGif && !isWebp) {
      return { success: false, error: "Signature de fichier invalide : Seules les véritables images sont acceptées. Aucune injection n'est permise." };
    }

    // 4. Envoi sécurisé au serveur ElderSea
    const sanitizedName = path.basename(filename || 'image.png');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch('https://eldersea.tekao.fr/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ base64Data, filename: sanitizedName }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const data = await res.json();
    if (data.success && data.url) {
      return { success: true, url: data.url };
    }
    throw new Error(data.error || "Erreur de téléversement sur le serveur ElderSea");
  } catch (err) {
    console.error('[SECURE UPLOAD ERROR]', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-mods', async () => {
  try {
    const modsDir = path.join(GAME_ROOT, 'mods');
    if (!fs.existsSync(modsDir)) return [];
    return fs.readdirSync(modsDir).filter(f => f.endsWith('.jar')).map(f => ({ name: f }));
  } catch (e) { return []; }
});

ipcMain.handle('get-screenshots', async () => {
  try {
    const screenshotDir = path.join(GAME_ROOT, 'screenshots');
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
    const timeout = setTimeout(() => {
      request.abort();
      reject(new Error("Timeout pendant le téléchargement"));
    }, 45000);
    request.on('response', (response) => {
      clearTimeout(timeout);
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
        clearTimeout(timeout);
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

async function limitConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

async function syncHTTP(gameRoot, isVerificationOnly = false) {
  const baseUrl = "https://eldersea.tekao.fr/launcher/";
  
  async function fetchList(dirUrl) {
      return new Promise((resolve, reject) => {
          const req = net.request({ url: dirUrl, redirect: 'follow' });
          const timeout = setTimeout(() => {
              req.abort();
              reject(new Error("Timeout pendant la récupération de la liste des fichiers"));
          }, 10000);
          req.on('response', (res) => {
              clearTimeout(timeout);
              if (res.statusCode !== 200) {
                  return resolve(""); 
              }
              let data = '';
              res.on('data', chunk => data += chunk.toString());
              res.on('end', () => resolve(data));
          });
          req.on('error', (err) => {
              clearTimeout(timeout);
              reject(err);
          });
          req.end();
      });
  }

  async function checkNeedsDownload(url, dest) {
      if (!fs.existsSync(dest)) return true;
      return new Promise((resolve) => {
          const req = net.request({ method: 'HEAD', url: url, redirect: 'follow' });
          const timeout = setTimeout(() => {
              req.abort();
              console.warn(`[SYNC] HEAD timeout pour ${url}, utilisation du fichier local.`);
              resolve(false);
          }, 4000);
          req.on('response', (res) => {
              clearTimeout(timeout);
              if (res.statusCode === 200) {
                  const remoteSize = parseInt(res.headers['content-length'] || '0', 10);
                  const localSize = fs.statSync(dest).size;
                  resolve(remoteSize > 0 && remoteSize !== localSize);
              } else {
                  console.warn(`[SYNC] HEAD statut ${res.statusCode} pour ${url}, utilisation du fichier local.`);
                  resolve(false);
              }
          });
          req.on('error', (err) => {
              clearTimeout(timeout);
              console.warn(`[SYNC] HEAD erreur pour ${url}: ${err.message}, utilisation du fichier local.`);
              resolve(false);
          });
          req.end();
      });
  }

  const filesToSync = [];
  const dirsToCreate = new Set();

  async function collectFiles(remoteDir, localDir) {
      dirsToCreate.add(localDir);
      const html = await fetchList(remoteDir);
      if (!html) return;
      
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/ig;
      let match;
      const items = [];
      while ((match = linkRegex.exec(html)) !== null) {
          let name = match[2];
          if (name.startsWith('?') || name.startsWith('/') || name === '../' || name.includes('..') || name.startsWith('http')) continue;
          items.push(name);
      }

      const isModsDir = localDir.endsWith('mods') || localDir.endsWith('mods\\') || localDir.endsWith('mods/');
      
      if (isModsDir && fs.existsSync(localDir)) {
          const localFiles = fs.readdirSync(localDir);
          for (const localFile of localFiles) {
              if (localFile.endsWith('.jar')) {
                  const serverHasMod = items.some(i => {
                      const decoded = decodeURIComponent(i.endsWith('/') ? i.slice(0, -1) : i);
                      return decoded === localFile;
                  });
                  if (!serverHasMod) {
                      try {
                          fs.unlinkSync(path.join(localDir, localFile)); 
                          console.log(`[SYNC] Suppression du mod local (non présent sur le serveur): ${localFile}`); 
                      } catch (e) {
                          console.warn(`[SYNC] Échec de la suppression du mod local ${localFile}:`, e);
                      }
                  }
              }
          }
      }

      const subDirTasks = [];
      for (const item of items) {
          const itemUrl = remoteDir + item;
          const decodedName = decodeURIComponent(item.endsWith('/') ? item.slice(0, -1) : item);
          const localFile = path.join(localDir, decodedName);

          if (decodedName.toLowerCase() === '.htaccess') continue;

          if (item.endsWith('/')) {
              subDirTasks.push(collectFiles(itemUrl, localFile));
          } else {
              filesToSync.push({
                  url: itemUrl,
                  dest: localFile,
                  isLibrary: localFile.includes('libraries') || localFile.includes('versions')
              });
          }
      }
      if (subDirTasks.length > 0) {
          await Promise.all(subDirTasks);
      }
  }

  try {
      console.log("[SYNC] Début de la collecte des fichiers...");
      await collectFiles(baseUrl, gameRoot);
      console.log(`[SYNC] Collecte terminée. ${filesToSync.length} fichiers trouvés.`);

      // Création des répertoires nécessaires
      for (const dir of dirsToCreate) {
          if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
          }
      }

      let completedTasks = 0;
      const totalTasks = filesToSync.length;

      const sendSyncProgress = (filename) => {
          completedTasks++;
          if (mainWindow && !mainWindow.isDestroyed()) {
              if (!isVerificationOnly) {
                  mainWindow.webContents.send('launch-progress', {
                      type: 'Vérification & Téléchargement...',
                      task: completedTasks,
                      total: totalTasks,
                      filename: filename
                  });
              }
              mainWindow.webContents.send('verify-progress', {
                  completed: completedTasks,
                  total: totalTasks,
                  filename: filename
              });
          }
      };

      // Création des tâches de vérification et de téléchargement
      const tasks = filesToSync.map(file => async () => {
          try {
              let needsDl = false;
              if (!fs.existsSync(file.dest)) {
                  needsDl = true;
              } else if (!file.isLibrary) {
                  needsDl = await checkNeedsDownload(file.url, file.dest);
              }

              if (needsDl) {
                  console.log(`[SYNC] Téléchargement: ${file.url}`);
                  await downloadFile(file.url, file.dest);
              }
          } finally {
              const relativePath = path.relative(gameRoot, file.dest).replace(/\\/g, '/');
              sendSyncProgress(relativePath);
          }
      });

      // Exécuter les tâches en parallèle avec une concurrence de 10
      await limitConcurrency(tasks, 10);
      console.log("[SYNC] Synchronisation terminée avec succès.");

  } catch (err) {
      console.error("[HTTP SYNC ERROR]", err.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
          if (!isVerificationOnly) {
              mainWindow.webContents.send('launch-error', "Erreur de connexion au serveur de fichiers (HTTP) : " + err.message);
          }
      }
      throw err;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mods-updated');
  }
}

function getJavaPath() {
  if (process.platform !== 'win32') {
    return 'java';
  }

  const defaultPath = "C:\\Program Files\\Java\\jdk-17\\bin\\javaw.exe";
  if (fs.existsSync(defaultPath)) return defaultPath;

  const adoptiumDir = "C:\\Program Files\\Eclipse Adoptium";
  if (fs.existsSync(adoptiumDir)) {
    try {
      const dirs = fs.readdirSync(adoptiumDir);
      const jdk17Dir = dirs.find(d => d.startsWith('jdk-17'));
      if (jdk17Dir) {
        const p = path.join(adoptiumDir, jdk17Dir, 'bin', 'javaw.exe');
        if (fs.existsSync(p)) return p;
      }
    } catch (e) {}
  }

  const javaDir = "C:\\Program Files\\Java";
  if (fs.existsSync(javaDir)) {
    try {
      const dirs = fs.readdirSync(javaDir);
      const jdk17Dir = dirs.find(d => d.startsWith('jdk-17') || d.startsWith('jre-17'));
      if (jdk17Dir) {
        const p = path.join(javaDir, jdk17Dir, 'bin', 'javaw.exe');
        if (fs.existsSync(p)) return p;
      }
    } catch (e) {}
  }

  const localAppData = process.env.LOCALAPPDATA || '';
  const officialMcJava = path.join(localAppData, 'Packages', 'Microsoft.4294827C24A01_8wekyb3d8bbwe', 'LocalCache', 'Local', 'runtime', 'java-runtime-gamma', 'windows-x64', 'java-runtime-gamma', 'bin', 'javaw.exe');
  if (fs.existsSync(officialMcJava)) return officialMcJava;

  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const officialMcJavaStandalone = path.join(programFiles, 'Minecraft Launcher', 'runtime', 'java-runtime-gamma', 'windows-x64', 'java-runtime-gamma', 'bin', 'javaw.exe');
  if (fs.existsSync(officialMcJavaStandalone)) return officialMcJavaStandalone;

  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const officialMcJavaStandaloneX86 = path.join(programFilesX86, 'Minecraft Launcher', 'runtime', 'java-runtime-gamma', 'windows-x64', 'java-runtime-gamma', 'bin', 'javaw.exe');
  if (fs.existsSync(officialMcJavaStandaloneX86)) return officialMcJavaStandaloneX86;

  return "javaw";
}

async function setupPortableJava(gameRoot) {
  const javaFolder = path.join(gameRoot, 'runtime', 'java-17');
  
  // Fonction récursive pour chercher javaw.exe
  const findJavaw = (dir) => {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) {
        const res = findJavaw(fp);
        if (res) return res;
      } else if (f.toLowerCase() === 'javaw.exe') {
        return fp;
      }
    }
    return null;
  };

  const existingJavaw = findJavaw(javaFolder);
  if (existingJavaw) {
    return existingJavaw;
  }

  console.log("[JAVA] Aucun Java 17 trouvé. Téléchargement d'un JRE portable...");
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('launch-progress', { type: 'Téléchargement Java 17 (obligatoire)...', task: 5, total: 100 });
  }

  const runtimeDir = path.join(gameRoot, 'runtime');
  if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true });

  const zipPath = path.join(runtimeDir, 'java-17.zip');
  const downloadUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jre_x64_windows_hotspot_17.0.10_7.zip";

  await downloadFile(downloadUrl, zipPath);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('launch-progress', { type: 'Extraction de Java...', task: 15, total: 100 });
  }

  return new Promise((resolve, reject) => {
    const cmd = `powershell -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${javaFolder.replace(/'/g, "''")}' -Force"`;
    exec(cmd, (err) => {
      try { fs.unlinkSync(zipPath); } catch (e) {}

      if (err) {
        console.error("[JAVA EXTRACTION ERROR]", err);
        reject(err);
      } else {
        const foundPath = findJavaw(javaFolder);
        if (foundPath) {
          console.log("[JAVA] Java portable installé avec succès :", foundPath);
          resolve(foundPath);
        } else {
          reject(new Error("javaw.exe introuvable après extraction"));
        }
      }
    });
  });
}

function createTray() {
  if (tray && !tray.isDestroyed()) return;

  const iconPath = getIconPath();
  try {
    tray = new Tray(iconPath);
    tray.setToolTip('ElderSea RPG');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Afficher le launcher',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quitter',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    tray.on('double-click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    console.log('[TRAY] System tray created successfully');
  } catch (err) {
    console.error('[TRAY ERROR]', err);
  }
}

ipcMain.on('launch-game', async (event, { pseudo, ram }) => {
  if (isGameRunning) return;
  isGameRunning = true;
  mainWindow.webContents.send('game-status', true);

  if (showConsole) {
    createConsoleWindow();
  } else {
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      consoleWindow.close();
    }
  }

  logBuffer = [];
  appendToLogBuffer("[MCLC] Début du lancement d'ElderSea...");

  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.webContents.send('game-status', 'running');
  }

  setDiscordActivity('Préparation du jeu...', 'Vérification des ressources', Date.now());

  try {
    if (!fs.existsSync(GAME_ROOT)) fs.mkdirSync(GAME_ROOT, { recursive: true });

    // Détection et installation de Java portable si manquant
    let javaExecutable = getJavaPath();
    if (javaExecutable === "javaw" && process.platform === 'win32') {
      try {
        javaExecutable = await setupPortableJava(GAME_ROOT);
      } catch (err) {
        console.error("[JAVA DOWNLOAD FAIL]", err);
        appendToLogBuffer(`[WARN] Échec de la configuration Java: ${err.message}`);
        javaExecutable = "javaw";
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('launch-progress', { type: 'Chargement Forge...', task: 20, total: 100 });
    }
    appendToLogBuffer("[MCLC] Chargement de Forge...");
    try {
      await syncHTTP(GAME_ROOT);
    } catch (err) {
      console.warn("[SYNC WARNING] Échec de la synchronisation avec le serveur, utilisation des fichiers existants:", err.message);
      appendToLogBuffer(`[WARN] Échec de la synchronisation : ${err.message}`);
      appendToLogBuffer("[WARN] Démarrage du jeu en mode hors-ligne avec les fichiers existants...");
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('launch-progress', { type: 'Décollage...', task: 80, total: 100 });
    }
    appendToLogBuffer("[MCLC] Décollage imminent...");

    // Pour Forge 1.20.1, on utilise l'ID de version forge correspondant
    const forgeVersion = "1.20.1-forge-47.4.20"; 
    const criticalFiles = [
      path.join(GAME_ROOT, "libraries/net/minecraft/client/1.20.1-20230612.114412/client-1.20.1-20230612.114412-srg.jar"),
      path.join(GAME_ROOT, "libraries/net/minecraft/client/1.20.1-20230612.114412/client-1.20.1-20230612.114412-extra.jar"),
      path.join(GAME_ROOT, "libraries/net/minecraftforge/forge/1.20.1-47.4.20/forge-1.20.1-47.4.20-client.jar")
    ];
    criticalFiles.forEach(f => {
      console.log(`[DEBUG] Checking ${f}: ${fs.existsSync(f) ? 'EXISTS' : 'MISSING'}`);
      if (fs.existsSync(f)) {
        console.log(`[DEBUG] Size: ${fs.statSync(f).size} bytes`);
        appendToLogBuffer(`[MCLC] Fichier critique valide: ${path.basename(f)}`);
      } else {
        appendToLogBuffer(`[WARN] Fichier critique manquant: ${path.basename(f)}`);
      }
    });

    const authMethod = {
      access_token: "0", client_token: "0", uuid: "00000000-0000-0000-0000-000000000000",
      name: pseudo || "Joueur", user_properties: "{}"
    };
    
    const libsDir = path.join(GAME_ROOT, 'libraries');
    const cpSep = process.platform === 'win32' ? ';' : ':';
    
    // Forge 1.20.1 module path construction
    const modulePath = [
      path.join(libsDir, 'cpw/mods/bootstraplauncher/1.1.2/bootstraplauncher-1.1.2.jar'),
      path.join(libsDir, 'cpw/mods/securejarhandler/2.1.10/securejarhandler-2.1.10.jar'),
      path.join(libsDir, 'org/ow2/asm/asm-commons/9.9.1/asm-commons-9.9.1.jar'),
      path.join(libsDir, 'org/ow2/asm/asm-util/9.9.1/asm-util-9.9.1.jar'),
      path.join(libsDir, 'org/ow2/asm/asm-analysis/9.9.1/asm-analysis-9.9.1.jar'),
      path.join(libsDir, 'org/ow2/asm/asm-tree/9.9.1/asm-tree-9.9.1.jar'),
      path.join(libsDir, 'org/ow2/asm/asm/9.9.1/asm-9.9.1.jar'),
      path.join(libsDir, 'net/minecraftforge/JarJarFileSystems/0.3.19/JarJarFileSystems-0.3.19.jar')
    ].join(cpSep);

    let opts = {
      authorization: authMethod,
      root: GAME_ROOT,
      version: { number: "1.20.1", type: "release", custom: "1.20.1-forge-47.4.20" },
      memory: { max: `${ram}G`, min: "2G" },
      window: { title: "ElderSea RPG 1.20.1", width: 1280, height: 720 },
      javaPath: javaExecutable,
      customArgs: [
        "-XX:-ShowMessageBoxOnError",
        "-DlibraryDirectory=" + libsDir,
        "-DignoreList=bootstraplauncher,securejarhandler,asm-commons,asm-util,asm-analysis,asm-tree,asm,JarJarFileSystems,client-extra,fmlcore,javafmllanguage,lowcodelanguage,mclanguage,forge-,1.20.1-forge-47.4.20.jar",
        "-DmergeModules=jna-5.10.0.jar,jna-platform-5.10.0.jar",
        "-p", modulePath,
        "--add-modules", "ALL-MODULE-PATH",
        "--add-opens", "java.base/java.util.jar=cpw.mods.securejarhandler",
        "--add-opens", "java.base/java.lang.invoke=cpw.mods.securejarhandler",
        "--add-opens", "java.base/java.lang=ALL-UNNAMED",
        "--add-opens", "java.base/java.util=ALL-UNNAMED",
        "--add-opens", "java.base/java.net=ALL-UNNAMED",
        "--add-opens", "java.base/java.nio.file=ALL-UNNAMED",
        "--add-exports", "java.base/sun.security.util=cpw.mods.securejarhandler",
        "--add-exports", "jdk.naming.dns/com.sun.jndi.dns=java.naming"
      ]
    };

    function getRecentCrashDetails(logsList = []) {
      let logsText = logsList.slice(-150).join('\n');
      let crashReport = null;
      let crashReportPath = null;

      const crashReportsDir = path.join(GAME_ROOT, 'crash-reports');
      try {
        if (fs.existsSync(crashReportsDir)) {
          const files = fs.readdirSync(crashReportsDir)
            .filter(f => f.startsWith('crash-') && f.endsWith('.txt'))
            .map(f => {
              const filePath = path.join(crashReportsDir, f);
              const stat = fs.statSync(filePath);
              return { name: f, path: filePath, mtime: stat.mtimeMs };
            })
            .sort((a, b) => b.mtime - a.mtime);

          if (files.length > 0 && (Date.now() - files[0].mtime) < 300000) { // 5 minutes
            crashReport = fs.readFileSync(files[0].path, 'utf8');
            crashReportPath = files[0].path;
          }
        }
      } catch (err) {
        console.error("Error reading crash reports:", err);
      }

      if (logsText.length < 300) {
        const latestLogPath = path.join(GAME_ROOT, 'logs', 'latest.log');
        try {
          if (fs.existsSync(latestLogPath)) {
            const fullLog = fs.readFileSync(latestLogPath, 'utf8');
            const lines = fullLog.split('\n');
            logsText = lines.slice(-100).join('\n');
          }
        } catch (err) {}
      }

      return { logs: logsText, crashReport, crashReportPath };
    }
    
    let gameStarted = false;
    let jvmLogs = [];
    launcher.on('data', (e) => {
        console.log("[JVM]", e);
        jvmLogs.push(e);
        if (jvmLogs.length > 200) jvmLogs.shift();
        
        appendToLogBuffer(e);
        
        if (!gameStarted) {
            gameStarted = true;
            setDiscordActivity('En jeu', `Joueur : ${pseudo || 'Joueur'}`, Date.now(), true);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('hide-progress');
              if (backgroundMode) {
                mainWindow.hide();
                createTray();
              }
            }
            patchMinecraftAssetIcons();
            applyMinecraftWindowIcon();
            triggerDeliverPendingPurchases(pseudo);
        }
    });

    launcher.on('debug', (e) => {
      console.log("[DEBUG]", e);
      appendToLogBuffer(`[DEBUG] ${e}`);
    });
    
    launcher.on('error', (e) => {
        console.error("[MCLC ERROR]", e);
        appendToLogBuffer(`[ERROR] ${e}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            const crashDetails = getRecentCrashDetails(jvmLogs);
            const crashPayload = {
              code: 'ERR_MCLC',
              title: "Erreur de lancement Minecraft",
              message: e.toString(),
              logs: crashDetails.logs ? `${e.toString()}\n\n--- Derniers logs console ---\n${crashDetails.logs}` : e.toString(),
              crashReport: crashDetails.crashReport,
              crashReportPath: crashDetails.crashReportPath
            };
            mainWindow.webContents.send('game-crashed', crashPayload);
            mainWindow.webContents.send('launch-error', crashPayload);
        }
    });
    
    let globalMclcProgress = { type: 'Fichiers de jeu...', task: 0, total: 100 };

    launcher.on('progress', (e) => {
      globalMclcProgress = {
        type: e.type === 'assets' ? 'Ressources graphiques...' : e.type === 'natives' ? 'Bibliothèques système...' : 'Fichiers de jeu...',
        task: e.task,
        total: e.total
      };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-progress', {
          ...globalMclcProgress,
          filename: null
        });
      }
      appendToLogBuffer(`[MCLC] Progression: ${e.type} (${e.task}/${e.total})`);
    });
    
    launcher.on('download-status', (e) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('launch-progress', {
                ...globalMclcProgress,
                fileCurrent: e.current,
                fileTotal: e.total,
                filename: e.name
            });
        }
        appendToLogBuffer(`[DL] ${e.type}: ${e.name} (${e.current}/${e.total})`);
    });
    
    launcher.on('close', (code) => {
        isGameRunning = false;
        setDiscordActivity('Dans le launcher', 'Prêt à naviguer');

        if (consoleWindow && !consoleWindow.isDestroyed()) {
          consoleWindow.webContents.send('game-status', code !== 0 && code !== null ? 'crashed' : 'idle');
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('game-status', false);
            mainWindow.webContents.send('launch-finished');
            
            // Restore launcher window
            mainWindow.show();
            mainWindow.focus();

            // Destroy system tray icon
            if (tray) {
              tray.destroy();
              tray = null;
            }
            
            if (code !== 0 && code !== null) {
                const crashDetails = getRecentCrashDetails(jvmLogs);
                const crashPayload = {
                  code,
                  title: `Le jeu a planté (Code de sortie: ${code})`,
                  message: `Le jeu s'est arrêté inopinément avec le code de sortie ${code}.`,
                  logs: crashDetails.logs || jvmLogs.join('\n'),
                  crashReport: crashDetails.crashReport,
                  crashReportPath: crashDetails.crashReportPath
                };
                mainWindow.webContents.send('game-crashed', crashPayload);
                mainWindow.webContents.send('launch-error', crashPayload);
                appendToLogBuffer(`[FATAL] Le jeu a planté avec le code de sortie: ${code}`);
            } else {
                appendToLogBuffer(`[MCLC] Le jeu s'est arrêté normalement.`);
            }
        }
    });

    console.log("[FORGE] Lancement du moteur...");
    appendToLogBuffer("[MCLC] Lancement final du moteur Minecraft...");
    patchMinecraftAssetIcons();
    applyMinecraftWindowIcon();
    await launcher.launch(opts);
    
  } catch (error) {
    isGameRunning = false;
    setDiscordActivity('Dans le launcher', 'Prêt à naviguer');

    if (consoleWindow && !consoleWindow.isDestroyed()) {
      consoleWindow.webContents.send('game-status', 'crashed');
    }

    appendToLogBuffer(`[FATAL] Erreur critique de lancement: ${error.message}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game-status', false);
        console.error("[FATAL ERROR]", error);
        const crashPayload = {
          code: 'ERR_FATAL',
          title: "Erreur critique de lancement",
          message: error.message || error.toString(),
          logs: error.stack || error.toString(),
          crashReport: null
        };
        mainWindow.webContents.send('game-crashed', crashPayload);
        mainWindow.webContents.send('launch-error', crashPayload);
    }
  }
});

// Configuration de l'autoUpdater avec envoi du statut au Renderer React
autoUpdater.on('checking-for-update', () => {
  console.log('[UPDATER] Recherche de mise à jour...');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'checking' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('[UPDATER] Nouvelle mise à jour trouvée:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'available', version: info.version });
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('[UPDATER] Aucune mise à jour disponible.');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'not-available' });
  }
});

autoUpdater.on('error', (err) => {
  console.error('[UPDATER ERROR]', err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'error', message: err.message || err.toString() });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { 
      status: 'downloading', 
      percent: Math.round(progressObj.percent)
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[UPDATER] Mise à jour téléchargée:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'downloaded', version: info.version });
  }
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

function getPhysicalIconPath() {
  const targetDir = GAME_ROOT;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetPath = path.join(targetDir, 'eldersea_app_icon.png');
  try {
    const src = getIconPath();
    if (fs.existsSync(src)) {
      const data = fs.readFileSync(src);
      fs.writeFileSync(targetPath, data);
      return targetPath;
    }
  } catch (err) {
    console.warn('[ICON] Erreur extraction physical icon:', err.message);
  }
  return targetPath;
}

function triggerDeliverPendingPurchases(pseudo) {
  if (!pseudo) return;
  const postData = JSON.stringify({ pseudo });
  const candidates = [
    'https://eldersea.tekao.fr/api/shop/deliver-pending',
    'https://eldersea.tekao.fr/shop/deliver-pending'
  ];
  for (const urlStr of candidates) {
    try {
      const parsed = new URL(urlStr);
      const req = https.request({
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 4000
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`[SHOP] Achats en attente livrés avec succès pour ${pseudo}`);
          }
        });
      });
      req.on('error', () => {});
      req.on('timeout', () => { try { req.destroy(); } catch (e) {} });
      req.write(postData);
      req.end();
      break;
    } catch (e) {}
  }
}

function patchMinecraftAssetIcons() {
  try {
    const physicalIcon = getPhysicalIconPath();
    if (!fs.existsSync(physicalIcon)) return;

    const baseBuf = fs.readFileSync(physicalIcon);
    const baseIcon = nativeImage.createFromBuffer(baseBuf);
    if (baseIcon.isEmpty()) return;

    const indexesDir = path.join(GAME_ROOT, 'assets', 'indexes');
    const objectsDir = path.join(GAME_ROOT, 'assets', 'objects');
    if (!fs.existsSync(indexesDir) || !fs.existsSync(objectsDir)) return;

    const indexFiles = fs.readdirSync(indexesDir).filter(f => f.endsWith('.json'));
    for (const file of indexFiles) {
      try {
        const indexPath = path.join(indexesDir, file);
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        if (!indexData || !indexData.objects) continue;

        for (const [key, val] of Object.entries(indexData.objects)) {
          if (typeof key === 'string' && key.includes('icon_') && key.endsWith('.png') && val && val.hash) {
            const match = key.match(/(\d+)x(\d+)/);
            const size = match ? parseInt(match[1], 10) : 32;
            const targetSize = Math.max(16, Math.min(size, 256));

            const resizedBuf = baseIcon.resize({ width: targetSize, height: targetSize }).toPNG();
            const hashPrefix = val.hash.slice(0, 2);
            const targetDir = path.join(objectsDir, hashPrefix);
            const targetFile = path.join(targetDir, val.hash);

            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            fs.writeFileSync(targetFile, resizedBuf);
          }
        }
        console.log(`[ICON PATCH] Icônes d'assets Minecraft patchées avec succès (${file})`);
      } catch (err) {
        console.warn(`[ICON PATCH] Erreur lors du patch de l'index ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[ICON PATCH ERROR]', err);
  }
}

function applyMinecraftWindowIcon() {
  if (process.platform !== 'win32') return;

  const physicalIcon = getPhysicalIconPath();
  if (!fs.existsSync(physicalIcon)) return;

  patchMinecraftAssetIcons();

  const scriptPath = path.join(GAME_ROOT, 'apply-icon.ps1');
  const escapedIconPath = physicalIcon.replace(/'/g, "''");

  const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class Win32IconHelper {
    public const uint WM_SETICON = 0x0080;
    public const int ICON_SMALL = 0;
    public const int ICON_BIG = 1;
    public const int GCLP_HICON = -14;
    public const int GCLP_HICONSM = -34;

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", EntryPoint = "SetClassLongPtr")]
    private static extern IntPtr SetClassLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

    [DllImport("user32.dll", EntryPoint = "SetClassLong")]
    private static extern IntPtr SetClassLong32(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

    public static IntPtr SetClassLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong) {
        if (IntPtr.Size == 8)
            return SetClassLongPtr64(hWnd, nIndex, dwNewLong);
        else
            return SetClassLong32(hWnd, nIndex, dwNewLong);
    }

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern bool SetWindowText(IntPtr hWnd, string lpString);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    public static IntPtr[] FindMatchingWindows(uint[] pids) {
        var list = new List<IntPtr>();
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);
            
            bool pidMatch = false;
            if (pids != null) {
                for (int i = 0; i < pids.Length; i++) {
                    if (pids[i] == pid) {
                        pidMatch = true;
                        break;
                    }
                }
            }
            
            StringBuilder sb = new StringBuilder(512);
            GetWindowText(hWnd, sb, 512);
            string title = sb.ToString();

            StringBuilder cb = new StringBuilder(256);
            GetClassName(hWnd, cb, 256);
            string className = cb.ToString();

            if (pidMatch) {
                list.Add(hWnd);
            } else if (className == "GLFW30" || className == "SunAwtFrame") {
                list.Add(hWnd);
            } else if (!string.IsNullOrEmpty(title)) {
                if (title.IndexOf("Minecraft", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("ElderSea", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("Forge", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    title.IndexOf("FML", StringComparison.OrdinalIgnoreCase) >= 0) {
                    list.Add(hWnd);
                }
            }
            return true;
        }, IntPtr.Zero);
        return list.ToArray();
    }
}
"@
Add-Type -AssemblyName System.Drawing

$iconPath = '${escapedIconPath}'
if (-not (Test-Path $iconPath)) { exit }

try {
    $bmp = [System.Drawing.Bitmap]::FromFile($iconPath)
    $bmpSmall = New-Object System.Drawing.Bitmap($bmp, 32, 32)
    $bmpBig = New-Object System.Drawing.Bitmap($bmp, 128, 128)
    $hIconSmall = $bmpSmall.GetHicon()
    $hIconBig = $bmpBig.GetHicon()

    $consecutiveNoProcess = 0
    while ($consecutiveNoProcess -lt 15) {
        $procs = Get-CimInstance Win32_Process -Filter "Name = 'javaw.exe' or Name = 'java.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*.eldersea*' -or $_.CommandLine -like '*forge*' -or $_.CommandLine -like '*1.20.1*' }
        
        if (-not $procs) {
            $consecutiveNoProcess++
            Start-Sleep -Milliseconds 1500
            continue
        }
        $consecutiveNoProcess = 0
        $pids = [uint32[]]@($procs | ForEach-Object { [uint32]$_.ProcessId })

        $windows = [Win32IconHelper]::FindMatchingWindows($pids)
        if ($windows.Length -gt 0) {
            foreach ($hwnd in $windows) {
                [Win32IconHelper]::SendMessage($hwnd, [Win32IconHelper]::WM_SETICON, [Win32IconHelper]::ICON_SMALL, $hIconSmall)
                [Win32IconHelper]::SendMessage($hwnd, [Win32IconHelper]::WM_SETICON, [Win32IconHelper]::ICON_BIG, $hIconBig)
                [Win32IconHelper]::SetClassLongPtr($hwnd, [Win32IconHelper]::GCLP_HICON, $hIconBig)
                [Win32IconHelper]::SetClassLongPtr($hwnd, [Win32IconHelper]::GCLP_HICONSM, $hIconSmall)
                [Win32IconHelper]::SetWindowText($hwnd, "ElderSea RPG 1.20.1")
                [Win32IconHelper]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, 0, 0, 0x0027)
            }
        }
        Start-Sleep -Milliseconds 1500
    }
} catch {
    # Ignore errors
} finally {
    Remove-Item $MyInvocation.MyCommand.Path -ErrorAction SilentlyContinue
}
`;

  try {
    fs.writeFileSync(scriptPath, psScript, 'utf8');
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
    exec(cmd, (err) => {
      if (err) console.error('[ICON ERROR] Failed to run icon script:', err.message);
      else console.log('[ICON] Custom icon watcher completed successfully.');
    });
  } catch (err) {
    console.error('[ICON ERROR] Failed to write icon script:', err);
  }
}

// ── Friends & Chat System ──
const FRIENDS_DB_PATH = path.join(GAME_ROOT, 'friends_database.json');
const CLOUD_FRIENDS_URL = 'https://eldersea.tekao.fr/api/friends';

function getLocalFriendsData() {
  try {
    if (!fs.existsSync(FRIENDS_DB_PATH)) {
      const defaultState = { requests: [], friends: [], messages: [] };
      fs.writeFileSync(FRIENDS_DB_PATH, JSON.stringify(defaultState, null, 2), 'utf8');
      return defaultState;
    }
    const dataText = fs.readFileSync(FRIENDS_DB_PATH, 'utf8');
    const parsed = JSON.parse(dataText);
    if (!Array.isArray(parsed.requests)) parsed.requests = [];
    if (!Array.isArray(parsed.friends)) parsed.friends = [];
    if (!Array.isArray(parsed.messages)) parsed.messages = [];
    return parsed;
  } catch (e) {
    console.error('[FRIENDS DB LOCAL READ ERROR]', e);
    return { requests: [], friends: [], messages: [] };
  }
}

function saveLocalFriendsData(data) {
  try {
    const parentDir = path.dirname(FRIENDS_DB_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(FRIENDS_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[FRIENDS DB LOCAL WRITE ERROR]', e);
    return false;
  }
}

async function fetchCloudFriendsData() {
  const url = 'https://eldersea.tekao.fr/api/friends';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        if (!Array.isArray(data.requests)) data.requests = [];
        if (!Array.isArray(data.friends)) data.friends = [];
        if (!Array.isArray(data.messages)) data.messages = [];
        saveLocalFriendsData(data);
        return data;
      }
    } else {
      console.warn('[FRIENDS CLOUD FETCH] Réponse non-JSON ou non-OK:', res.status, ct);
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[FRIENDS CLOUD FETCH ERROR]', e.message);
  }

  return getLocalFriendsData();
}

async function pushCloudFriendsData(data) {
  saveLocalFriendsData(data);
  const url = 'https://eldersea.tekao.fr/api/friends';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      console.log('[FRIENDS CLOUD PUSH] Données synchronisées sur le serveur cloud.');
      return true;
    } else {
      console.warn('[FRIENDS CLOUD PUSH] Échec HTTP:', res.status);
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[FRIENDS CLOUD PUSH ERROR]', e.message);
  }
  return false;
}

ipcMain.handle('friends-get-data', async () => {
  return await fetchCloudFriendsData();
});

ipcMain.handle('friends-action', async (event, { action, fromUser, toUser }) => {
  const db = await fetchCloudFriendsData();
  const fromL = fromUser.toLowerCase();
  const toL = toUser.toLowerCase();

  if (action === 'send-request') {
    // Check if they are already friends
    const isFriend = db.friends.some(f => 
      (f.user1.toLowerCase() === fromL && f.user2.toLowerCase() === toL) ||
      (f.user1.toLowerCase() === toL && f.user2.toLowerCase() === fromL)
    );
    if (isFriend) return db;

    // Check if toUser already requested fromUser (mutual add)
    const reverseReqIndex = db.requests.findIndex(r => 
      r.from.toLowerCase() === toL && r.to.toLowerCase() === fromL
    );

    if (reverseReqIndex !== -1) {
      // Remove that request
      db.requests.splice(reverseReqIndex, 1);
      // Create friendship
      db.friends.push({
        user1: fromUser,
        user2: toUser,
        timestamp: Date.now()
      });
    } else {
      // Create standard outgoing request
      const exists = db.requests.some(r => 
        r.from.toLowerCase() === fromL && r.to.toLowerCase() === toL
      );
      if (!exists) {
        db.requests.push({
          from: fromUser,
          to: toUser,
          timestamp: Date.now()
        });
      }
    }
  }

  if (action === 'accept-request') {
    const reqIndex = db.requests.findIndex(r => {
      const rf = r.from.toLowerCase();
      const rt = r.to.toLowerCase();
      return (rf === fromL && rt === toL) || (rf === toL && rt === fromL);
    });
    if (reqIndex !== -1) {
      const matchedReq = db.requests[reqIndex];
      db.requests.splice(reqIndex, 1);
      // Add friendship if not exists
      const exists = db.friends.some(f => 
        (f.user1.toLowerCase() === fromL && f.user2.toLowerCase() === toL) ||
        (f.user1.toLowerCase() === toL && f.user2.toLowerCase() === fromL)
      );
      if (!exists) {
        db.friends.push({
          user1: matchedReq.to,
          user2: matchedReq.from,
          timestamp: Date.now()
        });
      }
    }
  }

  if (action === 'decline-request') {
    const reqIndex = db.requests.findIndex(r => {
      const rf = r.from.toLowerCase();
      const rt = r.to.toLowerCase();
      return (rf === fromL && rt === toL) || (rf === toL && rt === fromL);
    });
    if (reqIndex !== -1) {
      db.requests.splice(reqIndex, 1);
    }
  }

  if (action === 'cancel-request') {
    const reqIndex = db.requests.findIndex(r => {
      const rf = r.from.toLowerCase();
      const rt = r.to.toLowerCase();
      return (rf === fromL && rt === toL) || (rf === toL && rt === fromL);
    });
    if (reqIndex !== -1) {
      db.requests.splice(reqIndex, 1);
    }
  }

  if (action === 'delete-friend') {
    db.friends = db.friends.filter(f => {
      const u1L = f.user1.toLowerCase();
      const u2L = f.user2.toLowerCase();
      return !((u1L === fromL && u2L === toL) || (u1L === toL && u2L === fromL));
    });
  }

  await pushCloudFriendsData(db);
  return db;
});

ipcMain.handle('friends-send-message', async (event, { fromUser, toUser, text }) => {
  const db = await fetchCloudFriendsData();
  db.messages.push({
    from: fromUser,
    to: toUser,
    message: text,
    timestamp: Date.now()
  });

  // Limit message history to last 1000 items
  if (db.messages.length > 1000) {
    db.messages = db.messages.slice(db.messages.length - 1000);
  }

  await pushCloudFriendsData(db);
  return db;
});
