import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

// Path to your PDF file
const pdfPath = path.resolve('./ARCHITECTURE-api-flow.pdf');
const outputDir = path.resolve('./output');

// Ensure output directory exists
await fse.ensureDir(outputDir);

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


async function extractTextAndImagePDF(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfDocument = await pdfjsLib.getDocument({ data }).promise;

  console.log(`Number of pages: ${pdfDocument.numPages}`);

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);

    // --- Extract Text ---
    const textContent = await page.getTextContent();
    const textItems = textContent.items.map(item => item.str).join(' ');
    console.log(`--- Page ${pageNum} Text ---\n${textItems}\n`);

    // Save text to file
    await fse.writeFile(path.join(outputDir, `page_${pageNum}.txt`), textItems);

    // --- Extract Images ---
    const operatorList = await page.getOperatorList();
    
    // Loop through operators to find images
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      // 82 = paintImageXObject, 83 = paintJpegXObject
      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
        const imgName = args[0];
        const img = await page.objs.get(imgName);

        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');

        // Draw raw image data
        const imageData = ctx.createImageData(img.width, img.height);
        imageData.data.set(img.data);
        ctx.putImageData(imageData, 0, 0);

        const imgPath = path.join(outputDir, `page_${pageNum}_${imgName}.png`);
        const buffer = canvas.toBuffer('image/png');
        await fse.writeFile(imgPath, buffer);

        console.log(`Saved image: ${imgPath}`);
      }
    }
  }
}

//extractTextFromPDF(pdfPath).catch(err => console.error(err));
extractTextAndImagePDF(pdfPath).catch(err => console.error(err));
