// Verify API key setup and Gemini initialization
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 80;

// Initialize the API client with the original prompt
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: "Make a fully fledged static webpage based on the user's request. Make it use CSS, JS, and HTML in one file. Make no other response, just plain code. Make it as visually pleasing as possible, and make it have a full legnth footer at the bottom that says 'Generated by Ducky' (Ducky is a hyperlinking to https://ducky.rhenryw.tech/. Make all websites have multiple themes, like light mode and dark mode, and use icons. Never say something like '..rest of your code' and always print the entire code to make the user's complete idea. Make it always look dynamic, and 3D. And all colors gradient. Also, if it requires an external API, search Google to find one. Also always generate meta tags for everything. Use different colors.",
});

app.use(bodyParser.json());
app.use(express.static('public'));

// Endpoint for generating responses
app.post('/api/generate', async (req, res) => {
    const userInput = req.body.input;

    if (!userInput) {
        console.error("Error: No input provided");
        return res.status(400).json({ error: 'Input is required' });
    }

    console.log("Received input from client:", userInput);

    try {
        const chatSession = model.startChat({
            generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseMimeType: 'text/plain',
            },
            history: [],
        });

        console.log("Chat session started");

        // Send the message to Gemini and wait for the response
        const result = await chatSession.sendMessage(userInput);
        console.log("Received response from Gemini:", result);

        // Check if result exists and has a response
        if (result && result.response && result.response.text) {
            // Call the function to get the actual response text
            const responseText = await result.response.text(); // Invoke the function
            
            // Trim and process the response text if it includes code formatting
            if (responseText.startsWith("```html")) {
                // Extract the code content by removing the triple backticks and language specifier
                const codeContent = responseText.slice(8, responseText.lastIndexOf("```")).trim();
                res.json({ response: codeContent });
            } else {
                res.json({ response: responseText });
            }
        } else {
            console.error("Response format error: Expected structure not found", result);
            res.status(500).json({ error: 'No valid response from Gemini API' });
        }
    } catch (error) {
        // Handle different error types
        if (error.response) {
            console.error("Error with Gemini API response:", error.response.status, error.response.data);
            res.status(error.response.status).json({ error: 'Gemini API error', details: error.response.data });
        } else if (error.request) {
            console.error("Error: No response received from Gemini API. Request details:", error.request);
            res.status(503).json({ error: 'Service unavailable: No response from Gemini API' });
        } else {
            console.error("Unexpected error:", error.message);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    }
});

// Serve the about page
app.get('/about', (req, res) => {
    res.sendFile(__dirname + '/public/about.html'); // Adjust the path as needed
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
