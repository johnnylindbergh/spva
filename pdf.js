'use strict';

const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { parse: json2csv } = require('json2csv');
const mid = require('./middleware.js');
const creds = require('./credentials');
const db = require('./database.js');
const { name } = require('ejs');



const path = require('path');

var html_to_pdf = require('html-pdf-node');


// use html-pdf-node to generate pdf of sov-template.ejs
const generateSOVPDF = (data, callback) => {
    const templatePath = path.join(__dirname, 'views', 'sov_template.ejs');

    // Render the EJS template with the data
    const ejs = require('ejs');
    const template = fs.readFileSync(templatePath, 'utf-8');
    const html = ejs.render(template, data);
    const options = {
        format: 'A4',
        margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
        }
    };

    // Create a PDF from the HTML
    html_to_pdf.generatePdf({ content: html }, options)
        .then(pdfBuffer => {
            callback(null, pdfBuffer);
        })
        .catch(err => {
            console.error('Error generating PDF:', err);
            callback(err);
        });
}

// Function to generate PDF for an invoice

const generateInvoicePdf = (data, callback) => {
    const templatePath = path.join(__dirname, 'views', 'invoice_template.ejs');

    // Render the EJS template with the data
    const ejs = require('ejs');
    const template = fs.readFileSync(templatePath, 'utf-8');
    const html = ejs.render(template, data);
    const options = {
        format: 'A4',
        margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
        }
    };

    // Create a PDF from the HTML
    html_to_pdf.generatePdf({ content: html }, options)
        .then(pdfBuffer => {
            const invoiceNumber = data.invoiceNumber || 'invoice';
            const filePath = path.join(__dirname, 'output', `${Date.now()}.pdf`);
            
            fs.writeFile(filePath, pdfBuffer, (err) => {
                if (err) {
                    console.error('Error saving PDF file:', err);
                    callback(err);
                } else {
                    console.log(`PDF saved successfully at ${filePath}`);
                    callback(null, filePath);
                }
            });
        })
        .catch(err => {
            console.error('Error generating PDF:', err);
            callback(err);
        });
}







module.exports = {
    generateSOVPDF: generateSOVPDF,
    generateInvoicePdf: generateInvoicePdf,
   
};