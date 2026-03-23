#!/usr/bin/env node

import { buildPDF, Article } from './generator.js';

/**
 * Test the buildPDF function with sample articles
 */
async function testBuildPDF() {
  const outputPath = process.argv[2] || 'output/test-ebook.pdf';

  const sampleArticles: Article[] = [
    {
      title: 'Introduction to TypeScript',
      contentHTML: `
        <h2>What is TypeScript?</h2>
        <p>TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.</p>
        
        <h3>Key Features</h3>
        <ul>
          <li>Static type checking</li>
          <li>Enhanced IDE support</li>
          <li>Modern JavaScript features</li>
        </ul>
        
        <p>TypeScript code compiles to clean, readable JavaScript that runs on any browser, in Node.js, or in any JavaScript engine that supports ECMAScript 3 (or newer).</p>
        
        <h3>Example Code</h3>
        <pre><code>function greet(name: string): string {
  return "Hello, " + name;
}</code></pre>
      `
    },
    {
      title: 'Getting Started with Node.js',
      contentHTML: `
        <h2>Introduction</h2>
        <p>Node.js is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser.</p>
        
        <h3>Installation</h3>
        <ol>
          <li>Download Node.js from the official website</li>
          <li>Run the installer</li>
          <li>Verify installation with <code>node --version</code></li>
        </ol>
        
        <blockquote>
          Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient.
        </blockquote>
        
        <h3>First Application</h3>
        <p>Create a simple HTTP server:</p>
        <pre><code>const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World!');
});

server.listen(3000);</code></pre>
      `
    },
    {
      title: 'Building Web Applications',
      contentHTML: `
        <h2>Modern Web Development</h2>
        <p>Building modern web applications requires understanding of multiple technologies and best practices.</p>
        
        <h3>Frontend Technologies</h3>
        <ul>
          <li>HTML5 - Structure</li>
          <li>CSS3 - Styling</li>
          <li>JavaScript - Behavior</li>
          <li>React/Vue/Angular - Frameworks</li>
        </ul>
        
        <h3>Backend Technologies</h3>
        <ul>
          <li>Node.js with Express</li>
          <li>Python with Django/Flask</li>
          <li>Java with Spring Boot</li>
          <li>Go with Gin</li>
        </ul>
        
        <h3>Best Practices</h3>
        <table>
          <thead>
            <tr>
              <th>Practice</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Code Organization</td>
              <td>Keep your code modular and maintainable</td>
            </tr>
            <tr>
              <td>Testing</td>
              <td>Write unit and integration tests</td>
            </tr>
            <tr>
              <td>Documentation</td>
              <td>Document your code and APIs</td>
            </tr>
          </tbody>
        </table>
      `
    }
  ];

  console.log(`\n📚 Testing PDF generation with ${sampleArticles.length} sample articles...\n`);

  try {
    await buildPDF(sampleArticles, outputPath);
    console.log(`\n✅ Test completed successfully!`);
    console.log(`📄 PDF file created at: ${outputPath}`);
    console.log(`\nYou can open the PDF to verify:`);
    console.log(`- Table of Contents with clickable links`);
    console.log(`- Each article on a new page`);
    console.log(`- Proper formatting and styling`);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

testBuildPDF();
