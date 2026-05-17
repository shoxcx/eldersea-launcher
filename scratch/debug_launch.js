import pkg from 'minecraft-launcher-core';
const { Client } = pkg;
import path from 'path';
import fs from 'fs';

const launcher = new Client();
const gameRoot = "C:\\ElderSea";
const libsDir = path.join(gameRoot, 'libraries');
const cpSep = process.platform === 'win32' ? ';' : ':';

const modulePath = [
  path.join(libsDir, 'cpw/mods/bootstraplauncher/1.1.2/bootstraplauncher-1.1.2.jar'),
  path.join(libsDir, 'cpw/mods/securejarhandler/2.1.10/securejarhandler-2.1.10.jar'),
  path.join(libsDir, 'org/ow2/asm/asm-commons/9.7/asm-commons-9.7.jar'),
  path.join(libsDir, 'org/ow2/asm/asm-util/9.7/asm-util-9.7.jar'),
  path.join(libsDir, 'org/ow2/asm/asm-analysis/9.7/asm-analysis-9.7.jar'),
  path.join(libsDir, 'org/ow2/asm/asm-tree/9.7/asm-tree-9.7.jar'),
  path.join(libsDir, 'org/ow2/asm/asm/9.7/asm-9.7.jar'),
  path.join(libsDir, 'net/minecraftforge/JarJarFileSystems/0.3.19/JarJarFileSystems-0.3.19.jar')
].join(cpSep);

let opts = {
  authorization: {
    access_token: "0",
    client_token: "0",
    uuid: "00000000-0000-0000-0000-000000000000",
    name: "DebugPlayer",
    user_properties: "{}"
  },
  root: gameRoot,
  version: { number: "1.20.1", type: "release", custom: "1.20.1-forge-47.3.0" },
  memory: { max: "4G", min: "2G" },
  window: { title: "ElderSea Debug", width: 1280, height: 720 },
  javaPath: "C:\\Program Files\\Java\\jdk-17\\bin\\javaw.exe",
  customArgs: [
    "-DlibraryDirectory=" + libsDir,
    "-DignoreList=bootstraplauncher,securejarhandler,asm-commons,asm-util,asm-analysis,asm-tree,asm,JarJarFileSystems,client-extra,fmlcore,javafmllanguage,lowcodelanguage,mclanguage,forge-,1.20.1-forge-47.3.0.jar",
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

launcher.on('data', (e) => console.log(e));
launcher.on('debug', (e) => console.log("[DEBUG]", e));
launcher.on('close', () => console.log("Game closed"));

console.log("Launching game...");
launcher.launch(opts);
