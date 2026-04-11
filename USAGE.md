# ebook-scape Usage Guide

Quick guide for using the ebook-scape tool to convert blog posts into eBooks.

## 🚀 Quick Start

### Prerequisites

Either:

- **A system browser**: Google Chrome, Microsoft Edge, Chromium, or Brave, **or**
- **Bundled Chromium** (full release): place `chromium-<platform>-<arch>.zip` (and its `.sha256` / `.buildid` sidecars from the same release) **next to the executable**. On first run, ebook-scape verifies the checksum and extracts into a `chromium/` folder beside the binary.

### Download

Download the appropriate executable **and matching Chromium zip** for your system (from the same release):

- **Windows x64**: Windows `.exe` (e.g. `ebook-scape-win-x64.exe` or `ebook-scape-win.exe`) + `chromium-win32-x64.zip` (+ `.zip.sha256`, `.buildid`)
- **Linux x64**: Linux binary (e.g. `ebook-scape-linux-x64`) + `chromium-linux-x64.zip` (+ sidecars)
- **macOS x64**: macOS binary (e.g. `ebook-scape-macos-x64`) + `chromium-darwin-x64.zip` (+ sidecars)

## 📖 Basic Usage

### Windows

Open Command Prompt or PowerShell in the folder containing the executable:

```cmd
ebook-scape-win.exe --url https://blog.example.com --out my-book.pdf
```

### Linux

```bash
# First time: Make it executable
chmod +x ebook-scape-linux

# Run it
./ebook-scape-linux --url https://blog.example.com --out my-book.pdf
```

### macOS

```bash
# First time: Make it executable and remove quarantine
chmod +x ebook-scape-macos
xattr -d com.apple.quarantine ebook-scape-macos

# Run it
./ebook-scape-macos --url https://blog.example.com --out my-book.pdf
```

## 🎯 Common Tasks

### Create a PDF eBook

```bash
ebook-scape --url https://blog.example.com --out blog-book.pdf
```

### Create an EPUB eBook (for Kindle, iPad, etc.)

```bash
ebook-scape --url https://blog.example.com --out blog-book.epub --format epub
```

### Process More Articles

By default, it processes 10 articles. To process more:

```bash
ebook-scape --url https://blog.example.com --out blog-book.pdf --max 50
```

### Process All Articles

```bash
ebook-scape --url https://blog.example.com --out blog-book.pdf --max 999
```

## 📋 Options

| Option | Short | Required | Default | Description |
|--------|-------|----------|---------|-------------|
| `--url <url>` | `-u` | ✅ Yes | - | Blog URL to scrape |
| `--out <path>` | `-o` | ✅ Yes | - | Output file path |
| `--format <type>` | `-f` | ❌ No | `pdf` | Format: pdf or epub |
| `--max <number>` | `-m` | ❌ No | `10` | Max articles to process |
| `--layout-mode <mode>` | `-l` | ❌ No | `static` | Layout mode: static or ai |
| `--ai-provider <provider>` | - | ❌ No | `gemini` | AI provider: gemini, openai, or anthropic |
| `--ai-model <model>` | - | ❌ No | provider default | AI model name (provider-specific) |
| `--ai-api-key <key>` | - | ❌ No | environment/default | API key for selected AI provider |
| `--no-strip-links` | - | ❌ No | strip links | Keep hyperlinks in article content |
| `--no-filter` | - | ❌ No | filtering on | Disable omission of non-contributing pages |
| `--lazy-load-timeout <ms>` | - | ❌ No | `20000` | Max ms for lazy content expansion (scroll, images, load-more) |
| `--no-lazy-load` | - | ❌ No | lazy on | Skip lazy expansion (faster; may miss lazy-loaded content) |
| `--no-cache` | - | ❌ No | cache enabled | Disable AI response cache |
| `--help` | `-h` | ❌ No | - | Show help |
| `--version` | `-V` | ❌ No | - | Show version |

## 💡 Examples

### Example 1: Simple PDF

```bash
ebook-scape-win.exe --url https://medium.com/topic/programming --out programming.pdf
```

### Example 2: EPUB for Kindle

```bash
ebook-scape-win.exe --url https://dev.to --out dev-articles.epub --format epub --max 20
```

### Example 3: Complete Blog Archive

```bash
ebook-scape-win.exe --url https://myblog.com/posts --out complete-blog.pdf --max 100
```

### Example 4: Using Short Options

```bash
ebook-scape-win.exe -u https://blog.com -o book.pdf -f pdf -m 15
```

### Example 5: AI Layout Mode

```bash
ebook-scape-win.exe --url https://blog.example.com --out ai-layout.pdf --layout-mode ai --ai-provider gemini
```

### Example 6: Keep hyperlinks in the book

```bash
ebook-scape-win.exe --url https://blog.example.com --out book-with-links.pdf --no-strip-links
```

### Example 7: Include all extracted pages (no content filter)

```bash
ebook-scape-win.exe --url https://blog.example.com --out everything.pdf --no-filter
```

## 📂 Output Files

The tool will create your eBook in the specified location:

```
my-book.pdf          # PDF file (for printing, desktop reading)
my-book.epub         # EPUB file (for e-readers, tablets, phones)
```

### Where to Find Output

- **Relative path**: `./my-book.pdf` → In the current folder
- **Absolute path**: `C:\Users\Name\Documents\my-book.pdf` → Specific location
- **No path specified**: Creates in current folder

## 🎨 What You'll Get

### PDF Output

- 📑 Table of Contents with clickable links
- 📄 Each article on a new page
- 📏 A4 format with proper margins
- 🔢 Page numbers
- 🎨 Professional typography

### EPUB Output

- 📱 Works on all e-readers (Kindle, iPad, Android, Kobo, Nook)
- 📖 Each article as a separate chapter
- 🔖 Built-in table of contents
- 📐 Adapts to any screen size
- 📝 Can change font size and style

## ⏱️ Processing Time

Typical processing times:

| Articles | Time |
|----------|------|
| 5 articles | 1-2 minutes |
| 10 articles | 2-4 minutes |
| 25 articles | 5-10 minutes |
| 50 articles | 10-20 minutes |
| 100 articles | 20-40 minutes |

*Time varies based on article length and your internet speed*

## 🔍 What Gets Extracted

The tool automatically:
- ✅ Finds all article links on the blog page
- ✅ Extracts main content (removes ads, sidebars, menus)
- ✅ Includes images and formatting
- ✅ Creates a table of contents
- ✅ Converts to PDF or EPUB format

It filters out:
- ❌ Author profile pages
- ❌ Tag/category pages
- ❌ Navigation/menu links
- ❌ Login/signup pages
- ❌ Ads and tracking scripts

## 🐛 Common Issues

### "Chrome not found" or "Browser error"

**Solution**:

1. Install a system browser: [Chrome](https://www.google.com/chrome/), [Edge](https://www.microsoft.com/edge), [Chromium](https://www.chromium.org/getting-involved/download-chromium/), or [Brave](https://brave.com/), **or**
2. Use the **full release package**: keep `chromium-<platform>-<arch>.zip` next to the executable (first launch extracts it; you may see a short “Preparing browser…” step).

### "Permission denied" (Linux/macOS)

**Solution**:
```bash
chmod +x ebook-scape-linux
# or
chmod +x ebook-scape-macos
```

### "App is damaged" (macOS)

**Solution**:
```bash
xattr -d com.apple.quarantine ebook-scape-macos
```

Or: System Preferences → Security & Privacy → Click "Allow Anyway"

### "No articles found"

**Possible causes**:
- Blog URL might be incorrect
- Blog might require login
- Blog might have anti-scraping protection

**Solution**: Try the main blog page URL (e.g., `https://example.com/blog`)

### Slow processing

**Normal behavior**: Processing takes time for:
- Discovering articles (1-2 minutes)
- Loading each article page (5-10 seconds per article)
- Extracting and cleaning content
- Generating the eBook

**To speed up**: Use `--max` to limit articles:
```bash
ebook-scape --url https://blog.com --out book.pdf --max 5
```

## 💬 Getting Help

### View Help Message

```bash
ebook-scape-win.exe --help
```

Output:
```
Usage: ebook-scape [options]

Convert blog posts to PDF or EPUB eBooks

Options:
  -V, --version        output the version number
  -u, --url <url>      Target blog URL to scrape
  -o, --out <path>     Output eBook file path
  -f, --format <type>  Output format: pdf or epub (default: "pdf")
  -m, --max <number>   Maximum number of articles to process (default: "10")
  -l, --layout-mode <mode>  Layout mode: static or ai (default: "static")
      --ai-provider <provider>  AI provider: gemini, openai, or anthropic (default: "gemini")
      --ai-model <model>  AI model name (provider-specific)
      --ai-api-key <key>  API key for AI provider
      --no-strip-links    Keep hyperlinks in article content (default: strip non-anchor links)
      --no-filter         Disable content filtering; include all extracted pages
      --no-cache          Skip AI response cache
  -h, --help           display help for command
```

### Check Version

```bash
ebook-scape-win.exe --version
```

## ✅ Best Practices

1. **Test with small numbers first**
   ```bash
   ebook-scape --url <URL> --out test.pdf --max 3
   ```

2. **Use descriptive output names**
   ```bash
   ebook-scape --url <URL> --out "JavaScript-Tutorial-2024.pdf"
   ```

3. **Create an output folder**
   ```bash
   mkdir ebooks
   ebook-scape --url <URL> --out ebooks/my-book.pdf
   ```

4. **For large blogs, increase max gradually**
   ```bash
   # Start with 10 (default)
   ebook-scape --url <URL> --out book.pdf
   
   # Then try 25
   ebook-scape --url <URL> --out book.pdf --max 25
   
   # Then try 50+
   ebook-scape --url <URL> --out book.pdf --max 50
   ```

## 🎉 Success!

You should now have a beautiful eBook of your favorite blog posts!

**Enjoy reading!** 📚✨

---

**Questions or Issues?**
- Check the full [README.md](README.md) for detailed information
- Open an issue on GitHub if you encounter problems
