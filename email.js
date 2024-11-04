const credentials = require('./credentials');
const nodemailer = require('nodemailer');
const db = require('./database.js');

const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: credentials.serverEmail,
      pass: credentials.emailPassword,
    },
  });

// async..await is not allowed in global scope, must use a wrapper
async function sendEstimateEmail(takeoff_id) {
    db.getTakeoffById(takeoff_id, (err, takeoff) => {
        if (err) {
            console.log(err);
        } else {
            console.log(takeoff);
            const mailOptions = {
                from: credentials.serverEmail,
                to: takeoff[0].owner_email,
                subject: 'Your Estimate from Sun Painting',
                text: 'Your estimate is ready. Please click the link below to view it: ' + credentials.domain + '/share/' + takeoff[0].passcode
            };
            const info = transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

        }
    }
    );
    
  

}

module.exports = {
    sendEstimateEmail
};

