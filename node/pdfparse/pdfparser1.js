import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Optional: for fetch in Node.js environment
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

// Path to your PDF file
const pdfPath = path.resolve('./ARCHITECTURE-api-flow.pdf');

async function extractTextFromPDF(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  // Load PDF
  const pdfDocument = await pdfjsLib.getDocument({ data }).promise;
  console.log(`Number of pages: ${pdfDocument.numPages}`);

  // Loop through all pages
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);

    // Extract text content
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    const pageText = strings.join(' ');

    console.log(`--- Page ${pageNum} ---`);
    console.log(pageText);
  }
}

extractTextFromPDF(pdfPath).catch(err => console.error(err));