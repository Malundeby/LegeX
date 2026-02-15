/**
 * Script for å generere MADRS pasientskjema PDF
 * Kjør: npm install puppeteer && node scripts/generate-madrs-pdf.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function generatePDF() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const htmlPath = path.join(__dirname, '../public/pdfs/madrs-pasient.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  
  const pdfPath = path.join(__dirname, '../public/pdfs/madrs-skjema.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  
  console.log(`PDF generert: ${pdfPath}`);
  await browser.close();
}

generatePDF().catch(console.error);
