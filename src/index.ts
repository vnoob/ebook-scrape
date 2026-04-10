#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import { getArticleLinks } from './crawler.js';
import { extractContent } from './extractor.js';
import { buildPDF, buildEPUB } from './generator.js';
import * as path from 'path';
import { AIProvider, getAILayout, getDefaultModel } from './ai-layout.js';

const program = new Command();

program
  .name('ebook-scape')
  .description('Convert blog posts to PDF or EPUB eBooks')
  .version('1.0.0')
  .requiredOption('-u, --url <url>', 'Target blog URL to scrape')
  .requiredOption('-o, --out <path>', 'Output eBook file path')
  .option('-f, --format <type>', 'Output format: pdf or epub', 'pdf')
  .option('-m, --max <number>', 'Maximum number of articles to process', '10')
  .option('-l, --layout-mode <mode>', 'Layout mode: static or ai', 'static')
  .option('--ai-provider <provider>', 'AI provider: gemini, openai, or anthropic', 'gemini')
  .option('--ai-model <model>', 'AI model name (provider-specific)')
  .option('--ai-api-key <key>', 'API key for AI provider')
  .option('--strip-links', 'Remove hyperlinks from article content, keeping only text')
  .option('--no-cache', 'Skip AI response cache')
  .parse(process.argv);

const options = program.opts<{
  url: string;
  out: string;
  format: string;
  max: string;
  layoutMode: string;
  aiProvider: string;
  aiModel?: string;
  aiApiKey?: string;
  stripLinks: boolean;
  cache: boolean;
}>();

function isValidProvider(value: string): value is AIProvider {
  return value === 'gemini' || value === 'openai' || value === 'anthropic';
}

/**
 * Extract domain name from URL to use as book title
 */
function getBlogTitle(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const domain = hostname.replace('www.', '').split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1) + ' Collection';
  } catch {
    return 'Blog Collection';
  }
}

/**
 * Ensure output path has correct extension for the format
 */
function ensureCorrectExtension(outputPath: string, format: string): string {
  const ext = path.extname(outputPath);
  const basePath = outputPath.slice(0, -ext.length || outputPath.length);
  
  if (format === 'epub') {
    return ext === '.epub' ? outputPath : `${basePath}.epub`;
  } else {
    return ext === '.pdf' ? outputPath : `${basePath}.pdf`;
  }
}

async function main() {
  try {
    // Validate format option
    const format = options.format.toLowerCase();
    if (format !== 'pdf' && format !== 'epub') {
      console.error('Error: --format must be either "pdf" or "epub"');
      process.exit(1);
    }

    const maxArticles = parseInt(options.max, 10);
    if (isNaN(maxArticles) || maxArticles < 1) {
      console.error('Error: --max must be a positive number');
      process.exit(1);
    }

    const layoutMode = options.layoutMode.toLowerCase();
    if (layoutMode !== 'static' && layoutMode !== 'ai') {
      console.error('Error: --layout-mode must be either "static" or "ai"');
      process.exit(1);
    }

    const providerRaw = options.aiProvider.toLowerCase();
    if (!isValidProvider(providerRaw)) {
      console.error('Error: --ai-provider must be one of "gemini", "openai", "anthropic"');
      process.exit(1);
    }

    // Ensure correct file extension
    const outputPath = ensureCorrectExtension(options.out, format);
    const formatDisplay = format.toUpperCase();

    console.log(`\n📚 ebook-scape - Blog to ${formatDisplay} Converter`);
    console.log(`${'─'.repeat(50)}\n`);

    // Step 1: Discover articles
    const discoverySpinner = ora('Discovering article links...').start();
    const articleUrls = await getArticleLinks(options.url);
    discoverySpinner.succeed(`Found ${articleUrls.length} article(s)`);

    if (articleUrls.length === 0) {
      console.log('\nNo articles found. Please check the URL and try again.');
      process.exit(0);
    }

    // Limit articles if needed
    const urlsToProcess = articleUrls.slice(0, maxArticles);
    if (articleUrls.length > maxArticles) {
      console.log(`\nℹ️  Processing first ${maxArticles} of ${articleUrls.length} articles (use --max to change)`);
    }

    // Step 2: Extract content
    const extractorSpinner = ora(`Extracting content from ${urlsToProcess.length} article(s)...`).start();
    const articles = await extractContent(urlsToProcess, 5, {
      stripLinks: options.stripLinks
    });
    
    if (articles.length === 0) {
      extractorSpinner.fail('No content could be extracted');
      console.log('\nPlease check the URLs and try again.');
      process.exit(1);
    }
    
    extractorSpinner.succeed(`Extracted ${articles.length} article(s) successfully`);

    // Step 3: Generate eBook
    const generatorSpinner = ora(`Generating ${formatDisplay}...`).start();
    
    if (format === 'epub') {
      if (layoutMode === 'ai') {
        generatorSpinner.warn('AI layout mode is PDF-only in v1; EPUB will use static layout.');
        generatorSpinner.start(`Generating ${formatDisplay}...`);
      }
      const blogTitle = getBlogTitle(options.url);
      await buildEPUB(articles, outputPath, blogTitle);
      generatorSpinner.succeed(`EPUB generated successfully: ${outputPath}`);
    } else {
      let aiCSS: string | undefined;
      if (layoutMode === 'ai') {
        const apiKeyFromEnv = process.env[`EBOOK_SCAPE_${providerRaw.toUpperCase()}_API_KEY`];
        const apiKey = options.aiApiKey || apiKeyFromEnv;
        const selectedModel = options.aiModel || getDefaultModel(providerRaw);
        if (!apiKey) {
          generatorSpinner.warn('No API key provided for AI layout, using static layout fallback.');
          generatorSpinner.start(`Generating ${formatDisplay}...`);
        } else {
          try {
            aiCSS = await getAILayout(
              articles,
              {
                provider: providerRaw,
                model: selectedModel,
                apiKey
              },
              !options.cache
            ) ?? undefined;

            if (aiCSS) {
              generatorSpinner.info(`AI CSS generated using ${providerRaw}/${selectedModel}`);
              generatorSpinner.start(`Generating ${formatDisplay}...`);
            } else {
              generatorSpinner.warn('AI layout unavailable or invalid response, using static layout fallback.');
              generatorSpinner.start(`Generating ${formatDisplay}...`);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            generatorSpinner.warn(`AI layout failed (${msg}), using static layout fallback.`);
            generatorSpinner.start(`Generating ${formatDisplay}...`);
          }
        }
      }

      await buildPDF(articles, outputPath, aiCSS);
      generatorSpinner.succeed(`PDF generated successfully: ${outputPath}`);
    }

    // Summary
    console.log(`\n${'─'.repeat(50)}`);
    console.log('✨ Process completed successfully!\n');
    console.log(`📖 Format: ${formatDisplay}`);
    console.log(`📄 Output: ${outputPath}`);
    console.log(`📚 Articles: ${articles.length}`);
    console.log(`${'─'.repeat(50)}\n`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`\n❌ Error: ${errorMessage}`);
    process.exit(1);
  }
}

main();
