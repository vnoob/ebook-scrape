import chromePaths from 'chrome-paths';
import * as fs from 'fs';
import * as path from 'path';
import { platform } from 'os';
// @ts-ignore - puppeteer-extra has incomplete type definitions for ESM
import puppeteerExtra from 'puppeteer-extra';
// @ts-ignore - puppeteer-extra-plugin-stealth has incomplete type definitions
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// @ts-ignore
puppeteerExtra.use(StealthPlugin());

// @ts-ignore
export const puppeteer = puppeteerExtra;

/**
 * Find the Chrome/Edge executable path on the system
 * @returns Path to Chrome/Edge executable or undefined if not found
 */
export function findChromiumExecutable(): string | undefined {
  // Try chrome-paths library first
  try {
    const chromePath = chromePaths.chrome;
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  } catch (error) {
    // Continue to manual search
  }

  const platformName = platform();
  const commonPaths: string[] = [];

  if (platformName === 'win32') {
    // Windows paths for Chrome and Edge
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || '';

    commonPaths.push(
      // Google Chrome
      path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
      // Microsoft Edge
      path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
      // Brave
      path.join(programFiles, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
      path.join(localAppData, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
    );
  } else if (platformName === 'darwin') {
    // macOS paths
    commonPaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
    );
  } else {
    // Linux paths
    commonPaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/snap/bin/chromium',
      '/usr/bin/brave-browser',
      '/usr/bin/brave-browser-stable'
    );
  }

  // Find the first existing executable
  for (const execPath of commonPaths) {
    try {
      if (fs.existsSync(execPath)) {
        return execPath;
      }
    } catch (error) {
      // Continue searching
    }
  }

  return undefined;
}

/**
 * Realistic User-Agent for modern Chrome on Windows
 */
export const REALISTIC_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Get Puppeteer launch options with Chrome/Edge executable path
 * @returns Launch options object with executablePath if found
 */
export function getPuppeteerLaunchOptions() {
  const executablePath = findChromiumExecutable();
  
  const baseOptions = {
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
      '--start-maximized'
    ]
  };

  if (executablePath) {
    console.log(`Using Chrome/Edge at: ${executablePath}`);
    return {
      ...baseOptions,
      executablePath
    };
  }

  console.log('Using bundled Chromium (no local Chrome/Edge found)');
  return baseOptions;
}
