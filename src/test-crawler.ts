#!/usr/bin/env node

import { getArticleLinks } from './crawler.js';

async function testGetArticleLinks() {
  const testUrl = process.argv[2];
  
  if (!testUrl) {
    console.error('Usage: node dist/test-crawler.js <blog-url>');
    console.error('Example: node dist/test-crawler.js https://example.com/blog');
    process.exit(1);
  }

  console.log(`\n🔍 Fetching article links from: ${testUrl}\n`);
  
  try {
    const links = await getArticleLinks(testUrl);
    
    console.log(`✅ Found ${links.length} article links:\n`);
    
    links.forEach((link, index) => {
      console.log(`${index + 1}. ${link}`);
    });
    
    console.log(`\n✅ Total: ${links.length} unique article URLs`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

testGetArticleLinks();
