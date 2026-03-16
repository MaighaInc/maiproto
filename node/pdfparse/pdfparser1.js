import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import Tesseract from 'tesseract.js';
// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

// Path to your PDF file
const pdfPath = path.resolve('./file-example_PDF_500_kB.pdf');
const outputDir = path.resolve('./output');
const combinedTextFile = path.join(outputDir, 'combined_text.txt');

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


async function extractWithOCRPDF(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfDocument = await pdfjsLib.getDocument({ data }).promise;
  console.log(`PDF loaded: ${pdfDocument.numPages} pages`);

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    console.log(`\n--- Page ${pageNum} ---`);

    // --- 1. Extract Text ---
    const textContent = await page.getTextContent();
    let pageText = textContent.items.map(item => item.str).join(' ');

    // If no text found, fallback to OCR later
    let ocrNeeded = false;
    if (!pageText || pageText.trim().length === 0) {
      ocrNeeded = true;
    }

    // --- 2. Extract Images ---
    const operatorList = await page.getOperatorList();
    const imagePaths = [];

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      // Image operators
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
        await fse.writeFile(imgPath, canvas.toBuffer('image/png'));
        imagePaths.push(imgPath);
        console.log(`Saved image: ${imgPath}`);
      }
    }

    // --- 3. OCR for image-only pages or images without text ---
    if (ocrNeeded && imagePaths.length > 0) {
      console.log('Running OCR for image-based content...');
      for (const imgPath of imagePaths) {
        const { data: { text } } = await Tesseract.recognize(imgPath, 'eng', {
          logger: m => console.log(m.status, m.progress)
        });
        pageText += text + '\n';
      }
    }

    // --- 4. Save text to file ---
    const textFilePath = path.join(outputDir, `page_${pageNum}.txt`);
    await fse.writeFile(textFilePath, pageText);
    console.log(`Saved text: ${textFilePath}`);
  }
}


async function extractOptimizedPDF(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfDocument = await pdfjsLib.getDocument({ data }).promise;
  console.log(`PDF loaded: ${pdfDocument.numPages} pages`);

  let combinedText = '';

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    console.log(`\n--- Page ${pageNum} ---`);

    // --- 1. Extract Text ---
    const textContent = await page.getTextContent();
    let pageText = textContent.items.map(item => item.str).join(' ');

    let ocrNeeded = !pageText || pageText.trim().length === 0;

    // --- 2. Extract Images ---
    const operatorList = await page.getOperatorList();
    const pageImagePaths = [];

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
        const imgName = args[0];
        const img = await page.objs.get(imgName);

        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');

        const imageData = ctx.createImageData(img.width, img.height);
        imageData.data.set(img.data);
        ctx.putImageData(imageData, 0, 0);

        const imgPath = path.join(outputDir, `page_${pageNum}_${imgName}.png`);
        await fse.writeFile(imgPath, canvas.toBuffer('image/png'));
        pageImagePaths.push(imgPath);
        console.log(`Saved image: ${imgPath}`);
      }
    }

    // --- 3. OCR fallback if needed ---
    if (ocrNeeded && pageImagePaths.length > 0) {
      console.log('Running OCR for image-only page...');
      for (const imgPath of pageImagePaths) {
        const { data: { text } } = await Tesseract.recognize(imgPath, 'eng', {
          logger: m => console.log(`OCR [Page ${pageNum}]:`, m.status, Math.round(m.progress*100)+'%')
        });
        pageText += text + '\n';
      }
    }

    // --- 4. Append page text to combined output ---
    combinedText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
  }

  // Save combined text to single file
  await fse.writeFile(combinedTextFile, combinedText);
  console.log(`\nAll text saved to: ${combinedTextFile}`);
}


//extractTextFromPDF(pdfPath).catch(err => console.error(err));/
//extractTextAndImagePDF(pdfPath).catch(err => console.error(err));
//extractWithOCRPDF(pdfPath).catch(err => console.error(err));
extractOptimizedPDF(pdfPath).catch(err => console.error(err));