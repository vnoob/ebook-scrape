# ES Module Packaging Issue

## Problem

The `pkg` tool (v5.8.1) does not fully support ES modules (`"type": "module"`). When trying to run the packaged executables, you'll encounter:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

## Why This Happens

- Our project uses modern ES modules (`import/export` syntax)
- `pkg` was designed for CommonJS (`require()` syntax)
- `pkg` development has slowed and ES module support remains incomplete

## Solutions

### Solution 1: Use Node.js Directly (Recommended ✅)

Instead of standalone executables, run the app with Node.js:

**Requirements:**
- Node.js 18+ installed
- Run `npm install` once

**Usage:**
```bash
# Build once
npm run build

# Run the CLI
npm start -- --url <URL> --out <PATH> [OPTIONS]

# Or run directly
node dist/index.js --url <URL> --out <PATH> [OPTIONS]
```

**Pros:**
- ✅ Works immediately
- ✅ Smaller download (no bundled Node.js)
- ✅ Uses latest Node.js features
- ✅ Faster startup

**Cons:**
- ❌ Requires Node.js installation
- ❌ Requires `npm install`

---

### Solution 2: Switch to @yao-pkg/pkg (Alternative)

There's a maintained fork of `pkg` that might have better ES module support:

```bash
# Uninstall old pkg
npm uninstall pkg

# Install maintained fork
npm install --save-dev @yao-pkg/pkg

# Update package.json script
"build:exe": "npm run build && pkg package.json"
```

However, ES module support is still experimental.

---

### Solution 3: Use Different Bundler

Alternative tools with better ES module support:

**Option A: Caxa**
```bash
npm install --save-dev caxa

# Build command
caxa --input . --output "ebook-scape.exe" -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/dist/index.js"
```

**Option B: Nexe**
```bash
npm install --save-dev nexe

# Requires converting to CommonJS or using workarounds
```

**Option C: pkg with CommonJS wrapper**
- Convert project to CommonJS (complex refactoring)
- Create a CommonJS entry point that loads ES modules

---

### Solution 4: Distribution via npm (Best for Open Source)

Publish to npm registry so users can install globally:

```bash
# User installs globally
npm install -g ebook-scape

# User runs anywhere
ebook-scape --url <URL> --out <PATH>
```

**Benefits:**
- ✅ Easy distribution
- ✅ Automatic updates
- ✅ No packaging issues
- ✅ Standard Node.js workflow

---

## Recommended Approach

For this project, I recommend **Solution 1** (Use Node.js Directly):

1. **Update README** to remove exe building instructions
2. **Focus on npm usage** as the primary installation method
3. **Keep code modern** with ES modules
4. **Better user experience** with faster, smaller footprint

### Updated Installation Instructions:

```markdown
## Installation

### Prerequisites
- Node.js 18 or higher

### Install and Run

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run the CLI:
   ```bash
   npm start -- --url https://example.com/blog --out ebook.pdf
   ```

### Global Installation (Optional)

```bash
# Link for global use
npm link

# Now run from anywhere
ebook-scape --url https://example.com/blog --out ebook.pdf
```
```

---

## Current Status

- ❌ `pkg` executables **DO NOT WORK** due to ES module incompatibility
- ✅ Node.js direct execution **WORKS PERFECTLY**
- ✅ All features are functional when run with Node.js

## Next Steps

1. Remove or update BUILD_GUIDE.md
2. Update README.md to focus on Node.js usage
3. Remove `pkg` from dependencies (optional)
4. Add `npm link` instructions for global installation

Would you like me to update the documentation to reflect the Node.js-only approach?
