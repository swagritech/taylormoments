import { rm } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();

for (const dir of ["dist", "release"]) {
  await rm(path.join(cwd, dir), { recursive: true, force: true });
}
