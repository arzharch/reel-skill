#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const dest = path.join(process.cwd(), ".claude", "skills", "reel");

fs.mkdirSync(dest, { recursive: true });
for (const name of ["SKILL.md", "PLAYBOOK.md", "RUBRIC.md", "scripts", "brand", "examples"]) {
  fs.cpSync(path.join(HERE, name), path.join(dest, name), { recursive: true });
}

console.log(`Installed the reel skill into ${dest}`);
console.log("Open this folder in Claude Code and ask it to make a reel from your footage.");
