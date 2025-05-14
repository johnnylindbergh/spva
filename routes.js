/*

 _______  _______           _______   _________ _______  _______  _______  _       
(  ____ \(  ____ )|\     /|(  ___  )  \__   __/(  ____ )(  ___  )(  ____ \| \    /\
| (    \/| (    )|| )   ( || (   ) |     ) (   | (    )|| (   ) || (    \/|  \  / /
| (_____ | (____)|| |   | || (___) |     | |   | (____)|| (___) || |      |  (_/ / 
(_____  )|  _____)( (   ) )|  ___  |     | |   |     __)|  ___  || |      |   _ (  
      ) || (       \ \_/ / | (   ) |     | |   | (\ (   | (   ) || |      |  ( \ \ 
/\____) || )        \   /  | )   ( |     | |   | ) \ \__| )   ( || (____/\|  /  \ \
\_______)|/          \_/   |/     \|     )_(   |/   \__/|/     \|(_______/|_/    \/
                                                                                  
  
*/

"use strict";
const db = require("./database.js");
const sys = require("./settings.js");
const mid = require("./middleware.js");
const moment = require("moment");
const path = require("path");
const multer = require("multer");
// require chatgpt.js
const chatgpt = require("./chatgpt.js");
const emailer = require("./email.js");
const creds = require("./credentials.js");
const querystring = require("querystring");
const schedule = require('node-schedule');
const pdf = require("./pdf.js");

const texter = require("./texter.js");


// execute every day at 12:30pm
const job = schedule.scheduleJob('47 14 * * *', function () {
  db.checkForExpiredEstimates(function (err, expiredEstimates) {
    if (err) {
      console.error('Error checking for expired takeoffs:', err);
      return;
    }

    if (expiredEstimates.length > 0) {
      for (const estimate of expiredEstimates) {
        emailer.sendExpiredEstimateEmail(estimate.id);
      }
    }
  });
});



// require payment.js
//const payment = require("./payment.js");

const stripe = require('stripe')(creds.stripe.secret);

const qb = require("./quickbooks.js");


const YOUR_DOMAIN = creds.domain;


const fs = require("fs");
const { parse } = require("csv-parse");
const { raw } = require("body-parser");
const { session } = require("passport");

var fileCounter = Math.floor(1000 + Math.random() * 9000);

// file upload stuff
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, sys.PROJECT_PATH + "/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "" + fileCounter + ".csv");
  },
});

const plansStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, sys.PROJECT_PATH + "/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "" + fileCounter + ".pdf");
  },
});

// Define maximum upload file size (1GB) 
const maxSize = 1 * 1000 * 1000 * 1024; // 1GM MB

// Configure Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter: function (req, file, cb) {
    const filetypes = /csv/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname && file.originalname) {
      return cb(null, true);
    }

    cb(
      "Error: File upload only supports the following filetypes - " + filetypes
    );
  },
}).single("takeoff");

// Configure Multer
const uploadPlans = multer({
  storage: plansStorage,
  limits: { fileSize: maxSize },
  fileFilter: function (req, file, cb) {
    const filetypes = /pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname && file.originalname) {
      return cb(null, true);
    }

    cb(
      "Error: File upload only supports the following filetypes - " + filetypes
    );
  },
}).single("plans");

// csv parsing stuff




function readTakeoff(req, res, takeoff_id, filename, cb) {
  console.log("parsing ", filename);
  var results = [];
  var headers = [];

  console.log("takeoff id is ", takeoff_id);
  fs.createReadStream(filename)

    .pipe(parse({ delimiter: "," }))
    .on("data", function (row) {
      //console.log(row);
      results.push(row);
    })
    .on("end", function () {
      console.log("results[0]", results[0]);
      db.loadTakeoffData(takeoff_id, results, results[0], function (err) {
        if (err) {
          console.log(err);
          cb(err);
        } else {
          console.log("takeoff loaded");
          //console.log("csv recieved: ", results);

          db.generateTakeoffMaterials(takeoff_id, function (err) {
            if (err) {
              console.log(err);
              cb(err);
            } else {
              console.log("materials generated");
              db.applySubjectNamingRules(takeoff_id, function (err) {
                if (err) {
                  console.log(err);
                  cb(err);
                }
                db.applySubjectCoatRules(takeoff_id, function (err) {
                  if (err) {
                    console.log(err);
                    cb(err);
                  }
                  //cb(null); 

                  db.matchSubjectsToMaterial(takeoff_id, function (err) {
                    if (err) {
                      console.log(err);
                      cb(err);
                    }
                    cb(null);
                  });

                });

              });
            }
          });

        }
      });


    })
    .on("error", function (error) {
      console.log(error.message);
      cb(error);
    });
}

// number formatting 

function numbersWithCommas(x) {

  if (x == null) {
    return "0.00";
  } else {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}
// main page stuff
module.exports = function (app) {
  // GET requests
  app.get("/", mid.isAuth, (req, res) => {
    if (req.user.local.user_type == "1") {
      res.redirect("/admin");
    } else if (req.user.local.user_type == "2") {
      res.redirect("/user");
    } else if (req.user.local.user_type == "3") {
      res.redirect("/subcontractor");
    } else if (req.user.local.user_type == "4"){
      res.redirect("/subcontractorAdmin");
    } else {
      res.redirect("/login");
    }
  });

  app.get("/userManagement", mid.isAdmin, (req, res) => {
    var render = defaultRender(req);
    db.getUsers(function (err, users) {
      if (err) {
        console.log(err);
      } else {
        console.log(users);
        render.users = users;
        res.render("userManagement.html", render);
      }
    });
  });

  app.post('/createUser', mid.isAdmin, function (req, res) {
    console.log("creating user");
    console.log(req.body);
    db.createUserGetUserId(req.body, function (err, user_id) {
      if (err) {
        console.log(err);
        res.status(500).send("Error creating user");
      } else {
        emailer.sendWelcomeEmail(user_id, function (err) {
          res.redirect("/userManagement");
        });
      }
    });
  });

  //
  // app.post("/userManagement/createUser", mid.isAdmin, (req, res) => {

  // });




  app.get("/admin", mid.isAdmin, (req, res) => {
    var render = defaultRender(req);
    db.summaryAllTakeoffs(function (err, takeoffs) {
      if (err) {
        console.log(err);
      } else {
        render.takeoffs = takeoffs;
        res.render("main.html", render);
      }
    });
  }
  );

  app.get("/addTakeoff", mid.isAdmin, (req, res) => {
    var render = defaultRender(req);
    // db

    res.render("addTakeoff.html", render);
  });

  app.post("/deleteTakeoff", mid.isAdmin, (req, res) => {
    db.deleteTakeoff(req.body.takeoff_id, req.user.local.id, function (err) {
      if (err) {
        console.log(err);
        res.render("error.html", { link: 'javascript:history.back()', linkTitle: 'back', friendly: "Error deleting takeoff. You can only delete takeoffs you created." });
      } else {
        res.redirect("/");
      }
    });
  });

  app.post("/copyTakeoff", mid.isAdmin, (req, res) => {
    db.copyTakeoff(req.body.takeoff_id, req.user.local.id, function (err) {
      if (err) {
        console.log(err);
        res.send("Error copying takeoff");
      } else {
        res.redirect("/");
      }
    });
  });



  //updateTakeoff POST
  app.post("/update-takeoff-name", mid.isAdmin, (req, res) => {
    console.log("updating takeoff name");
    let takeoff_name = req.body.name;
    let takeoff_id = req.body.takeoff_id;
    console.log(takeoff_name);
    console.log(takeoff_id);
    db.updateTakeoffName(req.body.takeoff_id, takeoff_name, function (err) {
      if (err) {
        console.log(err);
        res.end();
      } else {
        res.redirect("/");
      }
    });
  });

  app.get("/expiredTakeoffs", mid.isAdmin, (req, res) => {
    db.checkForExpiredEstimates(function (err, expiredEstimates) {
      if (err) {
        console.error('Error checking for expired takeoffs:', err);
        return;
      }

      if (expiredEstimates.length > 0) {
        for (const estimate of expiredEstimates) {
          emailer.sendExpiredEstimateEmail(estimate.id, function (err) {
            if (err) {
              console.error('Error sending expired takeoff email:', err);
            }

          });
        }
      }
    });
  });

  app.post("/update-takeoff-ownership", mid.isAdmin, (req, res) => {
    console.log("updating takeoff ownership");
    console.log(req.body);
    let takeoff_id = req.body.takeoff_id;
    let owner_id = req.body.customer_id;
    console.log(takeoff_id);
    console.log(owner_id);

    db.updateTakeoffOwnership(takeoff_id, owner_id, function (err) {
      if (err) {
        console.log(err);
        res.end();
      } else {
        res.redirect("/");
      }
    });
  });

  app.post("/unsign-takeoff-intent", mid.isAdmin, (req, res) => {
    // send the OTP to the users in creds.superAdmin using the twilio api

    console.log("unsigning takeoff intent");
    let takeoff_id = req.body.takeoff_id;

    console.log("User ", req.user.local.name, "unsigning takeoff ", takeoff_id);

    console.log("sending OTP to ", creds.superAdmin);
    const otp = Math.floor(100000 + Math.random() * 900000);
    const message = `Your OTP is ${otp}. Please enter this OTP to confirm the unsigning of the takeoff.`;
    const to = creds.superAdmin.email;

     emailer.sendEmail(to, "Takeoff Unsigning OTP", message, function (err) {
      if (err) {
        console.log(err);
        res.status(500).send("Error sending OTP");
      } else {

      // console.log("messages disabled")
        console.log("OTP sent to ", to);
        // save the OTP to the database
        db.saveOTP(takeoff_id, otp, function (err) {
          if (err) {
            console.log(err);
            res.status(500).send("Error saving OTP");
          } else {
            console.log("OTP saved to database");
            res.send("OTP sent to " + to);
          }
        });

      }
  });
  
});



  app.post("/verify-otp", mid.isAdmin, (req, res) => {
    console.log("verifying OTP");
    let takeoff_id = req.body.takeoff_id;
    let otp = req.body.otp;

    console.log("User ", req.user.local.name, "verifying OTP for takeoff ", takeoff_id);

    db.verifyOTP(takeoff_id, otp, function (err, valid) {
      if (err) {
        console.log(err);
        res.status(500).send("Error verifying OTP");
      } else {
        if (valid) {
          db.unsignTakeoff(takeoff_id, function (err) {
            if (err) {
              console.log(err);
              res.status(500).send("Error unsigning takeoff");
            } else {
              db.unlockTakeoff(takeoff_id, function (err) {
                if (err) {
                  console.log(err);
                  res.status(500).send("Error unlocking takeoff");
                } else {

                  db.updateTakeoffLastUpdatedBy(takeoff_id, req.user.local.id, function (err) {
                    if (err) {
                      console.log(err);
                      res.status(500).send("Error updating takeoff last updated by");
                    } else {
                      console.log("Takeoff unsinged and unlocked");
                      // delete the OTP from the database
                      db.deleteOTP(takeoff_id, function (err) {
                        if (err) {
                          console.log(err);
                          res.status(500).send("Error deleting OTP");
                        } else {
                          console.log("OTP deleted from database");
                          res.send({approved: true});

                        }
                      });
                    }

                  });

                }
              });
            }
          });
        } else {
          res.status(500).send("Invalid OTP");
        }
      }
    });
  });

  app.get("/check-otp-status", mid.isAdmin, (req, res) => {
    console.log("checking OTP status");
    let takeoff_id = req.query.takeoff_id;

    db.checkOTPStatus(takeoff_id, function (err, valid) {
      if (err) {
        console.log(err);
        res.status(500).send("Error checking OTP status");
      } else {
        if (valid) {
          res.send({approved: true});

          console.log("OTP is valid");
        } else {
          console.log("OTP is invalid");
          res.send({approved: false});
        }
      }
    });
  });
  




  app.post("/update-takeoff-owner-name", mid.isAdmin, (req, res) => {
    console.log("updating takeoff owner name");
    let owner_name = req.body.owner;
    let takeoff_id = req.body.takeoff_id;
    console.log(req.body);
    db.updateTakeoffOwnerName(req.body.takeoff_id, owner_name, function (err) {
      if (err) {
        console.log(err);
        res.end();
      } else {
        res.redirect("/");
      }
    });
  });

  app.post("/update-takeoff-owner-billing", mid.isAdmin, (req, res) => {
    console.log("updating takeoff name");
    let address = req.body.owner_billing_address;
    let takeoff_id = req.body.takeoff_id;
    console.log(req.body);
    db.updateTakeoffOwnerBilling(req.body.takeoff_id, address, function (err) {
      if (err) {
        console.log(err);
        res.end();
      } else {
        res.redirect("/");
      }
    });
  });

  app.post("/update-takeoff-invoice-email", mid.isAdmin, (req, res) => {
    console.log("updating takeoff invoice email");
    let email = req.body.owner_invoice_email_address;

    if (email == null) {
      email = req.body.invoice_email_address;
    }
    let takeoff_id = req.body.takeoff_id;
    console.log(req.body);
    db.updateTakeoffInvoiceEmail(req.body.takeoff_id, email, function (err) {
      if (err) {
        console.log(err);
        res.end();
      } else {
        res.redirect("/");
      }
    });
  });

  app.get('/getCustomers', mid.isAdmin, function (req, res) {
    db.getCustomers(function (err, customers) {
      if (err) {
        console.log(err);
      } else {
        res.send(customers);
      }
    });
  });


  app.get("/getTakeoffs", mid.isAdmin, (req, res) => {
    db.summaryAllTakeoffs(function (err, takeoffs) {
      if (err) {
        console.log(err);
      } else {
        res.send(takeoffs);
      }
    });
  });

  app.post("/archiveTakeoff", mid.isAdmin, (req, res) => {
    db.archiveTakeoff(req.body.takeoff_id, function (err) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    });
  });

  app.post("/createALTakeoff", mid.isAdmin, function (req, res) {
    console.log("alButton");
    console.log(req.body)
    // if the user name is al, res.send "Hello AL!" otherwise, say you are not al
    if (req.user.local.name == "AL" || req.user.local.name == "Johnny" || req.user.local.name == "Jonathan Mayo") {
      // create a blank Takeoff

      // get the form data, customer_id, takeoff_type, takeoff_name
      let customer_id = req.body.customerId;
      let takeoff_type = req.body.projectType;
      let takeoff_name = req.body.takeoffName;

      if (customer_id == null || takeoff_type == null || takeoff_name == null) {
        console.log('Some of the fields are null');

        res.status(500).send("Error: Some of the fields are null");
      }

      db.createNewBlankTakeoff(req, res, function (err, takeoff_id) {
        if (err) {
          console.log(err);
        } else {
          console.log("takeoff created");
         // res.redirect("/");
        }
      });

    } else {
      res.send("You are not AL");
    }
  });

  app.post("/viewTakeoff", mid.isAdmin, function (req, res) {
    let render = defaultRender(req);
    console.log("viewing", req.body.takeoff_id);
    res.send("viewing takeoff");
    // db.generateEstimate(req.body.takeoff_id, function (err, estimate) {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     console.log(estimate)
    //     res.render("viewEstimate.html", {estimate: estimate});
    //   }
    // });
  });

  // Route for handling file uploads
  app.post("/uploadTakeoff", mid.isAdmin, function (req, res) {
    console.log("uploading takeoff...");
    // Use Multer middleware to handle file upload
    upload(req, res, function (err) {
      if (err) {
        // Handle errors during file upload
        console.log(err);
        res.send(err);
      } else {
        db.createNewTakeoff(req, res, function (err, takeoff_id) { // the first time takeoff_id is issued
          if (err) {
            console.log(err);
          }
          // Success message after a successful upload

          //call the readTakeoff function to parse the csv file
          if (req.file) {
            console.log("about to read ", req.file.filename);
            // handle the customer and project fields
            console.log(req.body);
            readTakeoff(
              req,
              res,
              takeoff_id,
              sys.PROJECT_PATH + "/uploads/" + req.file.filename,
              function (err) {
                if (err) {
                  console.log(err);
                  res.send(err);
                } else {
                  console.log("takeoff loaded");
                  db.takeoffSetStatus(takeoff_id, 1, function (err) {
                    if (err) {
                      console.log(err);
                    }
                    console.log("takeoff status set to 1");

                    // update the customer and project fields
                    console.log("about to update customer and project");
                    console.log(req.body)
                    db.updateTakeoffCustomer(takeoff_id, req.body.customer, function (err) {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log("updated customer and project");
                      }
                    });

                    // res.redirect("/");

                  });

                }
              }
            );

            res.redirect("/");

          } else {
            console.log("no file uploaded");
            res.send("no file uploaded");
          }
        });
      }
    });
  });

  app.post("/uploadPlans", mid.isAuth, function (req, res) {
    console.log("uploading plans...");

    // if (req.body.takeoff_id == null) {
    //   res.render("error.html", { link: 'javascript:history.back()', linkTitle: 'back', friendly: "Missing Takeoff ID, im the doofus" });
    // }

    if (req.body.file == null && req.body.takeoff != null) {
      res.render("error.html", { link: 'javascript:history.back()', linkTitle: 'back', friendly: "Missing File, doofus" });
    } else {
      // Use Multer middleware to handle file upload
      uploadPlans(req, res, function (err) {
        if (err) {
          // Handle errors during file upload
          console.log(err);
          res.send(err);
        } else {
          db.uploadPlans(req.body.takeoff_id, req.file.filename, function (err) {
            if (err) {
              console.log(err);
            } else {
              console.log("plans uploaded");
              res.redirect("/");
              // Success message after a successful upload
            }
          });
        }
      });
    }
  });

  app.get("/plans/:filename", mid.isAuth, function (req, res) {
    console.log("serving plans ", req.params.filename);
    res.sendFile(sys.PROJECT_PATH + "/uploads/" + req.params.filename);
  }
  );
  app.post("/editTakeoff", mid.isAdmin, function (req, res) {
    var render = defaultRender(req);
    if (req.body.takeoff_id == null) {
      res.redirect("/");
    }

    db.getTakeoff(req.body.takeoff_id, function (err, takeoff, materials) {
      if (err) {
        console.log(err);
      }
      db.getAllMaterials(function (err, allMaterials) {
        if (err) {
          console.log(err);
        } else {
          console.log(takeoff);
          //console.log(allMaterials);

          // for rendering purposes, convert all the decimals to percents
          takeoff[0].labor_markup = (takeoff[0].labor_markup * 100);
          takeoff[0].material_markup = (takeoff[0].material_markup * 100);
          takeoff[0].supervisor_markup = (takeoff[0].supervisor_markup * 100);

          res.render("editTakeoff.html", {
            sys: render.sys,
            takeoff: takeoff,
            subjects: materials,
            materials: allMaterials,
            takeoff_id: req.body.takeoff_id,
          });
        }
      });
    });
  });

  app.post("/loadTakeoffMaterials", mid.isAdmin, function (req, res) {
    //console.log("editing", req.body.takeoff_id);

    db.getTakeoff(req.body.takeoff_id, function (err, takeoff, materials) {
      if (err) {
        console.log(err);
      }
      //console.log(materials);
      db.getAllMaterials(function (err, allMaterials) {
        if (err) {
          console.log(err);
        } else {
          res.send({
            takeoff: takeoff,
            subjects: materials,
            materials: allMaterials,
            takeoff_id: req.body.takeoff_id,
          });
        }
      });
    });
  });

  app.post('/change-labor-rate', mid.isAdmin, function (req, res) {
    console.log("changing labor rate ", req.body);
    db.changeLaborRate(req.body.takeoff_id, req.body.labor_rate, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated labor rate");
        res.end();
      }
    });
  }
  );

  app.post("/change-labor-markup", mid.isAdmin, function (req, res) {
    console.log("changing labor markup ", req.body);
    // first check that the status is not signed, status < 4

    db.takeoffGetStatus(req.body.takeoff_id, function (err, status) {
      if (err) {
        console.log(err);
      } else {
        console.log(status)
        if (status < 4) {

          db.changeLaborMarkup(req.body.takeoff_id, req.body.labor_markup, function (err) {
            if (err) {
              console.log(err);
            } else {
              console.log("updated labor markup");
              res.end();
            }
          });
        } else {
          console.log("Takeoff is signed, cannot change markup");
          res.status(500).send("Takeoff is signed, cannot change markup");
        }
      }
    });
  }
  );

  app.post("/change-material-markup", mid.isAdmin, function (req, res) {

    db.takeoffGetStatus(req.body.takeoff_id, function (err, status) {
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving takeoff status");
      } else {
        if (status < 4) {
          db.changeMaterialMarkup(req.body.takeoff_id, req.body.material_markup, function (err) {
            if (err) {
              console.log(err);
              res.status(500).send("Error updating material markup");
            } else {
              console.log("updated material markup");
              res.end();
            }
          });
        } else {
          console.log("Takeoff is signed, cannot change markup");
          res.status(500).send("Takeoff is signed, cannot change markup");
        }
      }
    });
  });


  app.post("/change-supervisor-markup", mid.isAdmin, function (req, res) {
    console.log("changing supervisor markup ", req.body);
    db.takeoffGetStatus(req.body.takeoff_id, function (err, status) {
      if (status < 4) {
        db.changeSupervisorMarkup(req.body.takeoff_id, req.body.supervisor_markup, function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log("updated supervisor markup");
            res.end();
          }
        });
      } else {
        console.log("Takeoff is signed, cannot change markup");
        res.status(500).send("Takeoff is signed, cannot change markup");
      }
    });
  });
  app.post("/change-travel-cost", mid.isAdmin, function (req, res) {
    console.log("changing travel cost ", req.body);
    db.takeoffGetStatus(req.body.takeoff_id, function (err, status) {
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving takeoff status");
      } else {
        if (status < 4) {
          db.changeTravelCost(req.body.takeoff_id, req.body.travel_extra, function (err) {
            if (err) {
              console.log(err);
              res.status(500).send("Error updating travel cost");
            } else {
              console.log("updated travel cost");
              res.end();
            }
          });
        } else {
          console.log("Takeoff is signed, cannot change travel cost");
          res.status(500).send("Takeoff is signed, cannot change travel cost");
        }
      }
    });
  });

  app.post("/change-touchups-cost", mid.isAdmin, function (req, res) {
    console.log("changing touchups cost ", req.body);
    db.takeoffGetStatus(req.body.takeoff_id, function (err, status) {
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving takeoff status");
      } else {
        if (status < 4) {
          db.changeTouchupsCost(req.body.takeoff_id, req.body.touchups_cost, function (err) {
            if (err) {
              console.log(err);
              res.status(500).send("Error updating touchups cost");
            } else {
              console.log("updated touchups cost");
              res.end();
            }
          });
        }
        else {
          console.log("Takeoff is signed, cannot change touchups cost");
          res.status(500).send("Takeoff is signed, cannot change touchups cost");
        }
      }
    });
  });

  app.post("/change-misc-material-cost", mid.isAdmin, function (req, res) {
    console.log("changing misc material cost ", req.body);
    db.takeoffGetStatus(req.body.takeoff_id, function (err, status) {
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving takeoff status");
      } else {
        if (status < 4) {
          db.changeMiscMaterialCost(req.body.takeoff_id, req.body.misc_material_cost, function (err) {
            if (err) {
              console.log(err);
              res.status(500).send("Error updating misc material cost");
            } else {
              console.log("updated misc material cost");
              res.end();
            }
          });
        } else {
          console.log("Takeoff is signed, cannot change misc material cost");
          res.status(500).send("Takeoff is signed, cannot change misc material cost");
        }
      }
    });
  });

  app.post("/change-profit", mid.isAdmin, function (req, res) {
    console.log("changing profit ", req.body);
    db.takeoffGetStatus(req.body.takeoff_id, function (err, status) {
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving takeoff status");
      } else {
        if (status < 4) {
          db.changeProfit(req.body.takeoff_id, req.body.profit, function (err) {
            if (err) {
              console.log(err);
              res.status(500).send("Error updating profit");
            } else {
              console.log("updated profit");
              res.end();
            }
          });
        } else {
          console.log("Takeoff is signed, cannot change profit");
          res.status(500).send("Takeoff is signed, cannot change profit");
        }
      }
    });
  }
  );


  app.post("/change-tax", mid.isAdmin, function (req, res) {
    console.log("changing tax ", req.body);
    db.takeoffGetStatus(req.body.takeoff_id, function (err, status) {
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving takeoff status");
      } else {
        if (status < 4) {
          db.changeTax(req.body.takeoff_id, req.body.tax, function (err) {
            if (err) {
              console.log(err);
              res.status(500).send("Error updating tax");
            } else {
              console.log("updated tax");
              res.end();
            }
          });
        } else {
          console.log("Takeoff is signed, cannot change tax");
          res.status(500).send("Takeoff is signed, cannot change tax");
        }
      }
    });
  });

  app.post("/updateTakeoffTotal", mid.isAdmin, function (req, res) {
    console.log("updating takeoff total ", req.body);
    db.updateTakeoffTotal(req.body.takeoff_id, req.body.total, req.body.materialTotal, req.body.laborTotal, function (err) {
      if (err) {
        console.log(err);
      } else {
        res.end();
      }
    });
  });

  app.post("/get-notes", mid.isAdmin, function (req, res) {
    db.getTakeoffNotes(req.body.id, function (err, notes) {
      if (err) {
        console.log(err);
      } else {
        res.send(notes);
      }
    });
  }
  );

  app.post("/save-notes", mid.isAdmin, function (req, res) {
    console.log("Changing notes ", req.body);
    db.saveTakeoffNotes(req.body.id, req.body.notes, function (err) {
      if (err) {
        console.log(err);
      } else {
        res.end();
      }
    });
  }
  );



  app.post("/update-signature", function (req, res) {
    
    console.log("updating signature ", req.body);

    let initialPaymentRequest = 0;

    db.getSystemSettingByName("initial-20%-deposit-request", function (err, setting) {

      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving system setting");
      } else {
        //console.log("initial deposit setting", setting);

         initialPaymentRequest = setting[0].setting_value;
      }


      db.updateSignature(
        req.body.takeoff_id,
        req.body.signature,
        req.body.date,
        // make the invoice but doesnt get the invoice id
        function (valid, invoice_id, err) {
          if (err) {
            console.log(err);
          } else {
            if (valid) {
              // update the estimate's signed total field 
              db.updateSignedTotal(req.body.takeoff_id, parseFloat(req.body.total).toFixed(2), function (err) {
                if (err) {
                  console.log(err);
                } else {

                  // send the email

                  db.getTakeoff(req.body.takeoff_id, function (err, takeoff) {
                    if (err) {
                      console.log(err);
                    } else {

                      
                      const autoSendDeposit = takeoff[0].autoSendDeposit;
                      console.log("sending email to ", takeoff);
                      console.log("for invoice_id", invoice_id);

                      if (autoSendDeposit == 1) {
                        console.log("sending invoice email");
                        emailer.sendInvoiceEmail(req, res, req.body.takeoff_id, invoice_id, function (err, valid) {
                          if (err) {
                            console.log(err);
                          } else {
                            
                            const response = {
                              valid: valid,
                              initialPaymentRequest: initialPaymentRequest
                            }

                            res.send(response);
                          }
                        });
                        
                      } else {

                        const response = {
                          valid: valid,
                          initialPaymentRequest: initialPaymentRequest
                        }
                        res.send(valid);
                      }

                      
                    }
                  }
                  );
                }
              });

            }

          }
        }
      );

    });

    db.takeoffSetStatus(req.body.takeoff_id, 4, function (err) {
      if (err) {
        console.log(err);
      }
    });



  });


  /* this funciton should be split into two functions one POST /settings to render the settings page. The settings page with then pull the 
  settings from the server so we will need a second function that res.send the settings to the client */

  app.post("/settings", mid.isAdmin, function (req, res) {

    /* since this page is accessed through clicking the settings button in the navbar while editing a takeoff, 
    we can assume that the rendering of this page must also reference some takeoff-specific data  
    therefore, we should pass a takeoff_id (from the post request) to the settings page
    retrived by either querystring or stored in cookie or session storage OR convert this into a post request
    */
    db.getAllSystemSettings(function (err, settings) {
      if (err) {
        console.log(err);
        res.status(500).send("Failed to retrieve settings");
      } else {
        console.log(settings);

        res.render("userSettings.html", { settings: settings, takeoff_id: req.body.takeoff_id });
      }
    });
  });

  app.get('/getSettings', mid.isAdmin, function (req, res) {
    db.getAllSystemSettings(function (err, settings) {
      if (err) {
        console.error('Error retrieving settings:', err);
        res.status(500).send({ success: false, error: 'Failed to retrieve settings' });
      } else {
        res.send(settings.map(setting => ({
          setting_id: setting.setting_id,
          setting_name: setting.setting_name,
          setting_value: setting.setting_value,
        })));
      }
    });
  });

  app.post('/updateSettings', mid.isAdmin, function (req, res) {
    const settings = req.body;
    const updatePromises = Object.entries(settings).map(([setting_name, setting_value]) => {
      return new Promise((resolve, reject) => {
        db.getSystemSettingByName(setting_name, (err, [setting]) => {
          if (err || !setting) {
            console.error(`Setting not found: ${setting_name}`);
            reject(err || 'Setting not found');
          } else {
            db.updateSystemSetting(setting.setting_id, setting_value, (updateErr) => {
              if (updateErr) {
                console.error(`Error updating setting: ${setting_name}`); // Debugging statement
                reject(updateErr);
              } else {
                resolve();
              }
            });
          }
        });
      });
    });

    Promise.all(updatePromises)
      .then(() => res.send({ success: true }))
      .catch(err => {
        console.error('Error updating settings:', err);
        res.status(500).send({ success: false, error: 'Failed to update settings' });
      });
  });


  app.post("/generateEstimate", mid.isAdmin, function (req, res) {
    // priority: this function should check to see if an estimate has been generated, if yes, send to client, if no, generate
    var takeoff_id = req.body.takeoff_id;
    console.log("your email is: ", req.user.local.email);
    console.log("Generating estimate for takeoff", takeoff_id);

    // Fetch the ChatGPT prompt dynamically from the database
    db.getSystemSettingByName("chatgpt_prompt", function (err, prompt) {
      if (err || !prompt) {
        console.error("Error fetching ChatGPT prompt, using default.");
        prompt = sys.PROMPT; // Fallback prompt
      }

      db.takeoffSetStatus(takeoff_id, 2, function (err) {
        if (err) {
          // Handle the error if necessary

        }


        db.generateEstimate(takeoff_id, function (err, takeoff_info, estimate) {
          if (err) {
            console.log(err);
            res.status(500).send("Error generating estimate");
          } else {

            //console.log(takeoff_info);

            console.log("Estimate generated");
            // format the totals in takeoff_info  
            takeoff_info[0].total = numbersWithCommas(takeoff_info[0].takeoff_total);
            takeoff_info[0].material_total = numbersWithCommas(takeoff_info[0].material_total);
            takeoff_info[0].labor_total = numbersWithCommas(takeoff_info[0].labor_total);

            // console.log(estimate);
            console.log(takeoff_info[0])
            if (takeoff_info[0].estimate_id == null) {
              // Build the prompt
              db.separateAlts(takeoff_id, function (err) {


                prompt = prompt[0].setting_value;

                for (var i = 0; i < estimate.length; i++) {
                  prompt += " subject={ " + estimate[i].material_name;
                  prompt +=
                    " measurement: " +
                    estimate[i].measurement +
                    estimate[i].measurement_unit;
                  " " + estimate[i].measurement_unit;
                  if (estimate[i].selected_materials != null) {
                    for (var j = 0; j < estimate[i].selected_materials.length; j++) {
                      //console.log(estimate[i].selected_materials[j]);
                      prompt +=
                        " name: " + estimate[i].selected_materials[j].name + "'";
                      prompt +=
                        " desc: " + estimate[i].selected_materials[j].description;
                        prompt +=
                        " notes: " + estimate[i].selected_materials[j].notes;
                    }
                  }
                  prompt += "}";
                }

                console.log("prompt",prompt + JSON.stringify(estimate))
                // call to  async function callChatGPT with the response as the return value and saves the it to the database
                let response = "";
                //console.log("prompt",prompt + JSON.stringify(estimate))
                chatgpt.sendChat(prompt + JSON.stringify(estimate)).then((subres) => {
                  response = subres;
                  //console.log("Response:", response);

                  // process response for render
                  // split into two vars called includes, and exclusions
                  let inclusions = response.split("</br>")[0];
                  let exclusions = response.split("</br>")[1];

                  if (inclusions == null || exclusions == null) {
                    // throw an error
                    console.log("Error splitting response");
                    res.send("Error generating estimate. Please try again with assigned materials.");

                  } else {

                    // check if the response has been split correctly
                    console.log("Includes:", inclusions.substring(0, 20) + "...");
                    console.log("Exclusions:", exclusions.substring(0, 20) + "...");
                    //nul checking for inclusions and exclusions
                    if (inclusions == null) {
                      // set the inclusions to the response
                      inclusions = response;
                    }
                    if (exclusions == null) {
                      // set the exclusions to the response
                      exclusions = "";
                    }
                    db.saveEstimate(takeoff_id, inclusions, exclusions, function () {
                      res.render("viewEstimate.html", {
                        inclusions: inclusions,
                        exclusions: exclusions,
                        takeoff_id: takeoff_id,
                        estimate: estimate,
                        takeoff: takeoff_info,
                        email: req.user.local.email,
                      });
                    });

                  }

                });
              });

            } else {
              console.log("No estimate generated, just retrieved");

              // get the inclusions and exclusions from the database
              db.getEstimateData(takeoff_id, function (err, estimate, takeoff_info, sales_tax, inclusions_presets) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(takeoff_info);
                  res.render("viewEstimate.html", {
                    estimate: estimate,
                    takeoff: takeoff_info,
                    takeoff_id: takeoff_id,
                    email: req.user.local.email,
                    inclusions_presets: inclusions_presets
                  });
                }
              });

            }
          }
        });

      });
    });
  });

  app.post("/regenChatGPTResponse", mid.isAdmin, function (req, res) {
    let takeoff_id = req.body.takeoff_id;
    console.log("Regenerating ChatGPT for takeoff", takeoff_id);

    // Fetch the ChatGPT prompt dynamically from the database
    db.getSystemSettingByName("chatgpt_prompt", function (err, prompt) {
      if (err || !prompt) {
        console.error("Error fetching ChatGPT prompt, using default.");
        prompt = sys.PROMPT; // Fallback prompt
      }

      db.generateEstimate(takeoff_id, function (err, takeoff_info, estimate) {
        if (err) {
          console.log(err);
          res.status(500).send("Error Regenerating estimate");
        } else {
          //console.log(takeoff_info);

          // format the totals in takeoff_info  
          // takeoff_info[0].total = numbersWithCommas(takeoff_info[0].takeoff_total);
          // takeoff_info[0].material_total = numbersWithCommas(takeoff_info[0].material_total);
          // takeoff_info[0].labor_total = numbersWithCommas(takeoff_info[0].labor_total);

          // console.log(estimate);
         // console.log(takeoff_info[0])
            // Build the prompt
              prompt = prompt[0].setting_value;

              for (var i = 0; i < estimate.length; i++) {
                prompt += " subject={ " + estimate[i].material_name;
                prompt +=
                  " measurement: " +
                  estimate[i].measurement +
                  estimate[i].measurement_unit;
                " " + estimate[i].measurement_unit;
                if (estimate[i].selected_materials != null) {
                  for (var j = 0; j < estimate[i].selected_materials.length; j++) {
                    //console.log(estimate[i].selected_materials[j]);
                    prompt +=
                      " name: " + estimate[i].selected_materials[j].name + "'";
                    prompt +=
                      " desc: " + estimate[i].selected_materials[j].description;
                      prompt +=
                      " notes: " + estimate[i].selected_materials[j].notes;
                  }
                }
                prompt += "}";
              }

              // call to  async function callChatGPT with the response as the return value and saves the it to the database
              let response = "";
              //console.log("prompt",prompt + JSON.stringify(estimate))

              console.log("prompt",prompt + JSON.stringify(estimate))
              chatgpt.sendChat(prompt + JSON.stringify(estimate)).then((subres) => {
                response = subres;
                //console.log("Response:", response);

                // process response for render
                // split into two vars called includes, and exclusions
                let inclusions = response.split("</br>")[0];
                let exclusions = response.split("</br>")[1];

                if (inclusions == null || exclusions == null) {
                  // throw an error
                  console.log("Error splitting response");
                  res.send("Error Regenerating estimate. Please try again with assigned materials.");

                } else {

                  // check if the response has been split correctly
                  console.log("Includes:", inclusions.substring(0, 100) + "...");
                  console.log("Exclusions:", exclusions.substring(0, 100) + "...");
                  //nul checking for inclusions and exclusions
                  if (inclusions == null) {
                    // set the inclusions to the response
                    inclusions = response;
                  }
                  if (exclusions == null) {
                    // set the exclusions to the response
                    exclusions = "";
                  }
                  db.setInclusionsExclusions(takeoff_id, inclusions, exclusions, function (err) {
                    res.send({status: "success", inclusions: inclusions, exclusions: exclusions});
                  });
                }
              });
        }
      });
    });
  });


            






  app.post("/viewEstimate", mid.isAdmin, function (req, res) {
    console.log("estimate view");
    db.getEstimateData(req.body.id, function (err, estimate, takeoff, tax) { // this passes takeoff_id
      if (err) {
        console.log(err);
      } else {
        console.log(estimate);
        res.render("viewEstimate.html", {
          estimate: estimate,
          takeoff: takeoff,
          email: req.user.local.email,
        });
      }
    });
  });

  app.get("/viewEstimate/", mid.isAdmin, function (req, res) {
    let takeoff_id = req.query.takeoff_id;
    console.log("estimate view");
    db.getEstimateData(takeoff_id, function (err, estimate, takeoff, tax) {
      if (err) {
        console.log(err);
      } else {
        console.log(estimate);
        res.render("viewEstimate.html", {
          estimate: estimate,
          takeoff: takeoff,
          email: req.user.local.email,
        });
      }
    }
    );
  }
  );

  app.post("/toggle-material", mid.isAdmin, function (req, res) {
    console.log("toggling ", req.body.material_id);
    let material_id = req.body.material_id;
    if (material_id) {
      db.toggleMaterial(req.body.material_id, function (err) {
        if (err) {
          console.log(err);
        } else {
          res.end();
        }
      });
    }
  });

  app.post("/set-material-state", mid.isAdmin, function (req, res) {
    console.log("setting material state ", req.body.material_id);
    let material_id = req.body.material_id;
    if (material_id) {
      db.setAppliedMaterialState(req.body.material_id, req.body.state, function (err) {
        if (err) {
          console.log(err);
        } else {
          res.end();
        }
      });
    }
  });

  app.post("/separate-line-item", mid.isAdmin, function (req, res) {
    console.log("separating ", req.body.material_id);
    let material_id = req.body.material_id;
    if (material_id && req.body.takeoff_id) {
      db.separateLineItem(req.body.takeoff_id, req.body.material_id, function (err) {
        if (err) {
          console.log(err);
        } else {
          res.end();
        }
      });
    }
  }
  );


  //add-material-subject POST

  app.post("/add-material-subject", mid.isAdmin, function (req, res) {
    console.log("adding material subject ", req.body);
    db.addMaterialSubject(
      req.body.material_id,
      req.body.subject_id,
      function (err) {
        if (err) {
          console.log(err);
        } else {
          res.end();
        }
      }
    );
  });

  app.post("/remove-material-subject", mid.isAdmin, function (req, res) {
    console.log("remove-material-subject ", req.body.material_id);
    if (req.body.subject_id && req.body.material_id) {
      db.removeMaterialSubject(
        req.body.material_id,
        req.body.subject_id,
        function (err) {
          if (err) {
            console.log(err);
          } else {
            res.end();
          }
        }
      );
    }
  });

  // material settings page

  app.get("/materialSettings", mid.isAdmin, function (req, res) {
    res.render("materialSettings.html", defaultRender(req));
  });

  app.get("/getMaterialTypes", mid.isAdmin, function (req, res) {
    db.getMaterialTypes(function (err, types) {
      if (err) {
        console.log(err);
      } else {
        console.log("User retrieved material types: ", types);
        res.send(types);
      }
    });
  });

  app.post("/newMaterial", mid.isAdmin, function (req, res) {
    console.log("adding new material ", req.body);


    const {name, desc, cost, labor_cost, datasheet, coverage} = req.body;
  

    db.addMaterial(
      name,
      desc,
      cost,
      labor_cost,
      datasheet,
      coverage,
      function (err) {
        if (err) {
          console.log(err);
        } else {
          res.status(200).send("Material added");
        }
      }
    );
  });

  app.post("/update-material-coverage", mid.isAdmin, function (req, res) {
    console.log("changing material coverage ", req.body);
    db.changeMaterialCoverage(
      req.body.material_id,
      req.body.coverage,
      function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("updated material coverage");
          res.end();
        }
      }
    );
  });


  app.post("/change-material-price", mid.isAdmin, function (req, res) {
    console.log("changing material price ", req.body);
    db.changeMaterialPrice(
      req.body.takeoff_id,
      req.body.material_id,
      parseFloat(req.body.delta).toFixed(2),
      function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("updated material price");
          res.end();
        }
      }
    );
  });

  app.post("/change-labor-price", mid.isAdmin, function (req, res) {
    console.log("changing labor price ", req.body);
    db.changeLaborPrice(req.body.subject, req.body.price, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated labor price");
        res.end();
      }
    });
  });

  app.post('/create-subject', mid.isAdmin, function (req, res) {
    console.log("creating subject ", req.body);
    // CREATE THE SUBJECT OBJECT
    // get the takeoff_id
    let takeoff_id = req.body.takeoff_id;

    let subject = {
      name: req.body.subject_name,
      measurement: req.body.measurement,
      measurement_unit: req.body.measurement_unit,
      labor_cost: req.body.labor_cost
    }
    // // get the subject object

    db.createSubject(takeoff_id, subject, function (err) {
      if (err) {
        console.log(err);
        res.send(err);
      } else {
        res.end();
      }
    });

  });

  app.post("/update-measurement", mid.isAdmin, function (req, res) {
    console.log("updating measurement ", req.body);
    db.updateMeasurement(req.body.id, req.body.measurement, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated measurement");
      }
    });
  });

  app.post("/update-measurement-unit", mid.isAdmin, function (req, res) {
    console.log("updating measurement unit ", req.body);
    db.updateMeasurementUnit(req.body.id, req.body.unit, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated measurement unit");
      }
    });
  });


  app.post("/update-content", mid.isAdmin, function (req, res) {
    console.log("updating content ", req.body);
    if (req.body.id == null) {
      res.send("no id posted to update-content");
    }


    db.updateContent(req.body.id, req.body.includes, req.body.exclusions, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated estimate inclusions/ exclusions");
        db.updateTakeoffLastUpdatedBy(req.body.id, req.user.local.id, function (err) {
          if (err) {
            console.log(err);
          }
        });

      }
    });
  });

  app.post("/update-takeoff-owner-email", mid.isAdmin, function (req, res) {
    console.log("updating takeoff owner email ", req.body);
    db.updateTakeoffOwnerEmail(req.body.takeoff_id, req.body.owner_email_address, function (
      err
    ) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated owner email");
      }
    });
  });

  app.post("/update-takeoff-invoice-email", mid.isAdmin, function (req, res) {
    console.log("updating takeoff invoice email ", req.body);
    db.updateTakeoffInvoiceEmail(req.body.takeoff_id, req.body.invoice_email_address, function (
      err
    ) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated invoice email");
      }
    });
  });

  app.post('/deletePlans', mid.isAdmin, function (req, res) {
    console.log("deleting plans ", req.body.takeoff_id);
    db.deletePlans(req.body.takeoff_id, function (err) {
      if (err) {
        console.log(err);
        res.end();
      } else {
        res.end();
      }
    });
  });

  app.post("/addOption", mid.isAdmin, function (req, res) {
    console.log("Adding row to takeoff", req.body.takeoff_id);
    console.log("Getting option:", req.body.description);
    console.log("material Delta:", req.body.material_cost);
    console.log("Labor Delta:", req.body.labor_cost);

    db.addOption(
      req.body.takeoff_id,
      req.body.description,
      req.body.material_cost,
      req.body.labor_cost,
      req.body.isRequired,
      function (err, new_row_id) {
        if (err) {
          console.error("Error adding option:", err);
          return res.status(500).send({ error: "Failed to add option" });
        } else {
          console.log("Added successfully");
          db.updateTakeoffLastUpdatedBy(req.body.takeoff_id, req.user.local.id, function (err) {
            if (err) {
              console.log(err);
            }
          });
          res.send({ new_row_id: new_row_id });
        }
      }
    );
  });


  app.post("/loadOptions", function (req, res) {
    console.log("loading options for takeoff ", req.body.takeoff_id);
    db.getOptions(req.body.takeoff_id, function (err, options, mutable, optionsMaterialTax) {
      if (err) {
        console.log(err);
      }

      // also get the material tax for the takeoff
      // get the takeoff

      db.getTakeoff(req.body.takeoff_id, function (err, takeoff) {

        if (err) {
          console.log(err);
        }




        // add the material tax to the options
        let materialTax = 0;

        if (takeoff[0] && takeoff[0].material_cost != null && takeoff[0].material_markup != null && takeoff[0].tax != null) {
          materialTax = parseFloat(takeoff[0].material_cost) * (1.00 + parseFloat(takeoff[0].material_markup)) * (parseFloat(takeoff[0].tax / 100)); // calculate the tax for just materials
        } else {
          console.log("Error calculating material tax")
          console.log(takeoff[0]);
        }

        res.send({ options: options, mutable: mutable, optionsMaterialTax: materialTax });
      });
    });
  });

  app.post("/deleteOption", mid.isAdmin, function (req, res) {
    console.log("deleting option ", req.body.option_id);
    db.deleteOption(req.body.option_id, function (err) {
      if (err) {
        console.log(err);
        res.status(500).send("Failed to delete option");
      } else {
        db.updateTakeoffLastUpdatedBy(req.body.takeoff_id, req.user.local.id, function (err) {
          if (err) {
            console.log(err);
          }
        });
        console.log("deleted");
        res.end();
      }
    });
  });

  app.post("/getEstimateData", function (req, res) {
    console.log("just viewing takeoff id: ", req.body.takeoff_id);
    db.getEstimateData(req.body.takeoff_id, function (err, estimate, takeoff, sales_tax, inclusions_presets) {
      if (err) {
        console.log(err);
      } else {
        res.send({ estimate: estimate, takeoff: takeoff, inclusions_presets: inclusions_presets });
      }
    });
  });

  app.get("/share", function (req, res) {
    const hash = req.query.hash;
    console.log("sharing takeoff ", hash);
    if (!hash || hash.length != 32) {
      res.redirect("/");
    }
    db.getSharedEstimate(
      hash,
      function (err, estimate, takeoff, options) {
        if (err || estimate.length == 0) {
          console.log(err);
          res.render("error.html", { link: '/', linkTitle: 'back', friendly: "Invalid estimate link. Please contact sales respresentative for new estimate." });
          // res.redirect("/");
        } else {
          // authenticate the user session
          // if the user is not authenticated, redirect to the login page

          req.session.estimate_id = estimate[0].estimate_id;
          req.session.hash = hash;
          console.log(estimate[0])
          console.log("estimate created at ", estimate[0].date_last_shared);
          console.log("estimate expires at ", moment(estimate[0].date_last_shared).add(30, 'days').format('YYYY-MM-DD HH:mm:ss')); // 30 days from creation

          // if the current date is greater than the expiration date, redirect to the home page
          if (moment().isAfter(moment(estimate[0].date_last_shared).add(30, 'days'))) {
            console.log("expired");
            res.render("expiredEstimate.html", {
              takeoff: takeoff,
              estimate: estimate[0],
              options: options
            });
          } else {

            let materialTax = parseFloat(takeoff.material_total) * (1.00 + parseFloat(takeoff.material_markup)) * (parseFloat(takeoff.takeoff_tax / 100)); // calulate the tax for just materials


            // compute the options tax

            for (var i = 0; i < options.length; i++) {
              if (options[i].applied == 1) {
                materialTax += parseFloat(options[i].material_cost) * (1.00 + parseFloat(takeoff.material_markup)) * (parseFloat(takeoff.takeoff_tax / 100));
              }
            }

            console.log("Material tax: ", materialTax);
            console.log(takeoff[0]);
            res.render("viewEstimateClient.html", {
              takeoff: takeoff,
              estimate: estimate[0],
              options: options,
              materialTax: materialTax.toFixed(2),
            });

          }


        }
      }
    );
  });

  // download shared pdf 
  app.get("/download-estimate-pdf", function (req, res) {
    const hash = req.query.hash;
    console.log("downloading shared pdf ", hash);
    if (!hash || hash.length != 32) {
      return res.redirect("/");
    }
    db.getSharedEstimate(
      hash,
      function (err, estimate, takeoff, options) {
        if (err || estimate.length == 0) {
          console.log(err);
          return res.render("error.html", { link: '/', linkTitle: 'back', friendly: "Invalid estimate link. Please contact sales respresentative for new estimate." });
        }

       
        const estimateObject = {
          takeoff: takeoff,
          options: options,
          estimate: estimate[0],
        }

        pdf.generateEstimatePDF(estimateObject, function (err, pdfBuffer) {
          if (err) {
            console.log(err);
            return res.status(500).send("Error generating PDF");
          }
          if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
            console.error("PDF generation returned invalid data");
            return res.status(500).send("Failed to generate valid PDF");
          }
          try {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=estimate.pdf');
            res.end(pdfBuffer, 'binary');
          } catch (sendError) {
            console.error("Error sending PDF:", sendError);
            res.status(500).send("Error sending PDF");
          }
        });
      }
    );
  });

  app.post('/changeStartDate', function (req, res) {
    console.log("changing start date ", req.body);
    db.changeStartDate(req.body.takeoff_id, req.body.startDate, function (err) {
      if (err) {
        console.log(err);
        res.status(500).send("Failed to update start date");
      } else {
        console.log("updated start date");
      }
    });
  }
  );


  app.post('/updateCustomerPhone', function (req, res) {
    console.log("updating customer phone ", req.body);
    db.updateCustomerPhone(req.body.takeoff_id, req.body.phone, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated customer phone");
      }
    });
  });

  // renewEstimate POST
  // get the estimate from the database
  // get estimates.creator_id
  // use the user is to get the email of the user
  // send renewal email to the creator


  app.post("/renewEstimate", function (req, res) {
    console.log("renewing estimate ", req.body.estimate_id);
    db.getEstimateById(req.body.estimate_id, function (err, estimate) {
      if (err) {
        console.log(err);
        res.status(500).send("Failed to retrieve estimate");
      } else {
        db.getUserById(estimate.creator_id, function (err, user) {
          if (err) {
            console.log(err);
            res.status(500).send("Failed to retrieve user");
          } else {
            emailer.sendRenewalEmail(user.email, estimate.estimate_id, function (err) {
              if (err) {
                console.log(err);
                res.status(500).send("Failed to send renewal email");
              } else {
                res.end();
              }
            });
          }
        });
      }
    });
  });


  app.post("/updateOptionsSelection", function (req, res) {
    console.log("updating options selection ", req.body);
    db.updateOptionSelection(
      req.body.takeoff_id,
      req.body.option_id,
      req.body.applied,
      function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("updated");
          res.send({ response: "updated!" });
        }
      }
    );
  });

  app.post("/shareClient", mid.isAdmin, function (req, res) {
    console.log("sending email to client ", req.body.takeoff_id);

    console.log("autoSendDeposit: ", req.body.sendAutoDeposit);

    db.updateSendAutoDeposit(req.body.takeoff_id, req.body.sendAutoDeposit, function (err) {
      if (err) {
        console.log(err);
      } else {
        if (req.body.takeoff_id) {
          console.log("sending email ");
          emailer.sendEstimateEmail(req, res, req.body.takeoff_id, function (err, response) {
            if (err) {
              console.log(err);
              res.send("email failed");
            } else {
              console.log(response);
              db.takeoffSetStatus(req.body.takeoff_id, 3, function (err) {
                if (err) {
                  console.log(err);
                } else {


                  res.send("email sent");
                }
              }
              );
            }
          }); // how do we get the response from this function

        } else {
          console.log("");
        }
      }
    });
  });

  app.post("/shareSelf", mid.isAdmin, function (req, res) {
    console.log("sending email to self ", req.user.local.email);
    console.log()
    if (req.body.takeoff_id) {
      console.log("sending email ");


      emailer.sendEstimateEmailInternally(req, res, req.body.takeoff_id, req.user.local.email, function (err, response) {
        if (err) {
          console.log(err);
          res.send("email failed");
        } else {
          console.log(response);
          db.takeoffSetStatus(req.body.takeoff_id, 3, function (err) {
            if (err) {
              console.log(err);
            } else {
              res.send("email sent");
            }
          }
          );
        }
      });
    } else {
      console.log("");
    }
  });

  app.post('/checkMeout/:takeoff_id', function (req, res) {
    console.log("/checkMeout/");
    const takeoff_id = req.params.takeoff_id;
    const method = req.body.method;

    if (method == null || !['card', 'us_bank_account'].includes(method)) {
      console.log('')
    } else {
      db.updatePaymentMethod(takeoff_id, method, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("updated payment method");
        }
      });
    }

    if (takeoff_id == null) {
      console.log("takeoff_id is null");
      res.redirect("/");
    }
    // get takeoff
    db.getTakeoffTotalForDeposit(takeoff_id, function (err, takeoffName, total) {
      console.log(takeoffName + " has a total of " + total);
      if (err) {
        console.log(err);
      } else {
        // post to /v1/prices to create a price_id
        // get the price_id
        // render the checkout page
        //takeoff = takeoff[0];
        //cnvert rows into json object


        // if (total == null) {
        //   console.log('total is null');
        //   total = 50.00;
        // }

        // create a stripe price_id
        const price = stripe.prices.create({
          unit_amount: Math.floor(total * 100),
          currency: 'usd',
          product_data: {
            name: takeoffName + ' Deposit'
          },

        });
        //console.log(price.id);

        // console.log("takeoff is ", takeoff);
        res.render("checkout.html", {
          takeoff_id: takeoff_id,
          priceId: price.id
        });
      }
    }
    );
  });

  app.get('/checkMeout/:takeoff_id', function (req, res) {
    console.log("/checkMeout/ rendered as estimate via get");
    console.log("/checkMeout/");
    const takeoff_id = req.params.takeoff_id;
    const method = req.body.method;

    if (method == null || !['card', 'us_bank_account'].includes(method)) {
      console.log('invalid payment method');
    } else {
      db.updatePaymentMethod(takeoff_id, method, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("updated payment method");
        }
      });
    }

    if (takeoff_id == null) {
      console.log("takeoff_id is null");
      res.redirect("/");
    }
    // get takeoff
    db.getTakeoffTotalForDeposit(takeoff_id, function (err, takeoffName, total) {
      console.log(takeoffName + " has a total of " + total);
      if (err) {
        console.log(err);
      } else {
        // post to /v1/prices to create a price_id
        // get the price_id
        // render the checkout page
        //takeoff = takeoff[0];
        //cnvert rows into json object


        // if (total == null) {
        //   console.log('total is null');
        //   total = 50.00;
        // }

        // create a stripe price_id
        const price = stripe.prices.create({
          unit_amount: Math.floor(total * 100),
          currency: 'usd',
          product_data: {
            name: takeoffName + ' Estimate'
          },

        });
        //console.log(price.id);

        // console.log("takeoff is ", takeoff);
        res.render("checkout.html", {
          takeoff_id: takeoff_id,
          priceId: price.id
        });
      }
    }
    );
  });
  // app.get('/checkMeout/:takeoff_id', function (req, res) {
  //   console.log("/checkMeout/");
  //   const takeoff_id = req.params.takeoff_id;
  //   if (takeoff_id == null) {
  //     console.log("takeoff_id is null");
  //     res.redirect("/");
  //   }
  //   // get takeoff
  //   db.getTakeoffTotalForStripe(takeoff_id, function (err, takeoffName, total) {
  //     console.log(takeoffName + " has a total of " + total);
  //     if (err) {
  //       console.log(err);
  //     } else {

  //       db.getPaymentMethod(takeoff_id, function (err) {
  //         if (err) { console.log(err); }


  //         console.log("total is ", Math.floor(total * 100.0));
  //         // create a stripe price_id
  //         const price = stripe.prices.create({
  //           unit_amount: Math.floor(total * 100.0),
  //           currency: 'usd',
  //           product_data: {
  //             name: takeoffName + ' Estimate'
  //           },

  //         });
  //         //console.log(price.id);

  //         // console.log("takeoff is ", takeoff);
  //         res.render("checkout.html", {
  //           takeoff_id: takeoff_id,
  //           priceId: price.id
  //         });

  //       });
  //     }
  //   });
  // });

  app.post('/payInvoice/:takeoff_id', function (req, res) {
    console.log("/payInvoice/ post");
    const takeoff_id = req.params.takeoff_id;
    const invoice_id = req.body.invoice_id;
    const method = req.body.method;

    // attach the invoice_id to the session
    req.session.invoice_id = invoice_id;


    console.log(invoice_id + " " + method + " " + takeoff_id + " " + req.body); // check if the method is valid

    if (method == null || !['card', 'us_bank_account'].includes(method)) {
      console.log('method is null')
    } else {

      console.log("post updating method with", method);
      db.updateInvoicePaymentMethod(invoice_id, method, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("updated payment method");
        }
      });
    }

    if (takeoff_id == null) {
      console.log("takeoff_id is null");
      res.redirect("/");
    }
    // get takeoff
    db.getInvoiceById(invoice_id, function (err, invoice) {
      // console.log(invoice.invoice_name + " has a total of " + total);
      if (err) {
        console.log(err);
      } else {
        // post to /v1/prices to create a price_id
        // get the price_id
        // render the checkout page
        //takeoff = takeoff[0];
        //cnvert rows into json object


        // if (total == null) {
        //   console.log('total is null');
        //   total = 50.00;
        // }
        // if (invoice.invoice_payment_method == 'us_bank_account') {
        //   invoice.invoiceTotal = invoice.invoiceTotal + (15.00 * 100);
        // }
        // if (invoice.invoice_payment_method == 'card') {
        //   invoice.invoiceTotal = invoice.invoiceTotal * 1.03 + 30;
        // }

        invoice.invoiceTotal = invoice.invoiceTotal * 1.03;


        // create a stripe price_id
        console.log("invoice is ", invoice);
        const price = stripe.prices.create({
          unit_amount: Math.floor(invoice.invoiceTotal),
          currency: 'usd',
          product_data: {
            name: (invoice.invoice_name | invoice.takeoffName | "Invoice")
          },

        });
        //console.log(price.id);

        // console.log("takeoff is ", takeoff);
        res.render("checkoutInvoice.html", {
          invoice_id: invoice_id,
          takeoff_id: invoice.takeoff_id,
          priceId: price.id
        });
      }
    }
    );
  });

  app.get('/payInvoice/:invoice_id', function (req, res) {
    console.log("/payInvoice/ GET");
    console.log(req.params);
    const invoice_id = req.params.invoice_id;
    const method = (req.body.method | 'us_bank_account');

    console.log(invoice_id + " " + method + " " + invoice_id + " " + req.body); // check if the method is valid

    if (method == null || !['card', 'us_bank_account'].includes(method)) {
      console.log('')
    }


    // get takeoff
    db.getInvoiceById(invoice_id, function (err, invoice) {
      // console.log(invoice.invoice_name + " has a total of " + total);
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving invoice");
      } else {
        // post to /v1/prices to create a price_id
        // get the price_id
        // render the checkout page
        //takeoff = takeoff[0];
        //cnvert rows into json object


        // if (total == null) {
        //   console.log('total is null');
        //   total = 50.00;
        // }

        // create a stripe price_id

        // apply offsets according to the payment method
        if (invoice.payment_method == 'us_bank_account') {
          invoice.invoiceTotal = invoice.invoiceTotal + 15.00;
        } else if (invoice.invoice_payment_method == 'card') {
          invoice.invoiceTotal = invoice.invoiceTotal * 1.03 + 30;
        }

        console.log("invoice is ", invoice);
        const price = stripe.prices.create({
          unit_amount: Math.floor(invoice.invoiceTotal),
          currency: 'usd',
          product_data: {
            name: (invoice.invoice_name | invoice.takeoffName | "Invoice")
          },

        });
        //console.log(price.id);

        // console.log("takeoff is ", takeoff);
        res.render("checkoutInvoice.html", {
          invoice_id: invoice_id,
          takeoff_id: invoice.takeoff_id,
          priceId: price.id
        });
      }
    }
    );
  });

  app.post('/create-checkout-session/:takeoff_id', async (req, res) => {
    // create a price_id
    // get whole takeoff
    const takeoff_id = req.params.takeoff_id;
    console.log(req.params);
    if (req.params.takeoff_id == null || req.params.takeoff_id == undefined) {
      console.log("takeoff_id is null");
      res.redirect("/");
    }

    db.getTakeoffTotalForDeposit(req.params.takeoff_id, async function (err, takeoffName, total) { // this applies tax
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving takeoff");
      } else {

        db.getPaymentMethod(takeoff_id, async function (err, method) {
          if (err) {
            console.log(err);
          } else {

            console.log("The method is =", method);


            try {

              // determine the total
              console.log("total  is ", total);

              // create a product
              const product = await stripe.products.create({
                name: takeoffName + " Estimate",
                // unit_amount: takeoff.total,
              });



              const price = await stripe.prices.create({
                unit_amount: Math.floor(total * 100),
                currency: 'usd',
                product: product.id,
              });

              const session = await stripe.checkout.sessions.create({
                ui_mode: 'embedded',
                line_items: [
                  {
                    // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                    price: price.id,
                    quantity: 1,
                  },
                ],
                mode: 'payment',
                return_url: creds.domain + `/return?session_id={CHECKOUT_SESSION_ID}`,
                payment_method_types: ([method]),
              });

              res.send({ clientSecret: session.client_secret });
            } catch (error) {
              console.log(error);
              res.status(500).send("Error creating checkout session");
            }
          }
        });
      }
    });
  });


  //  create-checkout-invoice-session

  app.post('/create-checkout-invoice-session/:invoice_id', async (req, res) => {
    // create a price_id
    // get whole takeoff
    const invoice_id = req.params.invoice_id;
    console.log(req.params);
    if (req.params.invoice_id == null || req.params.invoice_id == undefined) {
      console.log("invoice_id is null");
      res.redirect("/");
    }

    db.getInvoiceById(req.params.invoice_id, function (err, invoice) { // this applies tax
      if (err) {
        console.log(err);
        res.status(500).send("Error retrieving takeoff");
      } else {

        db.getPaymentMethod(invoice.takeoff_id, async function (err, method) {
          if (err) {
            console.log(err);
          } else {

            console.log("The method is =", method);


            try {

              // determine the total
              console.log("total  is ", invoice.invoiceTotal);

              // create a product
              const product = await stripe.products.create({
                name: creds.companyName + " Invoice",
                // unit_amount: takeoff.total,
              });

              if (invoice.payment_method){
                invoice.invoice_payment_method = invoice.payment_method;
              }

              // apply offsets according to the payment method
              if (invoice.invoice_payment_method == 'us_bank_account') {
                invoice.invoiceTotal = invoice.invoiceTotal + (15.00 * 100);
              } else if (invoice.invoice_payment_method == 'card') {
                invoice.invoiceTotal = invoice.invoiceTotal * 1.03 + 0.30;
              } else {
                invoice.invoiceTotal = invoice.invoiceTotal * 1.03;
              }

              console.log("invoice offset total is ", invoice.invoiceTotal);


              const price = await stripe.prices.create({
                unit_amount: Math.floor(invoice.invoiceTotal * 100),
                currency: 'usd',
                product: product.id,
              });

              const session = await stripe.checkout.sessions.create({
                ui_mode: 'embedded',
                metadata: { invoice_id: invoice_id },
                line_items: [
                  {
                    // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                    price: price.id,
                    quantity: 1,
                  },
                ],
                mode: 'payment',
                return_url: creds.domain + `/return?session_id={CHECKOUT_SESSION_ID}`, // different return url for invoices? nah
                payment_method_types: [invoice.invoice_payment_method],
              });

              res.send({ clientSecret: session.client_secret });
            } catch (error) {
              console.log(error);
              res.status(500).send("Error creating checkout session");
            }
          }
        });
      }
    });
  });

  app.get('/session-status', async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    console.log("session id: " + req.query.session_id);
    console.log("session status: " + session.status);
    console.log("customer email: " + session.customer_details.email);
    console.log("status: " + session.status);
    console.log("amount_total: " + session.amount_total);

    console.log("status", session.payment_status)

    // compute the raw amount. subtract 3%
    let raw_amount = session.amount_total - Math.floor((session.amount_total) * 0.0288);
    console.log("session.amount_total: " + session.amount_total);
    console.log("Amount Recieved from stripe" + raw_amount);

    console.log("session:", session);



    if (session.status == 'complete') {
      console.log("session is complete");

    // insert into the payment history table (takeoff_id, invoice_id, amount)

    // get the takeoff_id from the invoice_id
    db.getInvoiceById(session.metadata.invoice_id, function (err, invoice) {
      if (err) {
        console.log(err);
      } else {
        console.log("invoice is ", invoice);
        console.log()
        db.invoicePaid(invoice.takeoff_id, invoice.invoice_id, raw_amount, function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log("payment history inserted");
            // send payment confirmation email to the customer
            console.log("sending payment confirmation email to invoice id:", invoice.invoice_id);
            console.log("sending payment confirmation email to takeoff id:", invoice.takeoff_id);
            emailer.sendPaymentConfirmationEmail(req, res, invoice.takeoff_id, invoice.invoice_id, function (err) {
              if (err) {
                console.log(err);
              } else {
                console.log("payment confirmation email sent");
              }
            });


            

          }
        });
      }
    });


    // take this information and insert it into the data base

    // send confirmation email to the customer with the invoice
    res.send({
      status: session.status,
      customer_email: session.customer_details.email
    });


  } else {
    console.log("session is not complete");
    res.send({
      status: session.status,
      customer_email: session.customer_details.email
    });
  }
  });

  app.get('/return', async (req, res) => {
    console.log("GET /return")
    console.log("returning from stripe");
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    //use session to get the invoice_id
    let invoice_id = session.metadata.invoice_id;
    console.log(session)
    res.render("return.html");
  });

  // app.post('/sessionComplete', async (req, res) => {
  //   // get the session object
  // //  const session = await stripe.checkout.sessions.retrieve(req.body.session_id);
  // //  const session = await stripe.checkout.sessions.retrieve(req.body.sessionId);
  //   console.log("session id:" + req.body.sessionId);

  //   res.send({ success: true });
  // });

  app.post("/viewPaymentHistory", mid.isAdmin, function (req, res) {
    const takeoff_id = req.body.takeoff_id;
    console.log("viewing payment history");
    res.render("viewPaymentHistory.html", { takeoff_id: takeoff_id });
  });

  app.post("/retrievePaymentHistory", mid.isAdmin, function (req, res) {
    console.log("retrieving payment history for ", req.body.takeoff_id);
    db.getPaymentHistory(req.body.takeoff_id, function (err, payments) {
      if (err) {
        console.log(err);
      }


      // format the dates of the payments
      for (let i = 0; i < payments.length; i++) {
        payments[i].created_at = moment(payments[i].created_at).format('MMMM Do YYYY, h:mm:ss a');
      }
      db.getTakeoffById(req.body.takeoff_id, function (err, takeoff) {
        if (err) {
          console.log(err);
        }

        if (takeoff[0] == null || takeoff[0].status < 4) {
          console.log("takeoff not signed");
          res.send("takeoff not signed");
        } else {
          db.getEstimateById(takeoff[0].estimate_id, function (err, estimate) {
            if (err) {
              console.log(err);
            }

            db.getOptions(req.body.takeoff_id, function (err, options) {
              if (err) {
                console.log(err);
              }



              db.getInvoicesByTakeoffId(req.body.takeoff_id, function (err, invoices) {
                if (err) {
                  console.log(err);
                }

                console.log("invoice(s) retrieved: ", invoices);

                db.getChangeOrdersByTakeoffId(req.body.takeoff_id, function (err, change_orders) {
                  if (err) {
                    console.log(err);
                  }

                  console.log("change orders retrieved: ", change_orders);
                  console.log(takeoff[0]);

                  db.getSOVHistoryByTakeoffId(req.body.takeoff_id, function (err, sov_history) {
                    if (err) {
                      console.log(err);
                    }
                    console.log("sov history retrieved: ", sov_history);
                    
                    res.send({ payments: payments, takeoff: takeoff[0], estimate: estimate, options: options, invoices: invoices, change_orders: change_orders, sov_history: sov_history });
                 
                  });
                });
              });
            }
            );
          });
        }
      });


    });
  });

  app.get("/payment", function (req, res) {
    // landing page for the payment system 
    console.log("paymentPage Accessed");
    res.render("payment.html");
  });


  app.post("/payment", function (req, res) {
    console.log("POST /payment");
    console.log(req.body);
    db.getInvoiceByNumber(req.body.invoice_number, function (err, invoice) {
      if (err) {
        console.log(err);
        res.send("error retrieving invoice");
      } else {
        if (invoice == null || invoice.length == 0) {
          console.log("invoice not found");
          res.render("error.html", { link: '/payment', linkTitle: 'enter another invoice number', friendly: "The invoice number you entered was not found. Please check the number and try again." });
        } else if (parseInt(invoice[0].invoice_status) == 1) {
          // oh no, are you trying to pay a paid invoice?
          console.log("invoice already paid");
          res.render("error.html", { link: '/payment', linkTitle: 'enter another invoice number', friendly: "The invoice you are trying to pay has already been paid." });
        } else {
          // remove the hash from the invoice
          console.log(invoice[0].invoice_status);
          invoice[0].hash = null;
          res.render("invoice.html", { invoice: invoice[0] });
        }
      }
    });
  });



  app.post('/invoiceCreator', mid.isAdmin, function (req, res) {
    console.log("creating invoice for", req.body);

    db.getTakeoffById(req.body.takeoff_id, function (err, takeoff) {
      console.log(takeoff);
      if (err || takeoff.length == 0) {
        console.log(err);
        res.send("error fetching takeoff");
      }


      db.getInvoicableChangeOrdersByTakeoffId(req.body.takeoff_id, function (err, invoicable_change_orders) {
        if (err) {
          console.log(err);
          res.send("error fetching invoicable change orders");
        }


        // is the estimate not signed?
        if (takeoff[0].status <= 3) { // at least the estimate is signed
          console.log("estimate not signed");
          res.send("estimate not signed");
        } else {
          console.log(takeoff[0]);
          res.render("createInvoice.html", { takeoff_id: req.body.takeoff_id, invoice_name: "Invoice", takeoff: takeoff[0], change_orders: invoicable_change_orders });
        }
      });
    });
  });

  // deprecated
  // app.post('/create-invoice', mid.isAdmin, function (req, res) {
  //   const takeoff_id = req.body.takeoff_id;
  //   const customerName = req.body.customer_name;
  //   const email = req.body.email;
  //   const invoiceDate = req.body.invoice_date;// the date the invoice is to be sent
  //   const paymentAmount = req.body.payment_amount;
  //   const customAmount = req.body.custom_amount;
  //   const amountToInvoice = customAmount ? customAmount : paymentAmount;

  //   console.log("generating invoice for", req.body);

  //   // print them all in an english sentence
  //   console.log("Customer " + customerName + " with email " + email + " will be invoiced on " + invoiceDate + " for " + paymentAmount + " with an amount of " + amountToInvoice);
  //   db.generateInvoice(req.body.takeoff_id, function (err, takeoff, estimate, options, payments) {
  //     if (err) {
  //       console.log(err);
  //       res.send("error generating invoice");
  //     } else {
  //       res.send({ takeoff: takeoff, estimate: estimate, options: options, payments: payments });
  //     }
  //   });
  // });

  app.get('/viewInvoice', mid.isAdmin, function (req, res) {
    const invoice_id = parseInt(req.query.invoice_id);

    console.log("viewing invoice ", invoice_id);

    db.getInvoiceItemsById(invoice_id,
      function (err, invoice, invoice_items) {
        if (err) {
          console.log(err);
          res.send("error retrieving invoice");
        } else if (invoice.length === 0) {
          res.send("No invoice found");
        } else {
          console.log(invoice);
          console.log(invoice_items);

          let totalAmount = 0;
          for (let i = 0; i < invoice_items.length; i++) {
            totalAmount += parseFloat(invoice_items[i].total);
            invoice_items[i].total = numbersWithCommas(parseFloat(invoice_items[i].total).toFixed(2));
            invoice_items[i].number = i + 1;
          }
          db.getTakeoffById(invoice.takeoff_id, function (err, takeoff) {
            if (err) {
              console.log(err);
              res.send("error retrieving takeoff");
            } else {
              console.log(takeoff);
              res.render("viewInvoice.html", { invoice: invoice, invoice_items: invoice_items, takeoff: takeoff[0], totalAmount: numbersWithCommas(totalAmount.toFixed(2)) });
            }
          }
          );
        }
      });
  });


  app.post('/create-invoice', mid.isAdmin, (req, res) => {
    console.log("/create-invoice received", req.body);

    const { customer_name, takeoff_id, invoice_items } = req.body;
    let changeOrderIds = req.body.change_order_ids;
    let invoice_name = req.body.invoice_name || `Invoice for ${customer_name}`;
    let invoiceTotal = 0;


    // somtimes an array, sometimes not

    if (Array.isArray(changeOrderIds)) {
    } else {
      changeOrderIds = [changeOrderIds];
    }

    console.log("change order ids", changeOrderIds);


    changeOrderIds.forEach((changeOrderId, index) => {
      changeOrderIds[index] = parseInt(changeOrderId);
    });



    invoiceTotal = 0;

    for (let i = 0; i < invoice_items.length; i++) {
      invoiceTotal += parseFloat(invoice_items[i].cost) * parseFloat(invoice_items[i].quantity);
    }

    console.log(invoiceTotal);
    // Get invoice count
    db.getInvoiceCount(takeoff_id, function (err, count) {
      if (err) {
        console.error("Error fetching invoice count:", err);
        return res.status(500).json({ error: 'Failed to fetch invoice count.' });
      }

      if (count === 1) {
        console.log("First invoice - updating status");
        db.takeoffSetStatus(takeoff_id, 5, function (err) {
          if (err) console.error("Error updating takeoff status:", err);
        });
      }

      // Generate invoice number
      const long_id = String(Math.floor(Math.random() * 100000)) + String(takeoff_id);
      const invoiceNumber = `${long_id.padStart(4, '0')}-${String(count + 1).padStart(4, '0')}`;

      

      // Insert invoice into the database
      const insertQuery = `INSERT INTO invoices (takeoff_id, total, invoice_number, invoice_name, due_date, hash) VALUES (?, ?, ?, ?, ?, ?); SELECT LAST_INSERT_ID() AS invoice_id;`;
      const hashValue = db.generateHash();
      
      const dueDate = req.body.due_date || moment().add(30, 'days').format('YYYY-MM-DD');
      db.query(insertQuery, [takeoff_id, invoiceTotal, invoiceNumber, invoice_name, dueDate, hashValue], function (err, results) {
        if (err) {
          console.error("Error inserting invoice:", err);
          return res.status(500).json({ error: 'Failed to create invoice.' });
        }
        //console.log(results);
        const invoiceId = results[1][0].invoice_id;

        // for each id in the changeOrderIds make insert into invoice_change_orders table
        // then, query the db for change orders and add them to the invoice_items array
        if (changeOrderIds.length > 0) {
          for (var i = 0; i < changeOrderIds.length; i++) {
            const changeOrderId = changeOrderIds[i];
            const insertChangeOrderQuery = `INSERT INTO invoice_change_orders (invoice_id, change_order_id) VALUES (?, ?)`;
            db.query(insertChangeOrderQuery, [invoiceId, changeOrderId], function (err) {
              if (err) {
                console.error("Error inserting invoice change order:", err);
              }
            });
          }
        }

        let changeOrdersTotal = 0;
        const changeOrderPromises = changeOrderIds.map(changeOrderId => {
          return new Promise((resolve, reject) => {
            db.getChangeOrderById(changeOrderId, function (err, changeOrder) {
              if (err) {
                console.error("Error fetching change order:", err);
                reject(err);
              } else {
                console.log("change order", changeOrder);
                invoice_items.push({
                  description: "CO-" + changeOrder.co_number + " " + changeOrder.description,
                  cost: changeOrder.change_order_total,
                  quantity: 1
                });
                changeOrdersTotal += changeOrder.change_order_total;
                resolve();
              }
            });
          });
        });


        Promise.all(changeOrderPromises).then(() => {

          // first update the invoice total to include the change orders
          const updateInvoiceTotalQuery = `UPDATE invoices SET total = total + ? WHERE id = ?`;
          db.query(updateInvoiceTotalQuery, [parseFloat(changeOrdersTotal), invoiceId], function (err) {
            if (err) {
              console.error("Error updating invoice total:", err);
              return res.status(500).json({ error: 'Failed to update invoice total.' });
            }
          });

          // Insert invoice items
          console.log("Inserting invoice items");
          console.log("invoice_id", invoiceId);
          console.log("items", invoice_items);
          const itemPromises = invoice_items.map(item => {
            return new Promise((resolve, reject) => {
              if (item.description === "") {
                item.description = "N/A";
              }
              const insertItemQuery = `INSERT INTO invoice_items (invoice_id, description, cost, quantity) VALUES (?, ?, ?, ?)`;
              db.query(insertItemQuery, [invoiceId, item.description, item.cost, item.quantity], function (err) {
                if (err) {
                  console.error("Error inserting invoice item:", err);
                  reject(err);
                } else {
                  resolve();
                }
              });
            });
          });

          Promise.all(itemPromises).then(() => {
            res.status(201).json({ message: "Invoice created and items added.", invoice_id: invoiceId });
          }).catch(err => {
            console.error("Error inserting invoice items:", err);
            res.status(500).json({ error: 'Failed to add invoice items.' });
          });
        }).catch(err => {
          console.error("Error fetching change orders:", err);
          res.status(500).json({ error: 'Failed to fetch change orders.' });
        });
      });
    });

  });

  app.get('/createSOV', mid.isAdmin, function (req, res) {
    console.log("creating schedule of values for ", req.query.takeoff_id);
    const takeoff_id = req.query.takeoff_id;
    if (takeoff_id == null) {
      console.log("takeoff_id is null");
      res.redirect("/");
    } else {
      console.log("creating new SOV for takeoff_id", takeoff_id);
      db.createNewSov(takeoff_id, function (err, sov_id) {
        if (err) {
          console.log(err);
        } else {
          console.log("new sov_id:", sov_id);
          res.redirect("/sov?sov_id=" + sov_id);
        }
      }
      );
    }
  });

  app.get("/sov", mid.isAdmin, function (req, res) {
    console.log("scheduleOfValuesCreator accessed");
    // get the sov_id from the query params
    const sov_id = req.query.sov_id;
    if (sov_id == null) {
      console.log("sov_id is null");
      res.redirect("/");
    } else {
      db.getSOVById(sov_id, function (err, sov) {
        if (err || sov == null) {
          console.log(err);
        }
        console.log(sov);
        res.render("scheduleOfValuesCreator.html", { sov: sov });
      });
    }
  });

  app.get("/sovPdf", mid.isAdmin, function (req, res) {
    console.log("scheduleOfValuesPdf accessed");
    // get the sov_id from the query params

    var render = defaultRender(req);
    const sov_id = req.query.sov_id;
    if (sov_id == null) {
      console.log("sov_id is null");
      res.redirect("/");
    } else {

      db.getSOVById(sov_id, function (err, sov) {
        if (err || sov == null) {
          console.log(err);
          res.send("error retrieving schedule of values");
        } else {

        
          console.log("sov:",sov);

          // get the customer of sov.takeoff_id
          db.getCustomerInfoByTakeoffId(sov.takeoff_id, function (err, customer) {
            if (err) {
              console.log(err);
            } else {
              render.customer = customer;
              console.log("customer", customer)


              db.getSOVItemsById(sov_id, function (err, items) {
                if (err || items == null) {
                  console.log(err);
                  res.send("error retrieving schedule of values items");
                } else {
                  let totalRemaining = 0;
                  let totalPercent = 0;

      

                  // format the dates of the payments and calculate totals
                  for (let i = 0; i < items.length; i++) {
                    items[i].created_at = moment(items[i].created_at).format('MMMM Do YYYY, h:mm:ss a');
                    items[i].updated_at = moment(items[i].updated_at).format('MMMM Do YYYY, h:mm:ss a');

                    // Calculate remaining and percentRemaining
                    items[i].remaining = parseFloat(items[i].total_contracted_amount) - parseFloat(items[i].previous_invoiced_amount) - parseFloat(items[i].this_invoiced_amount);
                    items[i].percentRemaining = ((items[i].remaining / parseFloat(items[i].total_contracted_amount)) * 100).toFixed(2);


                    totalRemaining += items[i].remaining;
                  }

                  console.log(items);

                  sov.total = numbersWithCommas(parseFloat(sov.total).toFixed(2));
                  sov.totalRemaining = numbersWithCommas(totalRemaining.toFixed(2));

                  render.sov = sov;
                  render.sov_items = items;

                  console.log({ sov: sov, sov_items: items });
                  res.render("scheduleOfValuesPdf.html", render);
                
              }
              
            });
          }
        });
      }
      });
    }
  });


  // open to users with the hash
  app.get("/sovPdfDownload", function (req, res) {
    // get the hash

    const hash = req.query.hash;
    console.log("scheduleOfValuesPdf accessed");
    // get the sov_id from the hash
    if (hash == null) {
      console.log("hash is null");
      res.redirect("/");
    } else {
      db.getSOVByHash(hash, function (err, sov) {
        if (err || sov == null) {
          console.log(err);
          res.send("error retrieving schedule of values");
        } else {

        sov.defaults = defaultRender(req).defaults;
          
        console.log(sov);

          pdf.generateSOVPDF(sov, function (err, pdfBuffer) { 
            if (err) {
              console.error("Error generating PDF:", err);
              return res.status(500).send("Error generating PDF");
            }
            if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
              console.error("PDF generation returned invalid data");
              return res.status(500).send("Failed to generate valid PDF");
            }
            try {
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename=sov.pdf');
              res.end(pdfBuffer, 'binary');
            } catch (sendError) {
              console.error("Error sending PDF:", sendError);
              res.status(500).send("Error sending PDF");
            }
          });
      
        }
      });
    }
  });



  app.get('/sovHistory', mid.isAdmin, function (req, res) {
    if (!req.query.sov_id) {
      return res.status(400).send("sov_id is required");
    }
    console.log("sovHistory accessed");
    db.getSOVById(req.query.sov_id, function (err, sov) {
      if (err) {
        console.log(err);
        res.send("error retrieving schedule of values history");
      } else {
        console.log(sov);
        res.render('scheduleOfValuesHistory.html', { sov: sov });
      }
    }
    );
  });

  app.post('/createInvoiceFromSOV', mid.isAdmin, function (req, res) {
    const sov_id = req.body.sov_id;
    console.log("creating invoice from schedule of values for ", req.body.sov_id);
    db.createInvoiceFromSOV(sov_id, function (err, invoice_id) {
      if (err) {
        console.log(err);
        res.send("error creating invoice");
      } else {
        console.log("new invoice_id:", invoice_id);
        //res.redirect("/viewInvoice?invoice_id=" + invoice_id);

        res.send({
          status: 'success',
          id: invoice_id
        });
      }
    }
    );
  });

  app.post("/deleteSOVItem", mid.isAdmin, function (req, res) {
    const sov_item_id = req.body.sov_item_id;
    console.log("deleting schedule of values item for ", req.body.sov_item_id);
    db.deleteSOVItem(sov_item_id, function (err) {
      if (err) {
        console.log(err);
        res.send("error deleting schedule of values item");
      } else {
        console.log("deleted schedule of values item");
        res.send({ status: 'success' });
      }
    }
    );
  }
  );



//   app.get("/sov", mid.isAdmin, function (req, res) {
//     console.log("scheduleOfValuesCreator accessed");
//     // get the sov_id from the query params
    
//     const sov_id = req.query.sov_id;


//     if (sov_id == null) {
//       console.log("takeoff_id is null");
//       res.redirect("/");
//     } else  {
//       db.getSOV(sov_id, function (err, sov) {
//         if (err || sov == null) {
//           console.log(err);
//         }
//         console.log(sov);
//         res.render("scheduleOfValuesCreator.html", {sov: sov });
//       });
//     }
// });

// app.get("/shareSOV", mid.isAdmin, function (req, res) {
//   console.log("sharing schedule of values for ", req.query.hash);

//   if (!req.query.hash || req.query.hash.length != 32) {
//     res.redirect("/");
//   } else {
//     db.getSOVByHash(
//       req.query.hash,
//       function (err, sov) {
//         if (err || sov == null) {
//           console.log(err);
//           res.redirect("/");
//         } else {
//           console.log(sov);
//           res.render("scheduleOfValuesCreator.html", { sov: sov });
//         }
//       }
//     );
//   }
// }
// );


// // app.get("/retrieveSOV", mid.isAdmin, function (req, res) {
// //   console.log("retrieving schedule of values for ", req.query.takeoff_id);
// //   db.getSOV(req.query.takeoff_id, function (err, sov) {
// //     if (err || sov == null) {
// //       console.log(err);
// //     }
// //     console.log(sov);
// //     res.send(sov[0]);
// //   }
// //   );
// // }
// // );
// // /sovHistory route - add error handling for missing sov_id
// app.get('/sovHistory', mid.isAdmin, function (req, res) {
//   if (!req.query.sov_id) {
//     return res.status(400).send("sov_id is required");
//   }
//   console.log("sovHistory accessed");
//   res.render('scheduleOfValuesHistory.html', {
//     sov_id: req.query.sov_id
//   });
// });

// // /retrieveSOV route - improve error handling
app.post('/retrieveSOV', mid.isAdmin, function (req, res) {
  if (!req.body.sov_id) {
    return res.status(400).send("sov_id is required");
  }
  
  console.log("retrieving schedule of values for ", req.body.sov_id);
  db.getSOVById(req.body.sov_id, function (err, sov) {
    if (err) {
      console.error("Error retrieving SOV:", err);
      return res.status(500).send("error retrieving schedule of values");
    }
    if (!sov) {
      return res.status(404).send("schedule of values not found");
    }

    db.getSOVItemsById(req.body.sov_id, function (err, items) {
      if (err) {
        console.error("Error retrieving SOV items:", err);
        return res.status(500).send("error retrieving schedule of values items");
      } else {
        sov.sov_items = items;
        console.log("items", items);
        res.send(sov);
      }
    });

  });
});

// // /createSOV route - add proper error response
// app.get('/createSOV', mid.isAdmin, function (req, res) {
//   if (!req.query.takeoff_id) {
//     return res.status(400).send("takeoff_id is required");
//   }
  
//   console.log("creating schedule of values for ", req.query.takeoff_id);
//   db.createSOV(req.query.takeoff_id, function (err, sov_id) {
//     if (err) {
//       console.error("Error creating SOV:", err);
//       return res.status(500).send("error creating schedule of values");
//     }
//     if (!sov_id) {
//       return res.status(500).send("failed to create schedule of values");
//     }

//     console.log("new sov_id:", sov_id);
//     res.redirect("/sov?sov_id=" + sov_id);
//   });
// });

// // /updateSOV route - validate input


app.post('/addSOVItem', mid.isAdmin, function (req, res) {
  const sov_id = req.body.sov_id;

  db.addSOVItem(sov_id, function (err, sov_item_id) {
    if (err) {
      console.error("Error adding SOV item:", err);
      return res.status(500).send("error adding schedule of values item");
    }
    if (!sov_item_id) {
      return res.status(500).send("failed to add schedule of values item");
    }
    console.log("added schedule of values item");
    res.send({status:'success', sov_item_id: sov_item_id});
  });
});


app.post('/updateSOV', mid.isAdmin, function (req, res) {
  console.log("updating schedule of values for ", req.body);
  const sov_id = req.body.sov_id;
  const items = req.body.items;
  
  if (!sov_id) {
    return res.status(400).send("sov_id is required");
  }
  if (!Array.isArray(items)) {
    return res.status(400).send("items must be an array");
  }

  db.updateSOVItems(sov_id, items, function (err) {
    if (err) {
      console.error("Error updating SOV:", err);
      return res.status(500).send("error updating schedule of values");
    }
    console.log("updated schedule of values");
    res.send("updated");
  });
});

// app.post('/updateSOV', mid.isAdmin, function (req, res) {


app.post('/getTerms', function (req, res) {
  console.log("getting terms");
  db.getTerms(function (err, terms) {
    if (err) {
      console.log(err);
    }
    console.log(terms);
    res.send(terms);
  }
  );
}
);

  app.post('/share-invoice', mid.isAdmin, function (req, res) {
    console.log("sending email to client ", req.body.takeoff_id);
    if (req.body.takeoff_id) {
      console.log("sending email ");
      emailer.sendInvoiceEmail(req, res, req.body.takeoff_id, req.body.invoice_id, function (err, response) {
        if (err) {
          console.log(err);
          res.send("email failed");
        } else {
          console.log(response);
          db.takeoffSetStatus(req.body.takeoff_id, 5, function (err) {
            if (err) {
              console.log(err);
            } else {
              res.send("email sent");
            }
          }
          );
        }
      });
    } else {
      console.log("");
    }
  }
  );
  // called by admin to send the invoice email
  app.post("/shareInvoiceWithClient", mid.isAdmin, function (req, res) {
    console.log("sending invoice to client ", req.body);
    db.getInvoiceById(req.body.invoice_id, function (err, invoice) {
      if (err) {
        console.log(err);
        res.send("error retrieving invoice");
      } else {
        console.log(invoice);
        emailer.sendInvoiceEmail(req, res, req.body.takeoff_id, req.body.invoice_id, function (err, response) {
          if (err) {
            console.log(err);
            res.send("email failed");
          } else {
            console.log(response);
            res.send("email sent");
          }
        });
      }
    });
  }
  );



  app.get('/shareInvoice', function (req, res) {
    const hash = req.query.hash;
    console.log("sharing invoice ", hash);
    if (!hash || hash.length != 32) {
      res.redirect("/");
    }
    db.getSharedInvoice(
      hash,
      function (err, invoice, items, takeoff, totalAmount) {
        if (err || invoice == null) {
          console.log(err);
          res.redirect("/");
        } else {

          if (invoice.status == 1) {
            // if the invoice is paid, render message the invoice is paid
            console.log(invoice);
            res.render("paidInvoice.html", {
              message: "This invoice has been paid.",
              invoice: invoice
            });
          } else {
            console.log(invoice)
            console.log("invoice created at ", invoice.created_at);
            console.log("invoice expires at ", moment(invoice.created_at).add(30, 'days').format('YYYY-MM-DD HH:mm:ss')); // 30 days from creation

            // if the current date is greater than the expiration date, redirect to the home page
            if (moment().isAfter(moment(invoice.date_created).add(30, 'days'))) {
              console.log("expired");
              res.render("expiredInvoice.html", {
                takeoff: takeoff,
                invoice: invoice[0],
              });
            } else {
              console.log(invoice);
              console.log(items);

              console.log(totalAmount);
              // some renameing to make the invoice object render work
              invoice.invoice_id = invoice.id;
              invoice.invoiceTotal = invoice.total;

              // also get the most recent sov hash
              db.getSOVHashByTakeoffId(invoice.takeoff_id, function (err, sov) {
                if (err) {
                  console.log(err);
                } else {
                  console.log("sov hash", sov);
                  // render the invoice
                  res.render("viewInvoiceClient.html", { invoice: invoice, invoice_items: items, takeoff: takeoff, totalAmount: totalAmount.toFixed(2), sov_hash: sov });
                }
              });

            }
          }

        }
      }
    );
  });


  app.post('/deleteInvoice', mid.isAdmin, function (req, res) {
    console.log("deleting invoice ", req.body);
    db.deleteInvoice(req.body.invoice_id, function (err) {
      if (err) {
        console.log(err);
        res.send("error deleting invoice");
      } else {
        res.send("deleted");
      }
    });
  });


  // change order stuff

  app.post('/changeOrderCreator', mid.isAdmin, function (req, res) {
    console.log("creating change order for", req.body);

    db.getTakeoffById(req.body.takeoff_id, function (err, takeoff) {
      console.log(takeoff);
      if (err || takeoff.length == 0) {
        console.log(err);
        res.send("error fetching takeoff");
      }

      // is the estimate not signed?
      if (takeoff[0].status <= 3) { // at least the estimate is signed
        console.log("estimate not signed");
        res.send("estimate not signed");
      } else {
        console.log(takeoff[0]);
        res.render("createChangeOrder.html", { takeoff_id: req.body.takeoff_id, change_order_name: "Change Order", takeoff: takeoff[0] });
      }
    });
  });

  app.post('/create-change-order', mid.isAdmin, function (req, res) {

    const takeoff_id = req.body.takeoff_id;
    const change_order_name = req.body.change_order_name;
    const change_order_description = req.body.change_order_description;
    const change_order_total = req.body.change_order_total;
    const change_order_items = req.body.change_order_items;
    let change_order_total_amount = 0;

    // Calculate change order total
    if (Array.isArray(change_order_items) && change_order_items.length > 0) {
      change_order_total_amount = change_order_items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    }

    // Get change order count
    db.getChangeOrderCount(takeoff_id, function (err, count) {
      if (err) {
        console.error("Error fetching change order count:", err);
        return res.status(500).json({ error: 'Failed to fetch change order count.' });
      }

      console.log("change order count", count);
      // Generate change or≈der number
      const long_id = String(Math.floor(Math.random() * 10000000)) + String(takeoff_id);
      const changeOrderNumber = `${long_id.padStart(4, '0')}-${String(count + 1).padStart(4, '0')}`;

      // Insert change order into the database
      const insertQuery = `INSERT INTO change_orders (takeoff_id, total, change_order_number, change_order_name, change_order_description) VALUES (?, ?, ?, ?, ?); SELECT LAST_INSERT_ID() AS change_order_id;`;
      db.query(insertQuery, [takeoff_id, change_order_total_amount, changeOrderNumber, change_order_name, change_order_description], function (err, results) {
        if (err) {
          console.error("Error inserting change order:", err);
          return res.status(500).json({ error: 'Failed to create change order.' });
        }
        const changeOrderId = results[1][0].change_order_id;

        // Insert change order items
        console.log("Inserting change order items");
        console.log("change_order_id", changeOrderId);
        console.log("items", change_order_items);
        if (change_order_items.length > 0) {
          for (var i = 0; i < change_order_items.length; i++) {
            const item = change_order_items[i];
            if (item.description === "") {
              item.description = "N/A";
            }
            const insertItemQuery = `INSERT INTO change_order_items (change_order_id, description, cost, quantity) VALUES (?, ?, ?, ?)`;
            db.query(insertItemQuery, [changeOrderId, item.description, item.cost, item.quantity], function (err) {
              if (err) {
                console.error("Error inserting change order item:", err);
              }
            });
          }
          res.status(201).json({ message: "Change order created and items added.", change_order_id: changeOrderId });
        } else {
          res.status(201).json({ message: "Change order created but no items added." });
        }
      });
    });
  });


  app.get('/viewChangeOrder', mid.isAdmin, function (req, res) {

    const change_order_id = parseInt(req.query.changeOrderId);

    console.log("viewing change order ", change_order_id);

    db.getChangeOrderById(change_order_id, function (err, change_order) {
      if (err) {
        console.log(err);
        res.send("error retrieving change order");
      } else if (change_order.length === 0) {
        res.send("No change order found");
      } else {
        db.getChangeOrderItemsById(change_order_id, function (err, change_order_items) {
          if (err) {
            console.log(err);
            res.send("error retrieving change order items");
          } else {
            let totalAmount = 0;
            for (let i = 0; i < change_order_items.length; i++) {
              totalAmount += parseFloat(change_order_items[i].total);
              change_order_items[i].total = numbersWithCommas((parseFloat(change_order_items[i].cost) * parseFloat(change_order_items[i].quantity)).toFixed(2));
              change_order_items[i].number = i + 1;
            }

            db.getTakeoffById(change_order.takeoff_id, function (err, takeoff) {
              if (err) {
                console.log(err);
                res.send("error retrieving takeoff");
              } else {
                console.log(takeoff);
                console.log(change_order_items);
                res.render("viewChangeOrder.html", {
                  change_order: change_order,
                  change_order_items: change_order_items,
                  takeoff: takeoff[0],
                  totalAmount: numbersWithCommas(totalAmount.toFixed(2))
                });
              }
            });
          }
        });
      }
    });
  });

  app.post('/shareChangeOrderWithClient', mid.isAdmin, function (req, res) {
    console.log("sending email to client ", req.body.change_order_id);
    if (req.body.change_order_id) {
      console.log("sending email ");
      emailer.sendChangeOrderEmail(req, res, req.body.change_order_id, function (err, response) {
        if (err) {
          console.log(err);
          res.send("email failed");
        } else {
          console.log(response);
          res.send("email sent");
        }
      });
    } else {
      console.log("");
    }
  }
  );

  app.get('/shareChangeOrder', function (req, res) {
    const hash = req.query.hash;
    console.log("sharing change order ", hash);
    if (!hash || hash.length != 32) {
      res.redirect("/");
    }
    db.getSharedChangeOrder(
      hash,
      function (err, change_order, change_order_items) {
        if (err || change_order == null) {
          console.log(err);
          res.redirect("/");
        } else {
          console.log(change_order);

          // save the hash in the session
          req.session.hash = hash;
          res.render("viewChangeOrderClient.html", { change_order: change_order, change_order_items: change_order_items });
        }
      }
    );
  });

  // open to public, should probably change to hash
  app.post("/updateChangeOrderStatus", function (req, res) {
    console.log("updating change order status");
    console.log(req.body);
    // make sure the session.hash matches 
    const hash = req.body.hash;

    if (hash != req.body.hash) {
      console.log("hashes do not match");
      res.send("hashes do not match");
      return;
    }
    // check if the change order id is valid
    if (isNaN(req.body.change_order_id)) {
      console.log("change order id is not a number");
      res.send("change order id is not a number");
      return;
    }
    // check if the status is valid
    if (isNaN(req.body.status)) {
      console.log("status is not a number");
      res.send("status is not a number");
      return;
    }
    // check if the status is 0 or 1
    if (req.body.status != 0 && req.body.status != 1) {
      console.log("status is not 0 or 1");
      res.send("status is not 0 or 1");
      return;
    }

    // set the req.session.hash to the hash
    req.session.hash = hash;





    db.updateChangeOrderStatus(req.body.change_order_id, parseInt(req.body.status), hash,  function (err) {
      if (err) {
        console.log(err);
        res.send("error updating change order status");
      } else {
        res.send("success");
      }
    });
  }
  );




  // this function handles the form to create a new change order
  app.post("/submitChangeOrder", mid.isAdmin, function (req, res) {
    console.log("submitting change order");
    console.log(req.body);
    db.createChangeOrder(req.body, function (err, change_order_id) {
      if (err) {
        console.log(err);
        res.send("error creating change order");
      } else {
        res.redirect("/viewChangeOrder?changeOrderId=" + change_order_id);
      }
    });
  });


  app.get("/getInvoicableChangeOrders", mid.isAdmin, function (req, res) {
    console.log("getting invoicable change orders");
    let takeoff_id = req.query.takeoff_id;
    db.getInvoicableChangeOrdersByTakeoffId(takeoff_id, function (err, change_orders) {
      if (err) {
        console.log(err);
        res.send("error fetching change orders");
      } else {
        res.send(change_orders);
      }
    });
  });








  // ending perentheses do not delete (for the module.exports thing)
};

function arrayToCSV(objArray) {
  const array = typeof objArray !== "object" ? JSON.parse(objArray) : objArray;
  let str =
    `${Object.keys(array[0])
      .map((value) => `"${value}"`)
      .join(",")}` + "\r\n";

  return array.reduce((str, next) => {
    str +=
      `${Object.values(next)
        .map((value) => `"${value}"`)
        .join(",")}` + "\r\n";
    return str;
  }, str);
}

function defaultRender(req) {
  if (req.isAuthenticated() && req.user && req.user.local) {
    // basic render object for fully authenticated user
    return {
      inDevMode: sys.DEV_MODE,
      auth: {
        isAuthenticated: true,
        userIsAdmin: req.user.local.isAdmin,
        message: "Hello,  " + req.user.name.givenName + "!",
        email: req.user.local.email
      },
      defaults: {
        sysName: sys.SYSTEM_NAME,
        companyName: creds.companyName,
        companyAddress: creds.companyAddress
      },
    };
  } else {
    // default welcome message for unauthenticated user
    return {
      inDevMode: sys.inDevMode,
      auth: {
        message: "Welcome! Please log in.",
      },
    };
  }
}

function bankOffset(total) {
  return total + (15);

}

function cardOffset(total) {


  return total * 1.0288 + 0.3;

}


