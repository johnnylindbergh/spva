const credentials = require("./credentials");
const nodemailer = require("nodemailer");
const db = require("./database.js");
const { response } = require("express");

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
async function sendEstimateEmail(req, res, takeoff_id, callback) {
  db.getTakeoffById(takeoff_id, (err, takeoff) => {
    if (err) {
      console.log(err);
      callback("big error", null);
    } else {
      console.log(takeoff);
      if (takeoff[0].owner_email && takeoff[0].owner && takeoff[0].passcode) { 
        const mailOptions = {
          from: credentials.serverEmail,
          to: takeoff[0].owner_email,
          subject: "Your Estimate from Sun Painting",
          html: `
            <h3>Hello, ${takeoff[0].owner},</h3>
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
            callback(err, null);
          } else {
            console.log("Email sent: " + info.response);
            console.log(req.user.local);

            
            db.logEmailSent(takeoff_id, req.user.local.id, takeoff[0].owner_email, "Estimate", info.response, (err, result) => {
              if (err) { console.log(err); } 
               callback(null, info.response);
            });
          }
        });
      } else {
        console.log("Some info is missing from this takeoff takeoff.owner, takeoff.owner_email, or takeoff.passcode");
        callback("Some info is missing from this takeoff takeoff.owner, takeoff.owner_email, or takeoff.passcode", null);
      }
    }
  });
}

// same as sendEstimateEmail but email is passed as parameter
async function sendEstimateEmailInternally(takeoff_id, targetEmail, callback) {

  db.getTakeoffById(takeoff_id, (err, takeoff) => {
    if (err) {
      console.log(err);
      callback("big error", null);
    } else {
      console.log(takeoff);
      if (targetEmail && takeoff[0].passcode) {

        // display the email the same way as the owner for consistency.
        const mailOptions = {
          from: credentials.serverEmail,
          to: takeoff[0].owner_email,
          subject: "Your Estimate from Sun Painting",
          html: `
            <h3>Hello, ${takeoff[0].owner},</h3>
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
            callback(err, null);
          } else {
            console.log("Email sent: " + info.response);
            callback(null, info.response);
          }
        });
      } else {
        console.log("Some info is missing from this takeoff takeoff.owner, takeoff.owner_email, or takeoff.passcode");
        callback("Some info is missing from this takeoff takeoff.owner, takeoff.owner_email, or takeoff.passcode", null);
      }
    }
  });
}



module.exports = {
  sendEstimateEmail,
  sendEstimateEmailInternally
};
