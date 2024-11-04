const credentials = require("./credentials");
const nodemailer = require("nodemailer");
const db = require("./database.js");

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
        subject: "Your Estimate from Sun Painting",
        html: `
          <h2>Hi ${takeoff[0]?.owner_name},</h2>
          <h3>Your estimate is ready.</h3>
          <p>Please click the link below to view it:</p>
          <a href="${credentials.domain}/share/${takeoff[0]?.passcode}">View Estimate</a></br>
          <img style="margin:20px;width:140px;"src="${credentials.domain}/SWAM_LOGO.jpg" alt="Swam Logo"></br>
          <img style="margin:20px;width:140px;"src="${credentials.domain}/sunpainting_logo_blue.png" alt="Sun Painting Logo">
        `,
      };
      
      const info = transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    }
  });
}

module.exports = {
  sendEstimateEmail,
};
