import { promises as fs } from "node:fs";
import path from "node:path";

const outDir = path.resolve(process.cwd(), "out");

async function walkFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function buildAliasFromPageFile(pageFilePath) {
  const relative = path.relative(outDir, pageFilePath);
  const parts = relative.split(path.sep);
  const pageIndex = parts.indexOf("__PAGE__.txt");
  if (pageIndex <= 0) {
    return null;
  }

  const nextIndex = parts.findIndex((part) => part.startsWith("__next."));
  if (nextIndex < 0 || nextIndex >= pageIndex) {
    return null;
  }

  const baseDir = path.join(outDir, ...parts.slice(0, nextIndex));
  const nextMarker = parts[nextIndex];
  const nestedRouteSegments = parts.slice(nextIndex + 1, pageIndex);
  const flatName =
    nestedRouteSegments.length > 0
      ? `${nextMarker}.${nestedRouteSegments.join(".")}.__PAGE__.txt`
      : `${nextMarker}.__PAGE__.txt`;

  return path.join(baseDir, flatName);
}

async function createAliases() {
  const files = await walkFiles(outDir);
  const pageFiles = files.filter((filePath) => filePath.endsWith(`${path.sep}__PAGE__.txt`));
  const aliasMap = new Map();

  for (const pageFile of pageFiles) {
    const aliasPath = buildAliasFromPageFile(pageFile);
    if (!aliasPath) {
      continue;
    }
    aliasMap.set(aliasPath, pageFile);
  }

  for (const [aliasPath, sourcePath] of aliasMap) {
    const content = await fs.readFile(sourcePath);
    await fs.writeFile(aliasPath, content);
  }

  console.log(`Created ${aliasMap.size} RSC alias files.`);
}

createAliases().catch((error) => {
  console.error("Failed to create RSC alias files.", error);
  process.exitCode = 1;
});
