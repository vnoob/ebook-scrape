import chromePaths from 'chrome-paths';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { platform } from 'os';
import { execSync } from 'child_process';
import extractZip from 'extract-zip';
// @ts-ignore - puppeteer-extra has incomplete type definitions for ESM
import puppeteerExtra from 'puppeteer-extra';
// @ts-ignore - puppeteer-extra-plugin-stealth has incomplete type definitions
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const puppeteerExtraWithUse = puppeteerExtra as unknown as {
  use(plugin: unknown): unknown;
};

puppeteerExtraWithUse.use(StealthPlugin());

export const puppeteer: typeof import('puppeteer-core') =
  puppeteerExtra as unknown as typeof import('puppeteer-core');

type PkgProcess = NodeJS.Process & { pkg?: unknown };

/**
 * Browser detection result with name for user feedback
 */
export interface BrowserInfo {
  path: string;
  name: string;
}

/**
 * Paths for bundled chrome-headless-shell next to the executable (or dev search dirs).
 */
interface BundledChromiumPaths {
  baseDir: string;
  zipPath: string;
  sha256Path: string;
  buildIdPath: string;
  extractDir: string;
  versionMarkerPath: string;
  executablePath: string;
}

let cachedBrowserInfo: BrowserInfo | undefined;

/**
 * Clears cached browser resolution (e.g. for tests).
 * @returns void
 */
export function clearBrowserExecutableCache(): void {
  cachedBrowserInfo = undefined;
}

/**
 * @returns True when running inside a `pkg` snapshot
 */
function isPkgSnapshot(): boolean {
  return Boolean((process as PkgProcess).pkg);
}

/**
 * Directory containing the packaged executable, or the compiled entry script directory when running with Node.
 * @returns Absolute base directory for sidecar `chromium-*.zip` files
 */
export function getExecutableBaseDir(): string {
  if (isPkgSnapshot()) {
    return path.dirname(process.execPath);
  }
  const entry = process.argv[1];
  if (entry) {
    return path.dirname(path.resolve(entry));
  }
  return process.cwd();
}

/**
 * Directories to search for `chromium-${platform}-${arch}.zip` (exe dir first, then ./build for local dev).
 * @returns Ordered list of absolute directories
 */
function getBundledZipSearchDirs(): string[] {
  const dirs = [getExecutableBaseDir(), path.join(process.cwd(), 'build')];
  const seen = new Set<string>();
  return dirs.filter((d) => {
    const norm = path.normalize(d);
    if (seen.has(norm)) {
      return false;
    }
    seen.add(norm);
    return true;
  });
}

/**
 * Folder name inside the official chrome-headless-shell zip for this OS/arch.
 * @param osName - Node `process.platform`
 * @param arch - Node `process.arch`
 * @returns Folder name inside the archive, or `undefined` if unsupported
 */
export function getBundledHeadlessShellFolder(osName: string, arch: string): string | undefined {
  if (osName === 'win32' && arch === 'x64') {
    return 'chrome-headless-shell-win64';
  }
  if (osName === 'linux' && arch === 'x64') {
    return 'chrome-headless-shell-linux64';
  }
  if (osName === 'darwin' && arch === 'x64') {
    return 'chrome-headless-shell-mac-x64';
  }
  if (osName === 'darwin' && arch === 'arm64') {
    return 'chrome-headless-shell-mac-arm64';
  }
  return undefined;
}

/**
 * @returns Bundled artifact basename without extension, e.g. chromium-win32-x64
 */
function getBundledArtifactBaseName(): string {
  return `chromium-${process.platform}-${process.arch}`;
}

/**
 * Resolve paths to bundled zip and extraction targets if a zip exists in a search directory.
 * @returns Resolved paths, or `undefined` if no matching zip exists
 */
export function resolveBundledChromiumPaths(): BundledChromiumPaths | undefined {
  const artifactBase = getBundledArtifactBaseName();
  const zipName = `${artifactBase}.zip`;
  const shellFolder = getBundledHeadlessShellFolder(process.platform, process.arch);
  if (!shellFolder) {
    return undefined;
  }

  for (const baseDir of getBundledZipSearchDirs()) {
    const zipPath = path.join(baseDir, zipName);
    if (!fs.existsSync(zipPath)) {
      continue;
    }

    const extractDir = path.join(baseDir, 'chromium');
    const exeName = process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell';
    const executablePath = path.join(extractDir, shellFolder, exeName);

    return {
      baseDir,
      zipPath,
      sha256Path: `${zipPath}.sha256`,
      buildIdPath: path.join(baseDir, `${artifactBase}.buildid`),
      extractDir,
      versionMarkerPath: path.join(extractDir, '.chromium-version'),
      executablePath,
    };
  }

  return undefined;
}

/**
 * Verify SHA256 checksum of a file.
 * @param filePath - Path to file
 * @param expectedHash - Expected hex digest (may include whitespace / filename suffix from shasum)
 * @returns `true` if checksum matches
 */
export async function verifySHA256(filePath: string, expectedHash: string): Promise<boolean> {
  const fileBuffer = await fs.promises.readFile(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const normalized = expectedHash.trim().split(/\s+/)[0]?.toLowerCase();
  if (!normalized) {
    return false;
  }
  return hash.toLowerCase() === normalized;
}

/**
 * Read expected bundled build id from sidecar file if present.
 * @param buildIdPath - Path to `.buildid` file
 * @returns Trimmed build id or undefined
 */
async function readExpectedBundledBuildId(buildIdPath: string): Promise<string | undefined> {
  try {
    if (!fs.existsSync(buildIdPath)) {
      return undefined;
    }
    const text = (await fs.promises.readFile(buildIdPath, 'utf8')).trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if bundled chromium is already extracted and matches expected version when known.
 * @param paths - Resolved bundled paths
 * @returns Absolute path to `chrome-headless-shell` if ready, otherwise `undefined`
 */
export async function getBundledChromiumIfReady(
  paths: BundledChromiumPaths,
): Promise<string | undefined> {
  if (!fs.existsSync(paths.executablePath)) {
    return undefined;
  }

  const expectedBuildId = await readExpectedBundledBuildId(paths.buildIdPath);
  if (expectedBuildId && fs.existsSync(paths.versionMarkerPath)) {
    try {
      const installed = (await fs.promises.readFile(paths.versionMarkerPath, 'utf8')).trim();
      if (installed !== expectedBuildId) {
        return undefined;
      }
    } catch {
      return undefined;
    }
  }

  return paths.executablePath;
}

/**
 * Extract bundled chromium zip with optional progress callbacks.
 * @param paths - Resolved bundled paths
 * @param onProgress - Optional status messages for CLI
 * @returns Absolute path to the `chrome-headless-shell` binary
 * @throws Error when the archive is missing, checksum fails, or extraction output is invalid
 */
export async function extractBundledChromium(
  paths: BundledChromiumPaths,
  onProgress?: (msg: string) => void,
): Promise<string> {
  if (!fs.existsSync(paths.zipPath)) {
    throw new Error(`Bundled chromium not found at ${paths.zipPath}`);
  }

  if (fs.existsSync(paths.sha256Path)) {
    const expectedHash = (await fs.promises.readFile(paths.sha256Path, 'utf8')).trim();
    onProgress?.('Verifying bundled Chromium checksum...');
    const valid = await verifySHA256(paths.zipPath, expectedHash);
    if (!valid) {
      throw new Error(
        'Bundled Chromium archive failed SHA256 verification.\n' +
          'The file may be corrupted — re-download the release or run `npm run download:chromium`.',
      );
    }
  }

  if (fs.existsSync(paths.extractDir)) {
    await fs.promises.rm(paths.extractDir, { recursive: true, force: true });
  }
  await fs.promises.mkdir(paths.extractDir, { recursive: true });

  onProgress?.('Extracting bundled Chromium… (first run only)');
  try {
    await extractZip(paths.zipPath, { dir: paths.extractDir });
  } catch (err) {
    await fs.promises.rm(paths.extractDir, { recursive: true, force: true }).catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to extract bundled Chromium: ${message}`);
  }

  if (!fs.existsSync(paths.executablePath)) {
    await fs.promises.rm(paths.extractDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(
      'Extracted Chromium is missing the expected chrome-headless-shell binary.\n' +
        'The archive may be corrupted — re-download or run `npm run download:chromium`.',
    );
  }

  const buildId =
    (await readExpectedBundledBuildId(paths.buildIdPath)) ?? 'unknown';
  await fs.promises.writeFile(paths.versionMarkerPath, `${buildId}\n`, 'utf8');

  return paths.executablePath;
}

/**
 * Try to find a browser using the `where` command on Windows
 * @param executable - Name of executable to search for
 * @returns Full path if found, undefined otherwise
 */
function findWithWhere(executable: string): string | undefined {
  try {
    const result = execSync(`where ${executable}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const firstLine = result.trim().split('\n')[0];
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Command failed or executable not in PATH
  }
  return undefined;
}

/**
 * Try to find a browser using the `which` command on Unix systems
 * @param executable - Name of executable to search for
 * @returns Full path if found, undefined otherwise
 */
function findWithWhich(executable: string): string | undefined {
  try {
    const result = execSync(`which ${executable}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const firstLine = result.trim().split('\n')[0];
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Command failed or executable not in PATH
  }
  return undefined;
}

/**
 * Find a system Chrome/Edge/Chromium/Brave executable (no bundled fallback).
 * @returns Browser metadata with path and display name, or `undefined` if not found
 */
export function findChromiumExecutable(): BrowserInfo | undefined {
  const platformName = platform();

  try {
    const chromePath = chromePaths.chrome;
    if (chromePath && fs.existsSync(chromePath)) {
      return { path: chromePath, name: 'Google Chrome' };
    }
  } catch {
    // Continue to manual search
  }

  const browserDefs: Array<{ name: string; paths: string[]; commands?: string[] }> = [];

  if (platformName === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || '';

    browserDefs.push(
      {
        name: 'Microsoft Edge',
        paths: [
          path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
          path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
        ],
        commands: ['msedge'],
      },
      {
        name: 'Google Chrome',
        paths: [
          path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
          path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
          path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
        ],
        commands: ['chrome'],
      },
      {
        name: 'Brave Browser',
        paths: [
          path.join(programFiles, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
          path.join(localAppData, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
        ],
        commands: ['brave'],
      },
      {
        name: 'Chromium',
        paths: [],
        commands: ['chromium'],
      },
    );
  } else if (platformName === 'darwin') {
    browserDefs.push(
      {
        name: 'Google Chrome',
        paths: [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
        ],
        commands: ['google-chrome'],
      },
      {
        name: 'Microsoft Edge',
        paths: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
        commands: ['microsoft-edge'],
      },
      {
        name: 'Brave Browser',
        paths: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
        commands: ['brave-browser'],
      },
      {
        name: 'Chromium',
        paths: ['/Applications/Chromium.app/Contents/MacOS/Chromium'],
        commands: ['chromium'],
      },
    );
  } else {
    browserDefs.push(
      {
        name: 'Google Chrome',
        paths: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'],
        commands: ['google-chrome', 'google-chrome-stable'],
      },
      {
        name: 'Microsoft Edge',
        paths: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'],
        commands: ['microsoft-edge', 'microsoft-edge-stable'],
      },
      {
        name: 'Chromium',
        paths: ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
        commands: ['chromium', 'chromium-browser'],
      },
      {
        name: 'Brave Browser',
        paths: ['/usr/bin/brave-browser', '/usr/bin/brave-browser-stable'],
        commands: ['brave-browser', 'brave-browser-stable'],
      },
    );
  }

  for (const browser of browserDefs) {
    for (const execPath of browser.paths) {
      try {
        if (fs.existsSync(execPath)) {
          return { path: execPath, name: browser.name };
        }
      } catch {
        // Continue searching
      }
    }

    if (browser.commands) {
      const finder = platformName === 'win32' ? findWithWhere : findWithWhich;
      for (const cmd of browser.commands) {
        const foundPath = finder(cmd);
        if (foundPath) {
          return { path: foundPath, name: browser.name };
        }
      }
    }
  }

  return undefined;
}

/**
 * Realistic User-Agent for modern Chrome on Windows
 */
export const REALISTIC_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Error thrown when no compatible browser is found on the system
 */
export class BrowserNotFoundError extends Error {
  constructor() {
    super(
      'No compatible browser found on your system.\n\n' +
        'ebook-scape needs one of the following:\n' +
        '  1. A system browser: Google Chrome, Microsoft Edge, Brave, or Chromium\n' +
        '  2. The bundled Chromium zip shipped with this release:\n' +
        `       ${getBundledArtifactBaseName()}.zip (next to this executable or in ./build when developing)\n\n` +
        'If you installed only the binary, download the full release package or run `npm run download:chromium` ' +
        'and place the zip next to the executable.',
    );
    this.name = 'BrowserNotFoundError';
  }
}

/**
 * Resolve system browser first, then bundled chrome-headless-shell (extracting the zip if needed).
 * @param onProgress - Optional progress messages (checksum / extract)
 * @returns Browser metadata for Puppeteer launch
 * @throws BrowserNotFoundError when no system browser and no usable bundled zip exist
 */
export async function resolveBrowserForPuppeteer(
  onProgress?: (msg: string) => void,
): Promise<BrowserInfo> {
  const system = findChromiumExecutable();
  if (system) {
    return system;
  }

  const bundledPaths = resolveBundledChromiumPaths();
  if (!bundledPaths) {
    throw new BrowserNotFoundError();
  }

  const ready = await getBundledChromiumIfReady(bundledPaths);
  if (ready) {
    return { path: ready, name: 'Bundled Chromium (chrome-headless-shell)' };
  }

  const extracted = await extractBundledChromium(bundledPaths, onProgress);
  return { path: extracted, name: 'Bundled Chromium (chrome-headless-shell)' };
}

/**
 * Get Puppeteer launch options with a resolved Chrome/Chromium executable path.
 * @param onProgress - Optional progress messages when extracting bundled Chromium
 * @returns Launch options object including `executablePath` and headless defaults
 * @throws BrowserNotFoundError if no compatible browser or bundled archive is available
 */
export async function getPuppeteerLaunchOptions(
  onProgress?: (msg: string) => void,
): Promise<{
  headless: boolean;
  args: string[];
  executablePath: string;
}> {
  if (!cachedBrowserInfo) {
    cachedBrowserInfo = await resolveBrowserForPuppeteer(onProgress);
    if (!onProgress) {
      console.log(`Using ${cachedBrowserInfo.name} at: ${cachedBrowserInfo.path}`);
    }
  }

  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
      '--start-maximized',
    ],
    executablePath: cachedBrowserInfo.path,
  };
}
