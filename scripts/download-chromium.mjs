/**
 * Downloads chrome-headless-shell zip archives for packaging next to pkg executables.
 * Writes companion .sha256 and .buildid files for runtime verification and version checks.
 *
 * @fileoverview
 */

import {
  Browser,
  BrowserPlatform,
  BrowserTag,
  install,
  resolveBuildId,
} from '@puppeteer/browsers';
import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BUILD_DIR = path.join(process.cwd(), 'build');

const ALL_TARGETS = [
  { outputName: 'chromium-win32-x64', browserPlatform: BrowserPlatform.WIN64 },
  { outputName: 'chromium-linux-x64', browserPlatform: BrowserPlatform.LINUX },
  { outputName: 'chromium-darwin-x64', browserPlatform: BrowserPlatform.MAC },
  { outputName: 'chromium-darwin-arm64', browserPlatform: BrowserPlatform.MAC_ARM },
];

/**
 * When CHROMIUM_DOWNLOAD_CURRENT=1, only fetch the zip matching this machine (CI saves time/bandwidth).
 * @returns {typeof ALL_TARGETS}
 */
function getTargets() {
  if (process.env.CHROMIUM_DOWNLOAD_CURRENT !== '1') {
    return ALL_TARGETS;
  }
  const key = `${process.platform}-${process.arch}`;
  const map = {
    'win32-x64': ALL_TARGETS.filter((t) => t.outputName === 'chromium-win32-x64'),
    'linux-x64': ALL_TARGETS.filter((t) => t.outputName === 'chromium-linux-x64'),
    'darwin-x64': ALL_TARGETS.filter((t) => t.outputName === 'chromium-darwin-x64'),
    'darwin-arm64': ALL_TARGETS.filter((t) => t.outputName === 'chromium-darwin-arm64'),
  };
  const picked = map[key];
  if (!picked?.length) {
    console.warn(
      `CHROMIUM_DOWNLOAD_CURRENT=1: no mapping for ${key}; downloading all platforms.`,
    );
    return ALL_TARGETS;
  }
  return picked;
}

/**
 * @param {string} zipPath
 * @returns {Promise<string>}
 */
async function sha256OfFile(zipPath) {
  const buf = await readFile(zipPath);
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * @param {string} sha256Path
 * @returns {Promise<string | undefined>}
 */
async function readExpectedSha256(sha256Path) {
  if (!existsSync(sha256Path)) {
    return undefined;
  }
  const raw = (await readFile(sha256Path, 'utf8')).trim();
  return raw.split(/\s+/)[0]?.toLowerCase();
}

/**
 * @param {string} filePath
 * @param {string} hashHex
 * @returns {Promise<void>}
 */
async function writeSha256Sidecar(filePath, hashHex) {
  await writeFile(`${filePath}.sha256`, `${hashHex}\n`, 'utf8');
}

/**
 * Download or refresh a single platform bundle.
 * @param {string} buildId
 * @param {{ outputName: string; browserPlatform: string }} target
 * @returns {Promise<void>}
 */
async function ensureBundleForTarget(buildId, target) {
  const zipPath = path.join(BUILD_DIR, `${target.outputName}.zip`);
  const sha256Path = `${zipPath}.sha256`;
  const buildIdPath = path.join(BUILD_DIR, `${target.outputName}.buildid`);

  if (existsSync(zipPath) && existsSync(sha256Path) && existsSync(buildIdPath)) {
    const actual = (await sha256OfFile(zipPath)).toLowerCase();
    const expected = await readExpectedSha256(sha256Path);
    const priorBuild = (await readFile(buildIdPath, 'utf8')).trim();
    if (
      expected &&
      actual === expected &&
      priorBuild === buildId
    ) {
      console.log(`Skipping ${target.outputName} (checksum and build id match)`);
      return;
    }
    console.log(`Refreshing ${target.outputName} (checksum or build id mismatch)`);
  }

  const tmpCache = path.join(BUILD_DIR, '.chromium-dl-cache', target.outputName);
  await mkdir(tmpCache, { recursive: true });

  console.log(
    `Downloading chrome-headless-shell ${buildId} for ${target.browserPlatform} → ${target.outputName}.zip`,
  );

  const archivePath = await install({
    browser: Browser.CHROMEHEADLESSSHELL,
    buildId,
    platform: target.browserPlatform,
    cacheDir: tmpCache,
    unpack: false,
    downloadProgressCallback: 'default',
  });

  await mkdir(BUILD_DIR, { recursive: true });
  await copyFile(archivePath, zipPath);

  const hashHex = await sha256OfFile(zipPath);
  await writeSha256Sidecar(zipPath, hashHex);
  await writeFile(buildIdPath, `${buildId}\n`, 'utf8');

  await rm(tmpCache, { recursive: true, force: true }).catch(() => {});

  console.log(`Wrote ${zipPath} (${hashHex.slice(0, 12)}…)`);
}

async function main() {
  await mkdir(BUILD_DIR, { recursive: true });

  const buildId = await resolveBuildId(
    Browser.CHROMEHEADLESSSHELL,
    BrowserPlatform.LINUX,
    BrowserTag.STABLE,
  );

  console.log(`Resolved chrome-headless-shell stable build: ${buildId}`);

  const targets = getTargets();
  for (const target of targets) {
    await ensureBundleForTarget(buildId, target);
  }

  const metaPath = path.join(BUILD_DIR, 'chromium-bundle-metadata.json');
  await writeFile(
    metaPath,
    `${JSON.stringify({ buildId, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote ${metaPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
