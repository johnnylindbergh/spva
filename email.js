const credentials = require("./credentials");
const nodemailer = require("nodemailer");
const db = require("./database.js");
const creds = require("./credentials.js");
const { response } = require("express");

const pdf = require("./pdf.js");

function getCompanyDefaults(callback) {
 return {
    companyName:creds.companyName,
    companyAddress: creds.companyAddress,
    companyPhone: creds.companyPhone,
    companyEmail: creds.companyEmail,
}
}


const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
          user: credentials.serverEmail,
          pass: credentials.emailPassword,
        }
});



async function sendEmail(to, subject, message, callback) {
  const mailOptions = {
    from: credentials.serverEmail,
    to: to,
    subject: subject,
    html: message,
   };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
      callback(err, null);
    } else {
      console.log("Email sent: " + info.response);
      callback(null, info.response);
    }
  });
}

// async..await is not allowed in global scope, must use a wrapper
async function sendEstimateEmail(req, res, takeoff_id, callback) {
  db.getTakeoffById(takeoff_id.toString(), (err, takeoff) => {
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
            <img style="margin:20px;width:140px;"src="${credentials.domain}/sunpainting_logo_blue.png" alt="Sun Painting Logo">
          `,
        };
        
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.log(err);
            callback(err, null);
          } else {
            console.log("Email sent: " + info.response);

            
            db.logEmailSent(takeoff_id, req.user.local.id, takeoff[0].customer_primary_email_address, "Estimate", info.response, (err) => {
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
  try {

    if (!takeoff_id || !invoice_id) {
      throw new Error("Missing takeoff_id or invoice_id");
    }
    // Wrap db.getTakeoffById in a promise
    const takeoff = await new Promise((resolve, reject) => {
      db.getTakeoffById(takeoff_id, (err, result) => {
        if (err || !result|| result.length === 0) {
          console.log(err);
          reject("could not get takeoff by id");
        } else {
          resolve(result);
        }
      });
    });

    console.log(takeoff);
    if (!takeoff[0].customer_invoice_email_address || !takeoff[0].customer_givenName) {
      throw new Error("Missing customer email or name");
    }

    // Wrap db.getInvoiceAndItemsById in a promise
    const { invoice, items } = await new Promise((resolve, reject) => {
      db.getInvoiceAndItemsById(invoice_id, (err, inv, its) => {
        if (err || !inv) {
          console.log(err);
          reject("could not get invoice by id");
        } else {
          resolve({ invoice: inv, items: its });
        }
      });
    });

    console.log(invoice);

    // Calculate total
    let total = 0;
    items.forEach((item) => {
      total += item.cost * item.quantity;
    });

    // // Removed unused 'sov' variable declaration
    // await new Promise((resolve, reject) => {
    //   db.getMostRecentSOV(takeoff_id.toString(), (err, result) => {
    //     if (err || !result) {
    //       console.log(err);
    //       reject("could not get most recent SOV by takeoff id");
    //     } else {
    //       resolve(result);
    //     }
    //   });
    // });

    if (!invoice.hash) {
      throw new Error("Some info is missing from this invoice invoice.hash");
    }

    const invoiceData = {
      takeoff,
      invoice,
      invoice_items: items,
      totalAmount: total,
      defaults: getCompanyDefaults(),
    };

    console.log(invoiceData)

    // Helper function to format numbers with commas
    function numbersWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Format all dollar amounts in invoiceData
    invoiceData.takeoff[0].takeoff_total = numbersWithCommas(invoiceData.takeoff[0].takeoff_total);
    invoiceData.takeoff[0].material_total = numbersWithCommas(invoiceData.takeoff[0].material_total);
    invoiceData.takeoff[0].labor_total = numbersWithCommas(invoiceData.takeoff[0].labor_total);
    invoiceData.takeoff[0].touchups_cost = numbersWithCommas(invoiceData.takeoff[0].touchups_cost);
    invoiceData.takeoff[0].takeoff_tax = numbersWithCommas(invoiceData.takeoff[0].takeoff_tax);
    invoiceData.invoice.total = numbersWithCommas(invoiceData.invoice.total);
    invoiceData.totalAmount = numbersWithCommas((invoiceData.totalAmount).toFixed(2));

    invoiceData.invoice_items.forEach((item) => {
      item.total = numbersWithCommas((parseFloat(item.cost) * parseFloat(item.quantity)).toFixed(2));

      item.cost = numbersWithCommas(item.cost);

    });

    // Wrap pdf.generateInvoicePdf in a promise
    const pdfPath = await new Promise((resolve, reject) => {
      pdf.generateInvoicePdf(invoiceData, (err, path) => {
        if (err) {
          console.log(err);
          reject("could not generate PDF");
        } else if (typeof path !== "string") {
          console.error("Invalid pdfPath type");
          reject("Invalid pdfPath type");
        } else {
          resolve(path);
        }
      });
    });

    const mailOptions = {
      from: credentials.serverEmail,
      to: takeoff[0].customer_invoice_email_address,
      subject: "Your Invoice from Sun Painting",
      html: `
        <h3>Hello, ${takeoff[0].customer_givenName},</h3>
        <h3>Your invoice is ready.</h3>
        <p>Please click the link below to view it:</p>
        <a href="${credentials.domain}/shareInvoice/?hash=${invoice?.hash}">View Invoice</a></br>
      `,
      attachments: [
        {
          filename: `Invoice_${invoice_id}.pdf`,
          path: pdfPath,
        },
      ],
    };

    // Wrap transporter.sendMail in a promise
    const info = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    console.log("Email sent: " + info.response);
    callback(null, info.response);
  } catch (error) {
    console.error(error);
    callback(error, null);
  }
}

async function sendPaymentConfirmationEmail(req, res, takeoff_id, invoice_id, callback) {
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

            if (invoice.payment_confirmation_email_sent) {
              console.log("Email already sent");
              callback("Email already sent", null);
              return;
            }

            if (invoice.invoice_hash) {
              const mailOptions = {
                from: credentials.serverEmail,
                to: takeoff[0].customer_invoice_email_address,
                subject: "Your Payment Confirmation from Sun Painting",
                html: `
                  <h3>Hello, ${takeoff[0].customer_givenName},</h3>
                  <h3>Your payment has been received.</h3>
                  <p>Please click the link below to view your invoice:</p>
                  <a href="${credentials.domain}/shareInvoice/?hash=${invoice?.invoice_hash}">View Invoice</a></br>
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

              //update the invoice.payment_confirmation_email_sent to true
              db.updateInvoicePaymentConfirmationEmailSent(invoice_id, (err, result) => {
                if (err) {
                  console.log(err);
                  callback(err, null);
                } else {
                  console.log("invoice.payment_confirmation_email_sent updated");
                }
              }
              );
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

async function sendChangeOrderEmail(req, res, change_order_id, callback) {
  db.getChangeOrderById(change_order_id, (err, change_order) => {

    if (err) {
      console.log(err);
    } else {
      console.log(change_order);
      if (change_order.owner_email && change_order.name) {
        const mailOptions = {
          from: credentials.serverEmail,
          to: change_order.owner_email,
          subject: "Your Change Order from Sun Painting",
          html: `
            <h3>Hello, ${change_order.name},</h3>
            <h3>Your change order is ready.</h3>
            <p>Please click the link below to view it:</p>
            <a href="${credentials.domain}/shareChangeOrder/?hash=${change_order?.hash}">View Change Order</a></br>
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
        console.log("Some info is missing from this change order change_order.owner, change_order.owner_email, or change_order.hash");
        callback("Some info is missing from this change order change_order.owner, change_order.owner_email, or change_order.hash", null);
      }
    }
  }
  );
}

function sendSubcontractorFormEmail(form_id, user_id, callback) {
  db.getSubcontractorFormById(form_id, (err, form) => {
    if (err) {
      console.log(err);
      callback("could not get subcontractor form by id", null);
    } else {
      db.getUserById(user_id, (err, user) => {
        if (err) {
          console.log(err);
          callback("could not get user by id", null);
        } else {
          const mailOptions = {
            from: credentials.serverEmail,
            to: user.email,
            subject: "Your Subcontractor Form from Sun Painting",
            html: `
              <h3>Hello, ${user.name},</h3>
              <h3>Congratulations! You have completed a form!</h3>
              <p>Please click the link below to view it:</p>
              <a href="${credentials.domain}/subcontractor/viewForm/?id=${form.id}">View Subcontractor Form</a></br>
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
      });
    }
  });
}
function sendSubcontractorFormEmailToAdmin(form_id, user_id, callback) {
  db.getSubcontractorFormById(form_id, (err, form) => {
    if (err) {
      console.log(err);
      callback("could not get subcontractor form by id", null);
    } else {
      db.getUserById(user_id, (err, user) => {
        if (err) {
          console.log(err);
          callback("could not get user by id", null);
        } else {
          const mailOptions = {
            from: credentials.serverEmail,
            to: creds.companyEmail,
            subject: "New Subcontractor Form from Sun Painting",
            html: `
              <h3>Hello, ${creds.companyName},</h3>
              <h3>A new subcontractor form has been submitted.</h3>
              <p>Please click the link below to view it:</p>
              <a href="${credentials.domain}/subcontractor/viewForm/?id=${form.id}">View Subcontractor Form</a></br>
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
      });
    }
  });
}


// send notification emil to subcontractor form recipients credentials.subcontractorFormNotifiationRecipients[i].email
// that a new subcontractor form has been submitted

function sendSubcontractorFormNotificationEmail(form_id, callback) {
  db.getSubcontractorFormById(form_id, (err, form) => {
    if (err) {
      console.log(err);
      callback("could not get subcontractor form by id", null);
    } else {
      console.log(form);
      for (let i = 0; i < creds.subcontractorFormNotifiationRecipients.length; i++) {
        const mailOptions = {
          from: credentials.serverEmail,
          to: creds.subcontractorFormNotifiationRecipients[i].email,
          subject: "New Subcontractor Form from Sun Painting",
          html: `
            <h3>Hello, ${creds.subcontractorFormNotifiationRecipients[i].name},</h3>
            <h3>A new subcontractor form has been submitted.</h3>
            <p>Please click the link below to view it:</p>
            <a href="${credentials.domain}/subcontractor/viewForm?id=${form.id}">View Subcontractor Form</a></br>
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
  });
}

function sendSubcontractorAgreementNotificationEmail(user_id, agreement_id, callback) {
  db.getSubcontractorAgreementById(user_id, agreement_id, (err, form) => {
    if (err) {
      console.log(err);
      callback("could not get subcontractor form by id", null);
    } else {
      console.log(form);
      for (let i = 0; i < creds.subcontractorFormNotifiationRecipients.length; i++) {
        const mailOptions = {
          from: credentials.serverEmail,
          to: creds.subcontractorAgreementNotifiationRecipients[i].email,
          subject: "New Subcontractor Agreement from Sun Painting",
          html: `
            <h3>Hello, ${creds.subcontractorFormNotifiationRecipients[i].name},</h3>
            <h3>A new subcontractor agreement has been submitted.</h3>
            <p>Please click the link below to view it:</p>
            <a href="${credentials.domain}/subcontractorAdmin/viewAgreement/?agreement_id=${form.id}">View Subcontractor Agreement</a></br>
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
  });
}


function sendWelcomeEmail(user_id, callback) {

  console.log("sendWelcomeEmail");

  db.getUserById(user_id, (err, user) => {
    if (err) {
      console.log(err);
      callback("could not get user by id", null);
    } else {


      let mailOptions = {};

      console.log(user.user_type);
      if (user.user_type == 3) { // type 3 is subcontractor
         mailOptions = {
          from: credentials.serverEmail,
          to: user.email,
          subject: "Welcome to Sun Painting",
          html: `
            <h3>Hello, ${user.name},</h3>
            <h3>Welcome to Sun Painting!</h3>
            <p>Please click the link below to view your account:</p>
            <a href="${credentials.domain}/subcontractorGuide.html">View Account</a></br>
            <p>If you have any issues, please contact ${credentials.subcontractorFormNotifiationRecipients[0].name} at ${credentials.subcontractorFormNotifiationRecipients[0].email}</p>
          `,
        };

      } else if (user[0].user_type == 1) { // type 1 is admin
         mailOptions = {
          from: credentials.serverEmail,
          to: user.email,
          subject: "Welcome to Sun Painting",
          html: `
            <h3>Hello, ${user.name},</h3>
            <h3>Welcome to Sun Painting!</h3>
            <p>Please click the link below to view your account:</p>
            <a href="${credentials.domain}">View Account</a></br>
          `,
        };
      } else {
         mailOptions = {
          from: credentials.serverEmail,
          to: user.email,
          subject: "Welcome to Sun Painting",
          html: `
            <h3>Hello, ${user.name},</h3>
            <h3>Welcome to Sun Painting!</h3>
            <p>Please click the link below to view your account:</p>
            <a href="${credentials.domain}">View Account</a></br>
          `,
        };
      }
      
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
  });
}


module.exports = {
  sendEmail,
  sendEstimateEmail,
  sendEstimateEmailInternally,
  sendInvoiceEmail,
  sendExpiredEstimateEmail,
  sendRenewalEmail,
  sendPaymentConfirmationEmail,
  sendChangeOrderEmail,
  sendSubcontractorFormEmail,
  sendSubcontractorFormNotificationEmail,
  sendSubcontractorAgreementNotificationEmail,
  sendWelcomeEmail
};
