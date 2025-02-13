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
      callback("could not get takeoffs by id", null);
    } else {
      console.log(takeoff);
      if (takeoff[0].customer_primary_email_address && takeoff[0].customer_givenName && takeoff[0].takeoff_hash) { 
        const mailOptions = {
          from: credentials.serverEmail,
          to: takeoff[0].customer_primary_email_address,
          subject: "Your Estimate from Sun Painting",
          html: `
            <h3>Hello, ${takeoff[0].customer_givenName},</h3>
            <h3>Your estimate is ready.</h3>
            <p>Please click the link below to view it:</p>
            <a href="${credentials.domain}/share/?hash=${takeoff[0]?.takeoff_hash}">View Estimate</a></br>
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

            
            db.logEmailSent(takeoff_id, req.user.local.id, takeoff[0].customer_primary_email_address, "Estimate", info.response, (err, result) => {
              if (err) { console.log(err); } 
               callback(null, info.response);
            });


          }
        });
      } else {
        console.log("Some info is missing from this takeoff takeoff.owner, takeoff.owner_email, or takeoff.hash");
        callback("Some info is missing from this takeoff takeoff.owner, takeoff.owner_email, or takeoff.hash", null);
      }
    }
  });
}

// same as sendEstimateEmail but email is passed as parameter
async function sendEstimateEmailInternally(req, res, takeoff_id, targetEmail, callback) {

  db.getTakeoffById(takeoff_id, (err, takeoff) => {
    if (err) {
      console.log(err);
      callback("could not get takeoff by id", null);
    } else {
      console.log(takeoff);
      if (targetEmail && takeoff[0].takeoff_hash) {

        // display the email the same way as the owner for consistency.
        const mailOptions = {
          from: credentials.serverEmail,
          to: targetEmail,
          subject: "Your Estimate from Sun Painting",
          html: `
            <h3>Hello, ${takeoff[0].customer_givenName},</h3>
            <h3>Your estimate is ready.</h3>
            <p>Please click the link below to view it:</p>
            <a href="${credentials.domain}/share/?hash=${takeoff[0]?.takeoff_hash}">View Estimate</a></br>
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
        console.log("Some info is missing from this takeoff takeoff.owner, takeoff.owner_email, or takeoff.hash");
        callback("Some info is missing from this takeoff takeoff.owner, takeoff.owner_email, or takeoff.hash", null);
      }
    }
  });
}


async function sendInvoiceEmail(req, res, takeoff_id, invoice_id, callback) {
  db.getTakeoffById(takeoff_id, (err, takeoff) => {
    if (err || !takeoff) {
      console.log(err);
      callback("could not get takeoff by id", null);
    } else {
      console.log(takeoff);
      if (takeoff[0].customer_invoice_email_address && takeoff[0].customer_givenName) {
        db.getInvoiceById(invoice_id, (err, invoice) => {
          if (err || !invoice) {
            console.log(err);
            callback("could not get invoice by id", null);
          } else {
            console.log(invoice);
            if (invoice.invoice_hash) {
              const mailOptions = {
                from: credentials.serverEmail,
                to: takeoff[0].customer_invoice_email_address,
                subject: "Your Invoice from Sun Painting",
                html: `
                  <h3>Hello, ${takeoff[0].customer_givenName},</h3>
                  <h3>Your invoice is ready.</h3>
                  <p>Please click the link below to view it:</p>
                  <a href="${credentials.domain}/shareInvoice/?hash=${invoice?.invoice_hash}">View Invoice</a></br>
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
              console.log("Some info is missing from this invoice invoice.hash");
              callback("Some info is missing from this invoice invoice.hash", null);
            }
          }
        }
        );
      }
    }
  });
}

async function sendExpiredEstimateEmail(estimate_id, callback) {
 
  // use the takeoff id to get the email address of the owner

  db.getEstimateById(estimate_id, (err, estimate) => {
    if (err) {
      console.log(err);
      callback("could not get estimate by id", null);
    } else {  
      db.getUserById(estimate.creator_id, (err, user) => {
        if (err) {
          console.log(err);
          callback("could not get user by id ", null);
        } else {  
          const mailOptions = {
            from: credentials.serverEmail,
            to: user.email,
            subject: "Your Estimate from Sun Painting",
            html: `
              <h3>Hello, ${user.name},</h3>
              <h3>Your estimate has expired.</h3>
              <p>Please click the link below to view it:</p>
              <a href="${credentials.domain}/share/?hash=${estimate.hash}">View Estimate</a></br>
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
              // update the estimate, set the status to expired
              db.updateEstimateStatus(estimate_id, 7, (err, result) => {
                if (err) {
                  console.log(err);
                  callback(err, null);
                } else {
                  callback(null, info.response);
                }
              });
              callback(null, info.response);
            }
          });
        }
      }
      );
    }
  }
  );
}

async function sendRenewalEmail(user_email, estimate_id, callback) {
  db.getEstimateById(estimate_id, (err, estimate) => {
    if (err) {
      console.log(err);
      callback("could not get estimate by id", null);
    } else {  
      const mailOptions = {
        from: credentials.serverEmail,
        to: user_email,
        subject: "Your Estimate from Sun Painting",
        html: `
          <h3>Hello, ${user_email},</h3>
          <h3>YourYour estimate has expired.</h3>
          <p>Please click the link below to renew it:</p>
          <a href="${credentials.domain}/share/?hash=${estimate.hash}">View Estimate</a></br>
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
    }
  }
  );
}





module.exports = {
  sendEstimateEmail,
  sendEstimateEmailInternally,
  sendInvoiceEmail,
  sendExpiredEstimateEmail,
  sendRenewalEmail
};
