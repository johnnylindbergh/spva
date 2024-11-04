const credentials = require('./credentials');
const nodemailer = require('nodemailer');



async function sendEmail(to, subject, text) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: credentials.email,
            pass: credentials.password
        }
    });

    let info = await transporter.sendMail({
        from: credentials.serverEmail,
        to: to,
        subject: subject,
        text: text
    });

    console.log('Message sent: %s', info.messageId);
}

module.exports = {
    sendEmail
};

