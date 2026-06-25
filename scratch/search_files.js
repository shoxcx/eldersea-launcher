import fs from 'fs';
import path from 'path';

const searchDir = path.join(process.env.APPDATA, '.eldersea');
console.log("Searching in:", searchDir);

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else {
        const nameLower = file.toLowerCase();
        if (nameLower.includes('crew') || nameLower.includes('equi') || nameLower.includes('util') || nameLower.includes('.json') || nameLower.includes('.db') || nameLower.includes('.sqlite')) {
          results.push({ path: fullPath, size: stat.size });
        }
      }
    });
  } catch (e) {
    // ignore
  }
  return results;
}

if (fs.existsSync(searchDir)) {
  const found = walk(searchDir);
  console.log("Found files:");
  console.log(JSON.stringify(found, null, 2));
} else {
  console.log("Directory does not exist:", searchDir);
}
