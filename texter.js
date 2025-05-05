const twilio = require('twilio');

const db = require('./database.js'); // Assuming you have a db.js file for database operations
const credentials = require('./credentials.js');

// Import the Twilio module

// Twilio credentials from your Twilio account
const accountSid = credentials.twilio.accountSid // Replace with your Account SID
const authToken = credentials.twilio.authToken  // Replace with your Auth Token

// Create a Twilio client
const client = twilio(accountSid, authToken);

// Function to send a text notification
function sendTextNotification(user, message) {
    client.messages
        .create({
            body: message, // Message content
            from: credentials.twilio.from, // Replace with your Twilio phone number
            to: user.phone_number // Recipient's phone number
        })
        .then(message => console.log(`Message sent with SID: ${message.sid}`))
        .catch(error => console.error('Error sending message:', error));
}

// Example usage
//sendTextNotification('+19876543210', 'Hello! This is a test notification from Twilio.');

module.exports = {
    sendTextNotification
};