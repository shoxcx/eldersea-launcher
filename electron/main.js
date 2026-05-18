import { app, BrowserWindow, ipcMain, shell, protocol, net, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import pkg from 'minecraft-launcher-core';
import { exec } from 'child_process';
const { Client, Authenticator } = pkg;

import pkgUpdater from 'electron-updater';
const { autoUpdater } = pkgUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let isGameRunning = false;
const launcher = new Client();
const GAME_ROOT = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME), '.eldersea');


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
    mainWindow = new BrowserWindow({
      width: 1200, height: 800, frame: false, resizable: false, maximizable: false,
      title: "ElderSea v1.0.0",
      webPreferences: { 
        nodeIntegration: true, 
        contextIsolation: false,
        webSecurity: false 
      },
      backgroundColor: '#0a0a0a', show: false,
      icon: path.join(__dirname, '../dist/logoapp.png')
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
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

      // Vérification des mises à jour automatiques via GitHub
      if (process.env.NODE_ENV !== 'development') {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
          console.error('[UPDATER ERROR]', err);
        });
      }
    });
  }

  app.whenReady().then(createWindow);

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

ipcMain.on('window-control', (event, action) => {
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'close') app.quit();
});

ipcMain.on('open-folder', (event, folderName) => {
  if (!fs.existsSync(GAME_ROOT)) fs.mkdirSync(GAME_ROOT, { recursive: true });
  shell.openPath(GAME_ROOT);
});

ipcMain.on('open-external-url', (event, url) => {
  shell.openExternal(url);
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

async function syncHTTP(gameRoot) {
  const baseUrl = "http://eldersea.tekao.fr/launcher/";
  
  async function fetchList(dirUrl) {
      return new Promise((resolve, reject) => {
          const req = net.request({ url: dirUrl, redirect: 'follow' });
          req.on('response', (res) => {
              if (res.statusCode !== 200) {
                  return resolve(""); 
              }
              let data = '';
              res.on('data', chunk => data += chunk.toString());
              res.on('end', () => resolve(data));
          });
          req.on('error', reject);
          req.end();
      });
  }

  async function checkNeedsDownload(url, dest) {
      if (!fs.existsSync(dest)) return true;
      return new Promise((resolve) => {
          const req = net.request({ method: 'HEAD', url: url, redirect: 'follow' });
          req.on('response', (res) => {
              if (res.statusCode === 200) {
                  const remoteSize = parseInt(res.headers['content-length'] || '0', 10);
                  const localSize = fs.statSync(dest).size;
                  resolve(remoteSize > 0 && remoteSize !== localSize);
              } else {
                  resolve(true);
              }
          });
          req.on('error', () => resolve(true));
          req.end();
      });
  }

  async function syncDir(remoteDir, localDir) {
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      
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
      
      if (isModsDir) {
          const localFiles = fs.readdirSync(localDir);
          for (const localFile of localFiles) {
              if (localFile.endsWith('.jar')) {
                  if (!items.some(i => decodeURIComponent(i.endsWith('/') ? i.slice(0, -1) : i) === localFile)) {
                      try {
                          fs.unlinkSync(path.join(localDir, localFile)); 
                          console.log(`[SYNC] Deleting local mod (not on server): ${localFile}`); 
                      } catch (e) {}
                  }
              }
          }
      }

      for (const item of items) {
          const itemUrl = remoteDir + item;
          const decodedName = decodeURIComponent(item.endsWith('/') ? item.slice(0, -1) : item);
          const localFile = path.join(localDir, decodedName);

          if (decodedName.toLowerCase() === '.htaccess') continue;

          if (item.endsWith('/')) {
              await syncDir(itemUrl, localFile);
          } else {
              const shouldDownload = await checkNeedsDownload(itemUrl, localFile);
              if (shouldDownload) {
                  console.log(`[SYNC] DL: ${itemUrl}`);
                  await downloadFile(itemUrl, localFile);
              }
          }
      }
  }

  try {
      await syncDir(baseUrl, gameRoot);
  } catch (err) {
      console.error("[HTTP SYNC ERROR]", err.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('launch-error', "Erreur de connexion au serveur de fichiers (HTTP) : " + err.message);
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

ipcMain.on('launch-game', async (event, { pseudo, ram }) => {
  if (isGameRunning) return;
  isGameRunning = true;
  mainWindow.webContents.send('game-status', true);

  try {
    if (!fs.existsSync(GAME_ROOT)) fs.mkdirSync(GAME_ROOT, { recursive: true });

    // Détection et installation de Java portable si manquant
    let javaExecutable = getJavaPath();
    if (javaExecutable === "javaw" && process.platform === 'win32') {
      try {
        javaExecutable = await setupPortableJava(GAME_ROOT);
      } catch (err) {
        console.error("[JAVA DOWNLOAD FAIL]", err);
        javaExecutable = "javaw";
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('launch-progress', { type: 'Chargement Forge...', task: 20, total: 100 });
    }
    await syncHTTP(GAME_ROOT);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('launch-progress', { type: 'Décollage...', task: 80, total: 100 });
    }
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
    
    let gameStarted = false;
    launcher.on('data', (e) => {
        console.log("[JVM]", e);
        if (!gameStarted) {
            gameStarted = true;
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('hide-progress');
            }
        }
    });

    launcher.on('debug', (e) => console.log("[DEBUG]", e));
    launcher.on('error', (e) => {
        console.error("[MCLC ERROR]", e);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('launch-error', e.toString());
        }
    });
    launcher.on('progress', (e) => mainWindow.webContents.send('launch-progress', e));
    launcher.on('close', () => {
        isGameRunning = false;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('game-status', false);
            mainWindow.webContents.send('launch-finished');
        }
    });

    console.log("[FORGE] Lancement du moteur...");
    await launcher.launch(opts);
    
  } catch (error) {
    isGameRunning = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game-status', false);
        console.error("[FATAL ERROR]", error);
        mainWindow.webContents.send('launch-error', error.message);
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
