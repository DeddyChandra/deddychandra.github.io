// pdfReader.js
// Reads a PDF file from input and displays its text content using PDF.js

// Data structure for PDF holdings
class HoldingRecord {
    constructor({
        DATE = '',
        SHARE_CODE = '',
        ISSUER_NAME = '',
        INVESTOR_NAME = '',
        INVESTOR_TYPE = '',
        LOCAL_FOREIGN = '',
        NATIONALITY = '',
        DOMICILE = '',
        HOLDINGS_SCRIPLESS = 0,
        HOLDINGS_SCRIP = 0,
        TOTAL_HOLDING_SHARES = 0,
        PERCENTAGE = 0
    } = {}) {
        this.DATE = DATE;
        this.SHARE_CODE = SHARE_CODE;
        this.ISSUER_NAME = ISSUER_NAME;
        this.INVESTOR_NAME = INVESTOR_NAME;
        this.INVESTOR_TYPE = INVESTOR_TYPE;
        this.LOCAL_FOREIGN = LOCAL_FOREIGN;
        this.NATIONALITY = NATIONALITY;
        this.DOMICILE = DOMICILE;
        this.HOLDINGS_SCRIPLESS = HOLDINGS_SCRIPLESS;
        this.HOLDINGS_SCRIP = HOLDINGS_SCRIP;
        this.TOTAL_HOLDING_SHARES = TOTAL_HOLDING_SHARES;
        this.PERCENTAGE = PERCENTAGE;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('pdfFileInput');
    const readBtn = document.getElementById('readPdfBtn');

    // Create a container for PDF text output
    let outputDiv = document.getElementById('pdfTextOutput');
    if (!outputDiv) {
        outputDiv = document.createElement('div');
        outputDiv.id = 'pdfTextOutput';
        outputDiv.style.marginTop = '20px';
        document.body.appendChild(outputDiv);
    }

    readBtn.addEventListener('click', function () {
        const file = fileInput.files[0];
        if (!file) {
            outputDiv.textContent = 'Please select a PDF file.';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const typedarray = new Uint8Array(e.target.result);
            pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
                let textPromises = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    textPromises.push(
                        pdf.getPage(i).then(function (page) {
                            return page.getTextContent().then(function (content) {
                                return content.items.map(item => item.str).join(' ');
                            });
                        })
                    );
                }
                Promise.all(textPromises).then(function (pagesText) {
                    // Combine all pages into one text
                    const allText = pagesText.join('\n');
                    // Attempt to find table rows (split by newlines)
                    const lines = allText.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
                    console.log('Extracted lines:', lines);
                    // Find header line (assume it contains all field names)
                    const headerFields = [
                        'DATE', 'SHARE_CODE', 'ISSUER_NAME', 'INVESTOR_NAME', 'INVESTOR_TYPE',
                        'LOCAL_FOREIGN', 'NATIONALITY', 'DOMICILE', 'HOLDINGS_SCRIPLESS',
                        'HOLDINGS_SCRIP', 'TOTAL_HOLDING_SHARES', 'PERCENTAGE'
                    ];
                    let headerIdx = lines.findIndex(line => headerFields.every(f => line.toUpperCase().includes(f)));
                    console.log('Header index:', headerIdx, 'Header line:', lines[headerIdx]);
                    let records = [];
                    let valueArrays = [];
                    if (headerIdx !== -1) {
                        // Parse each row after the header (skip header itself)
                        for (let i = headerIdx + 1; i < lines.length; i++) {
                            // Try splitting by multiple spaces or tabs
                            let cols = lines[i].split(/\s{2,}|\t/);
                            // If not enough columns, try splitting by single space
                            if (cols.length < headerFields.length) {
                                cols = lines[i].split(/\s+/);
                            }
                            // Skip rows that look like header (e.g., contain all header fields)
                            if (headerFields.every(f => cols.includes(f))) continue;
                            if (cols.length >= headerFields.length) {
                                let recordObj = {};
                                for (let j = 0; j < headerFields.length; j++) {
                                    recordObj[headerFields[j]] = cols[j] || '';
                                }
                                records.push(new HoldingRecord(recordObj));
                                valueArrays.push(headerFields.map((_, idx) => cols[idx] || ''));
                            }
                        }
                    }
                    if (records.length === 0) {
                        outputDiv.innerHTML = '<b>Warning:</b> No table data found.<br>Check the browser console for extracted lines and header detection.';
                    } else {
                        outputDiv.innerHTML =
                            '<b>Array of Objects:</b><br><pre>' + JSON.stringify(records, null, 2) + '</pre>' +
                            '<b>Array of Arrays (values only):</b><br><pre>' + JSON.stringify(valueArrays, null, 2) + '</pre>';
                    }
                });
            }, function (error) {
                outputDiv.textContent = 'Error reading PDF: ' + error.message;
            });
        };
        reader.readAsArrayBuffer(file);
    });
});
