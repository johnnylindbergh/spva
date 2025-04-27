const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const creds = require('./credentials.js'); // Ensure you have your OpenAI credentials in this file

const app = express();
const upload = multer({ dest: 'uploads/' });

// OpenAI API configuration
const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY, // Set your OpenAI API key in environment variables
    })
);

// start point 
app.get('/', (req, res) => {
    res.render('aiEstimate.ejs', { title: 'AI Estimate Generator' });
});



// Endpoint to upload PDF and scope of work
app.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        const pdfPath = req.file.path;
        const scopeOfWork = req.body.scopeOfWork || '';

        // Read the PDF file (you can use a library like pdf-parse to extract text)
        const pdfText = await extractTextFromPDF(pdfPath);

        // Combine PDF text and scope of work
        const inputText = `${pdfText}\n\nScope of Work:\n${scopeOfWork}`;

        // Generate estimate using ChatGPT fine-tuned model
        const estimate = await generateEstimate(inputText);

        // Clean up uploaded file
        fs.unlinkSync(pdfPath);

        res.json({ success: true, estimate });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});

// Function to extract text from PDF (placeholder)
async function extractTextFromPDF(pdfPath) {
    // Use a library like pdf-parse or pdf-lib to extract text
    return 'Extracted text from PDF (placeholder)';
}

// Function to generate estimate using ChatGPT fine-tuned model
async function generateEstimate(inputText) {
    const response = await openai.createCompletion({
        model: 'text-davinci-003', // Replace with your fine-tuned model
        prompt: inputText,
        max_tokens: 1500,
    });

    return response.data.choices[0].text.trim();
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});