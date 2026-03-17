import fs from 'fs';
import { PDFParse } from 'pdf-parse';

// Load your PDF file
const pdfBuffer = fs.readFileSync('./ARCHITECTURE-api-flow.pdf');

async function parsePDF1() {
    const parser = new PDFParse({ data: pdfBuffer });

    try {
        // Get text content
        const textResult = await parser.getText();
        console.log("Text content:", textResult.text);

        // Get metadata
        const infoResult = await parser.getInfo();
        console.log("Number of pages:", infoResult.total);
        console.log("Info:", infoResult.info);
        console.log("Version:", infoResult.version);
    } catch (err) {
        console.error("Error parsing PDF:", err);
    } finally {
        await parser.destroy();
    }
}

parsePDF1();
