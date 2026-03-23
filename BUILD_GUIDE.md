# Building Binary Executables - Complete Guide

This guide will walk you through building standalone executable binaries for ebook-scape that can be distributed and run without Node.js.

## 📋 Prerequisites

Before building binaries, ensure you have:

- ✅ Node.js 18 or higher installed
- ✅ All project dependencies installed (`npm install`)
- ✅ TypeScript compiled (`npm run build`)

## 🏗️ Building Executables

### Quick Build (All Platforms)

Build executables for Linux, Windows, and macOS in one command:

```bash
npm run build:exe
```

This command will:
1. Compile TypeScript to JavaScript (`npm run build`)
2. Package JavaScript into standalone executables (`pkg`)
3. Output binaries to the `build/` directory

**Build Time**: 2-5 minutes depending on your system

**Expected Output:**
```
> ebook-scape@1.0.0 build:exe
> npm run build && pkg package.json

> ebook-scape@1.0.0 build
> tsc

> pkg@5.8.1
> Targets not specified. Assuming:
  node18-linux-x64, node18-win-x64, node18-macos-x64
```

### Build Output

After building, you'll find three executables in the `build/` directory:

```
build/
├── ebook-scape-linux      # Linux (x64) - ~58-72 MB
├── ebook-scape-win.exe    # Windows (x64) - ~60-75 MB
└── ebook-scape-macos      # macOS (x64) - ~65-80 MB
```

## 🎯 Platform-Specific Builds

### Build Only Linux

```bash
pkg package.json --targets node18-linux-x64 --output build/ebook-scape-linux
```

### Build Only Windows

```bash
pkg package.json --targets node18-win-x64 --output build/ebook-scape-win.exe
```

### Build Only macOS

```bash
pkg package.json --targets node18-macos-x64 --output build/ebook-scape-macos
```

## 💻 Using the Binaries

### Linux

#### 1. Make Executable (First Time Only)

```bash
chmod +x build/ebook-scape-linux
```

#### 2. Run the Binary

```bash
# From the project directory
./build/ebook-scape-linux --url https://example.com/blog --out output.pdf

# From anywhere (add to PATH or move to /usr/local/bin)
sudo mv build/ebook-scape-linux /usr/local/bin/ebook-scape
ebook-scape --url https://example.com/blog --out output.pdf
```

#### 3. Examples

**Generate PDF:**
```bash
./build/ebook-scape-linux --url https://blog.example.com --out my-book.pdf
```

**Generate EPUB:**
```bash
./build/ebook-scape-linux --url https://blog.example.com --out my-book.epub --format epub
```

**Process 20 articles:**
```bash
./build/ebook-scape-linux --url https://blog.example.com --out my-book.pdf --max 20
```

### Windows

#### 1. Open Command Prompt or PowerShell

Navigate to the project directory:
```cmd
cd D:\Projects\handson\ebook-scape
```

#### 2. Run the Binary

**Command Prompt:**
```cmd
build\ebook-scape-win.exe --url https://example.com/blog --out output.pdf
```

**PowerShell:**
```powershell
.\build\ebook-scape-win.exe --url https://example.com/blog --out output.pdf
```

#### 3. Examples

**Generate PDF:**
```cmd
build\ebook-scape-win.exe --url https://blog.example.com --out my-book.pdf
```

**Generate EPUB:**
```cmd
build\ebook-scape-win.exe --url https://blog.example.com --out my-book.epub --format epub
```

**Process 20 articles:**
```cmd
build\ebook-scape-win.exe --url https://blog.example.com --out my-book.pdf --max 20
```

#### 4. Add to PATH (Optional)

To run from anywhere:

1. Copy `ebook-scape-win.exe` to a directory in your PATH (e.g., `C:\Windows\System32`)
2. Or add the `build` directory to your PATH:
   - Right-click "This PC" → Properties → Advanced System Settings
   - Environment Variables → System Variables → Path → Edit
   - Add: `D:\Projects\handson\ebook-scape\build`
3. Open new terminal and run: `ebook-scape-win.exe --url <URL> --out <PATH>`

### macOS

#### 1. Make Executable (First Time Only)

```bash
chmod +x build/ebook-scape-macos
```

#### 2. Handle Gatekeeper (First Time Only)

macOS may block the executable. To allow it:

**Option A: Using Terminal**
```bash
xattr -d com.apple.quarantine build/ebook-scape-macos
```

**Option B: Using System Preferences**
1. Try to run the executable
2. Go to System Preferences → Security & Privacy
3. Click "Allow Anyway" for ebook-scape-macos

#### 3. Run the Binary

```bash
# From the project directory
./build/ebook-scape-macos --url https://example.com/blog --out output.pdf

# From anywhere (add to PATH)
sudo mv build/ebook-scape-macos /usr/local/bin/ebook-scape
ebook-scape --url https://example.com/blog --out output.pdf
```

#### 4. Examples

**Generate PDF:**
```bash
./build/ebook-scape-macos --url https://blog.example.com --out my-book.pdf
```

**Generate EPUB:**
```bash
./build/ebook-scape-macos --url https://blog.example.com --out my-book.epub --format epub
```

**Process 20 articles:**
```bash
./build/ebook-scape-macos --url https://blog.example.com --out my-book.pdf --max 20
```

## 📦 Distributing Binaries

### File Checklist

When distributing, include:
- ✅ The executable file (`ebook-scape-*`)
- ✅ README or usage guide
- ✅ License file (if applicable)

**Do NOT include:**
- ❌ `node_modules/` directory
- ❌ `src/` directory
- ❌ `dist/` directory
- ❌ TypeScript files

### Distribution Methods

#### 1. Direct Download

Upload to file sharing service:
- Google Drive
- Dropbox
- GitHub Releases
- Your own server

#### 2. GitHub Releases

```bash
# Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Create release on GitHub
# Upload the three executables as release assets
```

#### 3. Package Managers

**Homebrew (macOS/Linux):**
Create a formula for your binary

**Chocolatey (Windows):**
Create a package for Windows users

**Snap (Linux):**
Package as a snap for easy installation

### Compression

Compress binaries for distribution:

**Linux/macOS:**
```bash
tar -czf ebook-scape-linux-x64.tar.gz build/ebook-scape-linux
tar -czf ebook-scape-macos-x64.tar.gz build/ebook-scape-macos
```

**Windows:**
```cmd
# Use 7-Zip or WinRAR to create ebook-scape-win-x64.zip
```

## ⚙️ Advanced Configuration

### Custom Build Configuration

Edit `package.json` to customize the build:

```json
{
  "pkg": {
    "scripts": "dist/**/*.js",
    "assets": [
      "node_modules/puppeteer/.local-chromium/**/*"
    ],
    "targets": [
      "node18-linux-x64",
      "node18-linux-arm64",
      "node18-win-x64",
      "node18-win-arm64",
      "node18-macos-x64",
      "node18-macos-arm64"
    ],
    "outputPath": "build"
  }
}
```

### Build for ARM Platforms

**Linux ARM64:**
```bash
pkg package.json --targets node18-linux-arm64 --output build/ebook-scape-linux-arm64
```

**macOS ARM64 (Apple Silicon):**
```bash
pkg package.json --targets node18-macos-arm64 --output build/ebook-scape-macos-arm64
```

**Windows ARM64:**
```bash
pkg package.json --targets node18-win-arm64 --output build/ebook-scape-win-arm64.exe
```

### Optimize Binary Size

The binaries are large (~60-75 MB) because they include Node.js runtime. To reduce size:

1. **Use Local Browser Detection** (Already implemented!)
   - Uses system Chrome/Edge instead of bundled Chromium
   - Reduces size by not including browser in executable

2. **Compress Assets**
   ```bash
   npm install --production  # Remove dev dependencies before building
   ```

3. **Use UPX Compression** (Optional)
   ```bash
   # Install UPX
   brew install upx  # macOS
   apt install upx   # Linux
   
   # Compress executables
   upx --best build/ebook-scape-linux
   upx --best build/ebook-scape-win.exe
   upx --best build/ebook-scape-macos
   ```

## 🔍 Verification

### Test the Binary

After building, test each platform:

**Linux:**
```bash
./build/ebook-scape-linux --version
./build/ebook-scape-linux --help
```

**Windows:**
```cmd
build\ebook-scape-win.exe --version
build\ebook-scape-win.exe --help
```

**macOS:**
```bash
./build/ebook-scape-macos --version
./build/ebook-scape-macos --help
```

### Test Full Workflow

```bash
# Create test output directory
mkdir -p test-output

# Test PDF generation
./build/ebook-scape-linux \
  --url https://blog.example.com \
  --out test-output/test.pdf \
  --max 3

# Test EPUB generation
./build/ebook-scape-linux \
  --url https://blog.example.com \
  --out test-output/test.epub \
  --format epub \
  --max 3

# Verify files were created
ls -lh test-output/
```

## 🐛 Troubleshooting

### Build Issues

**Problem: "pkg: not found"**
```bash
# Solution: Install pkg globally
npm install -g pkg

# Or use local pkg
npx pkg package.json
```

**Problem: "Cannot find module"**
```bash
# Solution: Rebuild TypeScript first
npm run build
npm run build:exe
```

**Problem: "Out of memory"**
```bash
# Solution: Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build:exe
```

### Runtime Issues

**Problem: "Chrome not found"**
- **Solution**: Install Chrome, Edge, Chromium, or Brave browser
- The binary will automatically detect and use it

**Problem: "Permission denied" (Linux/macOS)**
```bash
# Solution: Make executable
chmod +x build/ebook-scape-linux
chmod +x build/ebook-scape-macos
```

**Problem: "App is damaged" (macOS)**
```bash
# Solution: Remove quarantine attribute
xattr -d com.apple.quarantine build/ebook-scape-macos
```

**Problem: Executable not running on older systems**
- The binaries are built for Node 18 (modern systems)
- For older systems, build with older Node target: `node16-*` or `node14-*`

## 📝 Quick Reference

### Build Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript |
| `npm run build:exe` | Build all platform executables |
| `pkg package.json` | Build using default configuration |
| `pkg --targets node18-linux-x64` | Build specific platform |
| `pkg --output custom-name` | Custom output name |

### Usage Commands

| Platform | Command Pattern |
|----------|----------------|
| Linux | `./build/ebook-scape-linux [options]` |
| Windows | `build\ebook-scape-win.exe [options]` |
| macOS | `./build/ebook-scape-macos [options]` |

### Common Options

| Option | Example | Description |
|--------|---------|-------------|
| `--url` | `--url https://blog.com` | Blog URL to scrape |
| `--out` | `--out book.pdf` | Output file path |
| `--format` | `--format epub` | pdf or epub (default: pdf) |
| `--max` | `--max 20` | Max articles (default: 10) |
| `--help` | `--help` | Show help |
| `--version` | `--version` | Show version |

## 🎉 Success!

You now have standalone executables that:
- ✅ Run without Node.js installation
- ✅ Work on Linux, Windows, and macOS
- ✅ Can be distributed to end users
- ✅ Use system browsers for better performance
- ✅ Support both PDF and EPUB formats

**Need Help?** Open an issue on GitHub or check the main README.md for more information.
