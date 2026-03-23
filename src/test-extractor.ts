#!/usr/bin/env node

import { extractContent } from './extractor.js';

async function testExtractContent() {
  const urls = process.argv.slice(2);
  
  if (urls.length === 0) {
    console.error('Usage: node dist/test-extractor.js <url1> [url2] [url3] ...');
    console.error('Example: node dist/test-extractor.js https://example.com/article1 https://example.com/article2');
    process.exit(1);
  }

  console.log(`\n📖 Extracting content from ${urls.length} URL(s)...\n`);
  
  try {
    const articles = await extractContent(urls);
    
    console.log(`\n✅ Successfully extracted ${articles.length} article(s):\n`);
    
    articles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Content length: ${article.contentHTML.length} characters`);
      console.log(`   Preview: ${article.contentHTML.substring(0, 150).replace(/\n/g, ' ')}...\n`);
    });
    
    console.log(`✅ Total: ${articles.length} articles extracted`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

testExtractContent();
