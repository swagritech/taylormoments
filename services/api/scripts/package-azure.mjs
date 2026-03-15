import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const releaseDir = path.join(cwd, "release");

await rm(releaseDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });

for (const file of ["host.json", "package.json", "package-lock.json"]) {
  await cp(path.join(cwd, file), path.join(releaseDir, file));
}

await cp(path.join(cwd, "dist"), path.join(releaseDir, "dist"), { recursive: true });
await cp(path.join(cwd, "node_modules"), path.join(releaseDir, "node_modules"), { recursive: true });

process.stdout.write(`Azure package prepared in ${releaseDir}\n`);
