#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import { crawl } from './crawler.js';
import { extract } from './extractor.js';
import { generate } from './generator.js';

const program = new Command();

program
  .name('ebook-scape')
  .description('Convert blog posts to PDF eBooks')
  .version('1.0.0')
  .requiredOption('-u, --url <url>', 'Target blog URL to scrape')
  .requiredOption('-o, --out <path>', 'Output PDF file path')
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    const crawlerSpinner = ora('Crawling blog content...').start();
    const html = await crawl(options.url);
    crawlerSpinner.succeed('Blog content crawled successfully');

    const extractorSpinner = ora('Extracting readable content...').start();
    const content = await extract(html);
    extractorSpinner.succeed('Readable content extracted successfully');

    const generatorSpinner = ora('Generating PDF...').start();
    await generate(content, options.out);
    generatorSpinner.succeed(`PDF generated successfully: ${options.out}`);

    console.log('\nProcess completed successfully!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`\nError: ${errorMessage}`);
    process.exit(1);
  }
}

main();
