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

// require payment.js
//const payment = require("./payment.js");

const stripe = require('stripe')(creds.stripe.secret);

const qb = require("./quickbooks.js");


const YOUR_DOMAIN = creds.domain;


const fs = require("fs");
const { parse } = require("csv-parse");

var fileCounter = Math.floor(1000 + Math.random() * 9000);

// file upload stuff
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, sys.PROJECT_PATH+"/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "" + fileCounter + ".csv");
  },
});

// Define maximum upload file size (32 MB) it's just a csv
const maxSize = 1 * 1000 * 1000 * 32;

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

// csv parsing stuff

function readTakeoff(req, res, filename, cb) {
  console.log("parsing ", filename);
  var results = [];
  var headers = [];

  db.createNewTakeoff(req, res, function (err, takeoff_id) {
    console.log("takeoff id is ", takeoff_id);
    fs.createReadStream(filename)

      .pipe(parse({ delimiter: "," }))
      .on("headers", (headersInOrder) => {
        // console.log(`First header: ${headersInOrder}`);
        headers = headersInOrder;
        //convert to snake case
        headers = headers.map(function (header) {
          return header.replace(/\s+/g, "_").toLowerCase();
        });

        // replace second space if it exists
        headers = headers.map(function (header) {
          return header.replace(/\s+/g, "_");
        });

        // header should not start with an underscore
        headers = headers.map(function (header) {
          if (header.startsWith("_")) {
            return header.substring(1);
          }
          return header;
        });

        //print the headers
        //console.log("headers are ", headers);
      })

      .on("data", function (row) {
        //console.log(row);
        results.push(row);
      })
      .on("end", function () {
        db.loadTakeoffData(takeoff_id, results, headers, function (err) {
          if (err) {
            cb(err);
          } else {
            console.log("takeoff loaded");
            db.takeoffSetStatus(takeoff_id, status, function (err) {});
          }
        });

        db.generateTakeoffMaterials(takeoff_id, function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log("materials generated");
          }
        });
        res.redirect("/");
      })
      .on("error", function (error) {
        console.log(error.message);
        cb(error);
      });
  });
}

// main page stuff
module.exports = function (app) {
  // GET requests
  app.get("/", mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    db.summaryAllTakeoffs(function (err, takeoffs) {
      if (err) {
        console.log(err);
      } else {
        render.takeoffs = takeoffs;
        console.log("User: " + "Testing User");
        res.render("main.html", render);
      }
    });
  });

  app.get("/addTakeoff", mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    // db

    res.render("addTakeoff.html", render);
  });

  //updateTakeoff POST
  app.post("/update-takeoff-name", mid.isAuth, (req, res) => {
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

  app.post("/update-takeoff-owner-name", mid.isAuth, (req, res) => {
    console.log("updating takeoff name");
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

  app.post("/update-takeoff-owner-billing", mid.isAuth, (req, res) => {
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

  app.get("/getTakeoffs", mid.isAuth, (req, res) => {
    db.getTakeoffs(function (err, takeoffs) {
      if (err) {
        console.log(err);
      } else {
        res.send(takeoffs);
      }
    });
  });

  // post request to https://estimate.sunpaintingva.com/viewTakeoff with body param takeoff_id

  app.post("/alButton", mid.isAuth, function (req, res) {
    console.log("alButton");
    // if the user name is al, res.send "Hello AL!" otherwise, say you are not al
    if (req.user.local.name == "AL" || req.user.local.name == "Johnny") {
      res.send("Hello AL!");
    } else {
      res.send("You are not AL");
    }
  });

  app.post("/viewTakeoff", mid.isAuth, function (req, res) {
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
  app.post("/uploadTakeoff", mid.isAuth, function (req, res) {
    console.log("uploading ");
    // Use Multer middleware to handle file upload
    upload(req, res, function (err) {
      if (err) {
        // Handle errors during file upload
        console.log(err);
        res.send(err);
      } else {
        // Success message after a successful upload

        //call the readTakeoff function to parse the csv file
        if (req.file) {
          console.log("about to read ", req.file.filename);
          req.body.takeoff_id;
          readTakeoff(
            req,
            res,
            sys.PROJECT_PATH+"/uploads/" + req.file.filename,
            function (err) {
              if (err) {
                console.log(err);
              } else {
                console.log(
                  "takeoff read. time to generate estimate for takeoff_id :",
                  req.body.takeoff_id
                );
                res.redirect("/");
              }
            }
          );
        } else {
          console.log("no file uploaded");
          res.send("no file uploaded");
        }
      }
    });
  });

  app.post("/editTakeoff", mid.isAuth, function (req, res) {
     console.log("editing", req.body.takeoff_id);

    db.getTakeoff(req.body.takeoff_id, function (err, takeoff, materials) {
      if (err) {
        console.log(err);
      }
      db.getAllMaterials(function (err, allMaterials) {
        if (err) {
          console.log(err);
        } else {
          res.render("editTakeoff.html", {
            takeoff: takeoff,
            subjects: materials,
            materials: allMaterials,
            takeoff_id: req.body.takeoff_id,
          });
        }
      });
    });
  });

  app.post("/loadTakeoffMaterials", mid.isAuth, function (req, res) {
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

  app.post("/updateTakeoffTotal", mid.isAuth, function (req, res) {
    console.log("updating takeoff total ", req.body);
    db.updateTakeoffTotal(req.body.takeoff_id, req.body.total, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated");
        res.end();
      }
    });
  });

  app.post("/update-signature", function (req, res) {
    console.log("updating signature ", req.body);
    db.updateSignature(
      req.body.takeoff_id,
      req.body.signature,
      req.body.date,
      function (valid, err) {
        if (err) {
          console.log(err);
        } else {
          if (valid){
            res.send(valid);
          }
          
        }
      }
    );

    db.takeoffSetStatus(req.body.takeoff_id, 4, function (err) {
      if (err) {
        console.log(err);
      }
    }
    );
  });


  /* this funciton should be split into two functions one POST /settings to render the settings page. The settings page with then pull the 
  settings from the server so we will need a second function that res.send the settings to the client */
  
  app.post("/settings", mid.isAuth, function (req, res) {
    
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

app.get('/getSettings', mid.isAuth, function (req, res) {
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

app.post('/updateSettings', mid.isAuth, function (req, res) {
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


app.post("/generateEstimate", function (req, res) {
  // priority: this function should check to see if an estimate has been generated, if yes, send to client, if no, generate
  var takeoff_id = req.body.takeoff_id;
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
        console.log(takeoff_info[0].estimate_id)
        if (takeoff_info[0].estimate_id == null) {
          // Build the prompt


           prompt = prompt[0].setting_value;

          console.log("Prompt:", prompt);
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
              }
            }
            prompt += "}";
          }

          // call to  async function callChatGPT with the response as the return value and saves the it to the database
          let response = "";
          chatgpt.sendChat(prompt + JSON.stringify(estimate)).then((subres) => {
            response = subres;
            //console.log("Response:", response);

            // process response for render
            // split into two vars called includes, and exclusions
            let inclusions = response.split("</br>")[0];
            let exclusions = response.split("</br>")[1];

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
            db.saveEstimate(takeoff_id, inclusions, exclusions, function (err) {
              res.render("viewEstimate.html", {
                inclusions: inclusions,
                exclusions: exclusions,
                takeoff_id: takeoff_id,
                estimate: estimate,
                takeoff: takeoff_info,
              });
            });
          });

        } else {
          console.log("No estimate generated, just retrieved");

          // get the inclusions and exclusions from the database
          db.getEstimateData(takeoff_id, function (err, estimate, takeoff_info) {
            if (err) {
              console.log(err);
            } else {
              console.log(estimate);
              res.render("viewEstimate.html", {
                estimate: estimate,
                takeoff: takeoff_info,
                takeoff_id: takeoff_id,
              });
            }
          });

        }
      }
    });
  });
});
});
  

  app.post("/viewEstimate", mid.isAuth, function (req, res) {
    console.log("estimate view");
    db.getEstimateData(req.body.id, function (err, estimate, takeoff, tax) {
      if (err) {
        console.log(err);
      } else {
        console.log(estimate);
        res.render("viewEstimate.html", {
          estimate: estimate,
          takeoff: takeoff,
        });
      }
    });
  });

  app.post("/toggle-material", mid.isAuth, function (req, res) {
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

  app.post("/separate-line-item", mid.isAuth, function (req, res) {
    console.log("separating ", req.body.material_id);
    let material_id = req.body.material_id;
    if (material_id) {
      db.separateLineItem(req.body.material_id, function (err) {
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

  app.post("/add-material-subject", mid.isAuth, function (req, res) {
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

  app.post("/remove-material-subject", mid.isAuth, function (req, res) {
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

  app.get("/materialSettings", mid.isAuth, function (req, res) {
    res.render("materialSettings.html", defaultRender(req));
  });

  app.get("/getMaterialTypes", mid.isAuth, function (req, res) {
    db.getMaterialTypes(function (err, types) {
      if (err) {
        console.log(err);
      } else {
        console.log("User retrieved material types: ", types);
        res.send(types);
      }
    });
  });

  app.post("/newMaterial", mid.isAuth, function (req, res) {
    console.log("adding new material ", req.body);

    // must process the material type
    // print the material type
    console.log("Material type: ", req.body.type);
    if (req.body.type == "null") {
      req.body.type = null;
    }

    db.addMaterial(
      req.body.name,
      req.body.desc,
      req.body.cost,
      req.body.coverage,
      req.body.type,
      function (err) {
        if (err) {
          console.log(err);
        } else {
          res.end();
        }
      }
    );
  });

  app.post("/change-material-price", mid.isAuth, function (req, res) {
    console.log("changing material price ", req.body);
    db.changeMaterialPrice(
      req.body.material_id,
      req.body.delta,
      function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("updated");
          res.end();
        }
      }
    );
  });

  app.post("/change-labor-price", mid.isAuth, function (req, res) {
    console.log("changing labor price ", req.body);
    db.changeLaborPrice(req.body.subject, req.body.price, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated");
        res.end();
      }
    });
  });

  app.post('/create-subject', mid.isAuth, function (req, res) {
    console.log("creating subject ", req.body);
    // CREATE THE SUBJECT OBJECT
    // get the takeoff_id
    let takeoff_id = req.body.takeoff_id;

    let subject  = {
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

  app.post("/update-measurement", mid.isAuth, function (req, res) {
    console.log("updating measurement ", req.body);
    db.updateMeasurement(req.body.id, req.body.measurement, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated");
      }
    });
  });

  app.post("/update-measurement-unit", mid.isAuth, function (req, res) {
    console.log("updating measurement unit ", req.body);
    db.updateMeasurementUnit(req.body.id, req.body.unit, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated");
      }
    });
  });

  app.post("/update-content", mid.isAuth, function (req, res) {
    console.log("updating content ", req.body);
    if (req.body.id == null) {
      res.send("no id posted to update-content");
    }


    db.updateContent(req.body.id, req.body.includes, req.body.exclusions, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated");
      }
    });
  });

  app.post("/update-takeoff-owner-email", mid.isAuth, function (req, res) {
    console.log("updating takeoff owner email ", req.body);
    db.updateTakeoffOwnerEmail(req.body.takeoff_id, req.body.owner_email_address, function (
      err
    ) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated");
      }
    });
  }); 

  app.post("/update-takeoff-invoice-email", mid.isAuth, function (req, res) {
    console.log("updating takeoff invoice email ", req.body);
    db.updateTakeoffInvoiceEmail(req.body.takeoff_id, req.body.invoice_email_address, function (
      err
    ) {
      if (err) {
        console.log(err);
      } else {
        console.log("updated");
      }
    });
  });

  app.post("/add-row", mid.isAuth, function (req, res) {
    console.log("Adding row to takeoff", req.body.takeoff_id);
    console.log("Getting option:", req.body.option);
    console.log("Cost Delta:", req.body.cost_delta);
    console.log("Row ID:", req.body.row_id);

    db.addOption(
      req.body.takeoff_id,
      req.body.option,
      req.body.cost_delta,
      req.body.row_id,
      function (err, new_row_id) {
        if (err) {
          console.log(err);
        } else {
          console.log("added");
          res.send({ new_row_id: new_row_id });
        }
      }
    );
  });

  app.post("/loadOptions", function (req, res) {
    console.log("loading options for takeoff ", req.body.takeoff_id);
    db.getOptions(req.body.takeoff_id, function (err, options, mutable) {
      if (err) {
        console.log(err);
      }
      res.send({options:options, mutable:mutable});
    });
  });

  app.post("/getEstimateData", function (req, res) {
    console.log("just viewing takeoff id: ", req.body.takeoff_id);
    db.getEstimateData(req.body.takeoff_id, function (err, estimate, takeoff) {
      if (err) {
        console.log(err);
      } else {
        res.send({ estimate: estimate, takeoff: takeoff });
      }
    });
  });

  app.get("/share/:hash", function (req, res) {
    console.log("sharing takeoff ", req.params.hash);
    if (req.params.hash.length != 32) {
      res.redirect("/");
    }
    db.getSharedEstimate(
      req.params.hash,
      function (err, estimate, takeoff, options) {
        if (err) {
          console.log(err);
          res.redirect("/");
        } else {
          console.log("shared");
          res.render("viewEstimateClient.html", {
            takeoff: takeoff,
            estimate: estimate,
            options: options,
          });
        }
      }
    );
  });
  app.post("/share/updateOptionsSelection", function (req, res) {
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

  app.post("/shareClient", mid.isAuth, function (req, res) {
    console.log("sending email to client ", req.body.takeoff_id);
    if (req.body.takeoff_id) {
      console.log("sending email ");
      emailer.sendEstimateEmail(req.body.takeoff_id, function (err, response){
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
  });

  app.post('/checkMeout/:takeoff_id', function (req, res) {
    console.log("/checkMeout/");
    const takeoff_id = req.params.takeoff_id;
    if (takeoff_id == null) {
      console.log("takeoff_id is null");
      res.redirect("/");
    }
    // get takeoff
    db.getTakeoffTotal(takeoff_id, function (err, takeoffName, total) {
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
        unit_amount: Math.floor(total*100),
        currency: 'usd',
        product_data: {
          name: takeoffName +' Estimate'
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
  console.log("/checkMeout/");
  const takeoff_id = req.params.takeoff_id;
  if (takeoff_id == null) {
    console.log("takeoff_id is null");
    res.redirect("/");
  }
  // get takeoff
  db.getTakeoffTotal(takeoff_id, function (err, takeoffName, total) {
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
      unit_amount: Math.floor(total*100),
      currency: 'usd',
      product_data: {
        name: takeoffName +' Estimate'
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
   

app.post('/create-checkout-session/:takeoff_id', async (req, res) => {
  // create a price_id
  // get whole takeoff
  const takeoff_id = req.params.takeoff_id;
  console.log(req.params);
  if (req.params.takeoff_id == null || req.params.takeoff_id == undefined) {
    console.log("takeoff_id is null");
    res.redirect("/");
  }
  
  db.getTakeoffTotal(req.params.takeoff_id, async function (err, takeoffName, total) {
    if (err) {
      console.log(err);
      res.status(500).send("Error retrieving takeoff");
    } else {

   
      if ( total == null) {
        console.log("total is null");
       total = 13000.00 * 100;
      }
      // determine the total
      console.log("total is ", total);

      // create a product
      const product = await stripe.products.create({
        name: takeoffName + " Estimate",
       // unit_amount: takeoff.total,
      });
     
      let total_in_cents = Math.floor(total*100);
      let total_with_tax = total_in_cents + Math.floor(total*0.03*100);
      const price = await stripe.prices.create({
        unit_amount:total_with_tax,
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
        return_url: creds.domain + `/return.html?session_id={CHECKOUT_SESSION_ID}`,
      });

      res.send({ clientSecret: session.client_secret});
    }
  });
});

app.get('/session-status', async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

  res.send({
    status: session.status,
    customer_email: session.customer_details.email
  });
});

app.post("/viewPaymentHistory", mid.isAuth, function (req, res) {
  const takeoff_id = req.body.takeoff_id;
  console.log("viewing payment history");
  res.render("viewPaymentHistory.html", { takeoff_id: takeoff_id });
});

app.post("/retrievePaymentHistory", mid.isAuth, function (req, res) {
  console.log("retrieving payment history");
  db.getPaymentHistory(req.body.takeoff_id, function (err, payments) {
    if (err) {
      console.log(err);
    }
    res.send(payments);
  });
});




app.post('/invoiceCreator', mid.isAuth, function (req, res) {
  console.log("creating invoice for", req.body);  

  db.getTakeoffById(req.body.takeoff_id, function (err, takeoff) {
    console.log(takeoff);
    // is the estimate not signed?
    if (takeoff[0].status != 4) {
      console.log("estimate not signed");
      res.send("estimate not signed");
    } else {
      res.render("createInvoice.html", { takeoff_id: req.body.takeoff_id, invoice_email: req.body.invoice_email, takeoff: takeoff });
    }
  });
});

app.post('/create-invoice', mid.isAuth, function (req, res) {
  const takeoff_id = req.body.takeoff_id;
  const customerName = req.body.customer_name;
  const email = req.body.email;
  const invoiceDate = req.body.invoice_date;// the date the invoice is to be sent
  const paymentAmount = req.body.payment_amount;
  const customAmount = req.body.custom_amount;
  const amountToInvoice = customAmount ? customAmount : paymentAmount;
  
  console.log("generating invoice for", req.body);

  // print them all in an english sentence
  console.log("Customer " + customerName + " with email " + email + " will be invoiced on " + invoiceDate + " for " + paymentAmount + " with an amount of " + amountToInvoice);
  db.generateInvoice(req.body.takeoff_id, function (err, takeoff, estimate, options, payments) {
    if (err) {
      console.log(err);
      res.send("error generating invoice");
    } else {
      res.send({ takeoff: takeoff, estimate: estimate, options: options, payments: payments });
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
      },
      defaults: {
        sysName: sys.SYSTEM_NAME,
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
