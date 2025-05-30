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
const PDFDocument = require('pdfkit');
const doc = require('pdfkit');


function numbersWithCommas(x) {
    if (x === null || x === undefined) {
        return '0.00';
    }
    x = parseFloat(x);
    if (isNaN(x)) {
        return '0.00';
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
// Function to generate PDF of SOV


// Use PDFKit to generate PDF of sov-template.ejs
const generateSOVPDF = (data, callback) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            callback(null, pdfBuffer);
        });


        // set style
        doc.font("Times-Roman");
        doc.fontSize(12);
        // add logo
        const logoPath = path.join(__dirname, 'public/sunpainting_logo_blue.png');
        if (fs.existsSync(logoPath)) {
            const imageX = (doc.page.width - 128) / 2; // Center the image horizontally
            doc.image(logoPath, imageX, 0, { width: 128 });
        } else {
            console.error('Logo file not found:', logoPath);
        }
        doc.moveDown(4);
        // Add company details if available

        // Add header
        doc.fontSize(20).text(creds.companyName, { align: 'center', bold: true });
        doc.fontSize(12).text(creds.companyAddress, { align: 'center' });
        doc.moveDown(2);

        // Add SOV details
        doc.fontSize(16).text('Schedule of Values', { align: 'center', underline: true });
        doc.moveDown();
        doc.fontSize(12).text(`SOV Name: ${data.sov.name}`, { continued: true }).text(`   SOV ID: ${data.sov.id}`);
        doc.text(`Total: $${data.sov.total}`, { continued: true }).text(`   Created At: ${new Date(data.sov.created_at).toLocaleDateString()}`);
        doc.moveDown(2);

        // Add customer details
        doc.fontSize(14).text('Bill To', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(`Name: ${data.customer.givenName}`);
        doc.text(`Company: ${data.customer.CompanyName}`);
        doc.text(`Billing Address: ${data.customer.billing_address}`);
        doc.text(`Phone: ${data.customer.phone}`);
        doc.text(`Email: ${data.customer.invoice_email_address}`);
        doc.moveDown(2);

        // Add items table
        doc.fontSize(14).text('Items', { underline: true });
        doc.moveDown();
        // Define table headers
        const tableTop = doc.y;
        const descriptionWidth = 100;
        const contractedWidth = 120;
        const thisWidth = 100;
        const remainingWidth = 100;
        const percentWidth = 80;


        doc.fontSize(9).text('Description', 50, tableTop, { bold: true });
        doc.text('Total Contracted Amount', 50 + descriptionWidth, tableTop, { bold: true });
        doc.text('This Invoiced Amount', 50 + descriptionWidth + contractedWidth , tableTop, { bold: true });
        doc.text('Remaining', 50 + descriptionWidth + contractedWidth+ thisWidth , tableTop, { bold: true });
        doc.text('Percent Remaining', 50 + descriptionWidth + contractedWidth + thisWidth+ remainingWidth, tableTop, { bold: true });
        // Draw a line under the headers
        doc.moveTo(50, tableTop + 15)
            .lineTo(50 + descriptionWidth + contractedWidth + thisWidth + remainingWidth + percentWidth, tableTop + 15)
            .stroke();

        // Add table rows
        let rowTop = tableTop + 25;
        data.items.forEach((item) => {
            doc.fontSize(12).text(item.description, 50, rowTop);
            doc.text(`$${item.total_contracted_amount}`, 50 + descriptionWidth, rowTop);
            doc.text(`$${item.this_invoiced_amount}`, 50 + descriptionWidth + contractedWidth, rowTop);

            const remaining = parseFloat(item.total_contracted_amount) - parseFloat(item.this_invoiced_amount);
            const percentRemaining = (remaining / parseFloat(item.total_contracted_amount)) * 100;
            doc.text(`$${remaining}`, 50 + descriptionWidth + contractedWidth  + thisWidth, rowTop);
            doc.text(`${percentRemaining.toFixed(2)}%`, 50 + descriptionWidth + contractedWidth+thisWidth+ remainingWidth, rowTop);
            rowTop += 20; // Move to the next row
        });

        // Add footer
      //  doc.moveDown(2);
      //  doc.fontSize(10).text(`Generated by ${data.defaults.sysName}`, { align: 'center', italic: true });
        doc.end();
    } catch (err) {
        console.error('Error generating SOV PDF:', err);
        callback(err);
    }
};

// Function to generate PDF for an invoice
const generateInvoicePdf = (data, callback) => {
    console.log('Generating invoice PDF with data:', data);
    try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
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
        });

        doc.font("Times-Roman");
        doc.fontSize(12);

        // Add header
       // doc.fontSize(20).text(data.invoice.invoice_name, { align: 'center', underline: true });

        doc.moveDown(2);
        // add logo
        const logoPath = path.join(__dirname, 'public/sunpainting_logo_blue.png');
        if (fs.existsSync(logoPath)) {
            const imageX = (doc.page.width - 128) / 2; // Center the image horizontally
            doc.image(logoPath, imageX, 0, { width: 128 });
        } else {
            console.error('Logo file not found:', logoPath);
        }

        doc.moveDown(2);

        // Add company details if available
        if (data.defaults && data.defaults.companyName) {
            doc.fontSize(16).text(creds.companyName, { align: 'center', bold: true });
        }

        if (data.defaults && creds.companyAddress) {
            doc.fontSize(12).text(data.defaults.companyAddress, { align: 'center' });
        }
        doc.moveDown();
        // Add invoice details
        doc.fontSize(12).text(`Invoice Number: ${data.invoice.invoice_number || 'N/A'}`, { continued: true })
            .text(`   Date: ${new Date(data.invoice.created_at).toLocaleDateString() || 'N/A'}`);
            // Add invoice due date
            if (data.invoice.due_date) {
                doc.text(`   Due Date: ${new Date(data.invoice.due_date).toLocaleDateString() || 'N/A'}`);
            }
        doc.moveDown();
        doc.text(`To: ${data.takeoff[0].customer_givenName || 'N/A'}`);
        doc.text(`Company: ${data.takeoff[0].customer_CompanyName || 'N/A'}`);
        doc.text(`Billing Address: ${data.takeoff[0].customer_billing_address || 'N/A'}`);
        doc.moveDown(2);

        // Add items table
        doc.fontSize(14).text('Items', { underline: true });
        doc.moveDown();
        // Define table headers
        const tableTop = doc.y;
        const itemWidth = 200;
        const quantityWidth = 70;
        const costWidth = 100;
        const totalWidth = 300;

        doc.fontSize(12).text('Description', 50, tableTop, { bold: true });
        doc.text('Quantity', 50 + itemWidth, tableTop, { bold: true });
        doc.text('Cost per Unit', 50 + itemWidth + quantityWidth, tableTop, { bold: true });
        doc.text('Total', 50 + itemWidth + quantityWidth + costWidth, tableTop, { bold: true });

        // Draw a line under the headers
        doc.moveTo(50, tableTop + 15)
            .lineTo(50 + itemWidth + quantityWidth + costWidth + totalWidth, tableTop + 15)
            .stroke();

        // Add table rows
        let rowTop = tableTop + 25;
        data.invoice_items.forEach((item) => {
            doc.fontSize(12).text(item.description, 50, rowTop);
            doc.text(item.quantity, 50 + itemWidth, rowTop);
            doc.text(`$${item.cost}`, 50 + itemWidth + quantityWidth, rowTop);
            doc.text(`$${item.total}`, 50 + itemWidth + quantityWidth + costWidth, rowTop);
            rowTop += 20; // Move to the next row
        });

        // Add total amount
        doc.moveDown(2);
        doc.fontSize(14).text(`Total Amount: $${data.totalAmount}`, { align: 'right', bold: true });
        doc.moveDown(2);


      

        // Add footer
        doc.fontSize(10).text('Thank you for your business!', { align: 'center', italic: true });


    

        doc.end();
    } catch (err) {
        console.error('Error generating PDF:', err);
        callback(err);
    }
};


function generateEstimatePDF(estimate, callback) {
    console.log('Generating estimate PDF with data:', estimate);
    try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            callback(null, pdfBuffer);
        });

        // --- HEADER WITH LOGO ---
        doc.font("Times-Roman").fontSize(12);
        const logoPath = path.join(__dirname, 'public/sunpainting_logo_blue.png');
        if (fs.existsSync(logoPath)) {
            const imageX = (doc.page.width - 128) / 2;
            doc.image(logoPath, imageX, doc.y, { width: 128 });
            doc.moveDown(2);
        }

        // --- COMPANY DETAILS ---
        if (creds.companyAddress) {
            doc.fontSize(12).text(creds.companyAddress, { align: 'center' });
        }
        doc.moveDown(2);

        // --- ESTIMATE DETAILS ---
        const details = [
            [`Date:`, new Date(estimate.takeoff.takeoff_created_at).toLocaleDateString() || 'N/A'],
            estimate.takeoff.takeoff_start_date ? [`Start Date:`, new Date(estimate.takeoff.takeoff_start_date).toLocaleDateString() || 'N/A'] : null,
            [`To:`, estimate.takeoff.customer_givenName || 'N/A'],
            [`Company:`, estimate.takeoff.customer_CompanyName || 'N/A'],
            [`Billing Address:`, estimate.takeoff.customer_billing_address || 'N/A'],
            [`Phone:`, estimate.takeoff.customer_phone || 'N/A'],
            [`Email:`, estimate.takeoff.customer_invoice_email_address || 'N/A'],
            estimate.takeoff.creator_name ? [`Sales Person:`, estimate.takeoff.creator_name] : null,
            estimate.takeoff.creator_email ? [`Sales Person Email:`, estimate.takeoff.creator_email] : null,
        ].filter(Boolean);

        details.forEach(([label, value]) => {
            doc.text(`${label} ${value}`);
        });
        doc.moveDown(2);

        // --- INCLUSIONS & EXCLUSIONS TABLE ---
        const startY = doc.y;
        const descriptionX = 50;
        const totalX = 450;
        const sectionLabelOptions = { underline: true };

        // Table header
        doc.font("Times-Bold").fontSize(12)
           .text('Description', descriptionX, doc.y)
           .text('Total', totalX, startY);
        doc.font("Times-Roman");
        doc.moveTo(descriptionX, doc.y + 5).lineTo(totalX + 90, doc.y + 5).stroke();
        doc.moveDown(1.2);

        // Inclusions row
        doc.font("Times-Bold").text('Inclusions', descriptionX, doc.y);
        doc.font("Times-Roman").text(`$${numbersWithCommas(estimate.takeoff.takeoff_total) || '0.00'}`, totalX, doc.y, { align: 'right' });
        doc.moveDown(0.7);

        // Inclusions text
        let inclusion = estimate.estimate.inclusions || 'N/A';
        inclusion = cleanHTML(inclusion);
        doc.fontSize(11).text(inclusion, descriptionX + 15, doc.y, { width: totalX - descriptionX - 25 });
        doc.moveDown(1.5);

        // Divider line
        doc.moveTo(descriptionX, doc.y).lineTo(totalX + 90, doc.y).stroke();
        doc.moveDown(0.7);

        // Exclusions row
        doc.font("Times-Bold").fontSize(12).text('Exclusions', descriptionX, doc.y);
        doc.font("Times-Roman").text(`$${numbersWithCommas(estimate.estimate.exclusion_total) || '0.00'}`, totalX, doc.y, { align: 'right' });
        doc.moveDown(0.7);

        let exclusion = estimate.estimate.exclusions || 'N/A';
        exclusion = cleanHTML(exclusion);
        doc.fontSize(11).text(exclusion, descriptionX + 15, doc.y, { width: totalX - descriptionX - 25 });
        doc.moveDown(2);

        // --- OPTIONS TABLE ---
        doc.font("Times-Bold").fontSize(14).text('Options', { underline: true });
        doc.moveDown(1);

        // Option headers
        doc.fontSize(12).text('Option', descriptionX, doc.y)
                        .text('Total', totalX, doc.y, { align: 'right' });
        doc.moveTo(descriptionX, doc.y + 5).lineTo(totalX + 90, doc.y + 5).stroke();
        doc.moveDown(1.2);


        let optionsTotal = 0;
        // Options list
        if (estimate.options && estimate.options.length > 0) {
            estimate.options.forEach((item) => {
                const total = parseFloat(item.labor_cost) + parseFloat(item.material_cost);
                optionsTotal += total;
                let formattedTotal = numbersWithCommas(total.toFixed(2));
                doc.font("Times-Roman").fontSize(12)
                   .text(item.description || 'N/A', descriptionX, doc.y)
                   .text(`$${formattedTotal || '0.00'}`, totalX, doc.y, { align: 'right' });
                doc.moveDown(1);
            });
        } else {
            doc.font("Times-Roman").fontSize(12).text('No items available.', descriptionX, doc.y);
            doc.moveDown();
        }


        console.log('Options total:', optionsTotal);
        console.log('Takeoff total:', estimate.takeoff.takeoff_total);
        const finalTotal = (parseFloat(estimate.takeoff.takeoff_total) + parseFloat(optionsTotal)).toFixed(2);
        console.log('Final total:', finalTotal);
        // --- TOTAL AMOUNT ---
        doc.moveDown(2);
        doc.font("Times-Bold").fontSize(14)
           .text(`Total Amount: $${numbersWithCommas(finalTotal) || '0.00'}`,
                 { align: 'right' });
        doc.font("Times-Roman");

    

        // --- TERMS & CONDITIONS ---
        if (estimate.takeoff.terms) {
  
            doc.moveDown();
            doc.moveDown(1);
            doc.font("Times-Roman").fontSize(12).text(
                cleanHTML(estimate.takeoff.terms),
                50, doc.y,
                { width: doc.page.width - 100, align: 'left' }
            );
        }

      
      

        doc.end();
    } catch (err) {
        console.error('Error generating PDF:', err);
        callback(err);
    }
}


// Helper function to clean HTML content
function cleanHTML(text) {
    return text.replace(/<br\s*\/?>/gi, '\n')
               .replace(/&nbsp;/g, ' ')
               .replace(/<[^>]+>/g, '')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>');
}

// function generateSubcontractorFormPDF(formData, callback) {



module.exports = {
    generateSOVPDF: generateSOVPDF,
    generateInvoicePdf: generateInvoicePdf,
    generateEstimatePDF: generateEstimatePDF,
};
