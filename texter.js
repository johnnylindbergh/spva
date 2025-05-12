const twilio = require('twilio');

const db = require('./database.js'); // Assuming you have a db.js file for database operations
const credentials = require('./credentials.js');

// Import the Twilio module

// Twilio credentials from your Twilio account
const accountSid = credentials.twilio.accountSid // Replace with your Account SID
const authToken = credentials.twilio.authToken  // Replace with your Auth Token


const mid = require('./middleware.js');

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

module.exports = function (app) {

    // page to view and update text profile settings
    app.get('/textProfile', mid.isAdmin, (req, res) => {
      
        
        db.getUserById(req.user.local.id, (err, userData) => {
            if (err) {
                console.error('Error fetching user data:', err);
                return res.status(500).send('Internal Server Error');
            }

            console.log('User data:', userData);
            res.render('textProfile.html', { user: userData });
        });
    });

    app.post('/update-sms-preferences', mid.isAdmin, (req, res) => {
        const smsEnabled = req.body.smsEnabled; // Assuming this is a checkbox in your form
        const userId = req.user.local.id; // Assuming you have the user ID in the session

        // Validate the input
     

        
        console.log('SMS preference:', smsEnabled);
        console.log('User ID:', userId);
        // Update the user's SMS preferences in the database
        db.updateUserSMSPreferences(userId, smsEnabled, (err) => {
            if (err) {
                console.error('Error updating SMS preferences:', err);
                return res.status(500).send('Internal Server Error');
            }

            console.log('SMS preferences updated successfully');
            //res.redirect('/textProfile'); // Redirect to the profile page after updating

            res.send({
                success: true,
                message: 'SMS preferences updated successfully'
            });
        });
    }
    );

}