
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
const db = require('./database.js');
const sys = require('./settings.js');
const mid = require('./middleware.js');
const moment = require('moment');
const path = require("path");
const multer = require("multer");

const fs = require("fs");
const {parse} = require("csv-parse");

var fileCounter = Math.floor(1000 + Math.random() * 9000);

// file upload stuff 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, "/var/www/spvaTrack/uploads"); 
  },
  filename: function (req, file, cb) {
      cb(null, file.fieldname + "" + (fileCounter) + ".csv");  
  }
});

// Define maximum upload file size (32 MB) it's just a csv
const maxSize = 1 * 1000 * 1000* 32;

// Configure Multer
const upload = multer({
  storage: storage,                              
  limits: { fileSize: maxSize },                
  fileFilter: function (req, file, cb) {        
      const filetypes = /csv/;       
      const mimetype = filetypes.test(file.mimetype); 
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase()); 

      if (mimetype && extname && file.originalname) {
          return cb(null, true);                 
      }

      cb("Error: File upload only supports the following filetypes - " + filetypes);
  }
}).single("takeoff"); 


// csv parsing stuff

function readTakeoff(req, res, filename, cb) {


  console.log("parsing ", filename);
  var results = [];
  var headers = [];

  db.createNewTakeoff(req, res, function (err, takeoff_id) {
    console.log("takeoff id is ", takeoff_id);
    fs.createReadStream(filename)
      
      .pipe(parse({delimiter: ','}))
      .on("headers", (headersInOrder)=> {
       // console.log(`First header: ${headersInOrder}`);
        headers = headersInOrder;
        //convert to snake case
        headers = headers.map(function (header) {
          return header.replace(/\s+/g, '_').toLowerCase();

        });

        // replace second space if it exists
        headers = headers.map(function (header) {
          return header.replace(/\s+/g, '_');
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
        
         db.loadTakeoffData(takeoff_id, results, headers, function(err){
           if (err) {
             cb(err);
           } else {
             console.log("takeoff loaded");
             db.takeoffSetStatus(takeoff_id, status, function (err) {
              
            });
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
      cb(error)
    });
  });
}


// main page stuff
module.exports = function (app) {
  // GET requests
  app.get('/', mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    db.summaryAllTakeoffs(function (err, takeoffs) {
      if (err) {
        console.log(err);
      } else {
        render.takeoffs = takeoffs;
        console.log("User: "+ req.user.local.name);
        res.render("main.html", render);
      }
    
    });

  });

    app.get('/addTakeoff', mid.isAuth, (req, res) => {
      var render = defaultRender(req);
      // db
      res.render("addTakeoff.html",render);


  });


  app.get('/getTakeoffs', mid.isAuth, (req, res) => {
    db.getTakeoffs(function (err, takeoffs) {
      if (err) {
        console.log(err);
      } else {
        res.send(takeoffs);
      }
    });
  });

  // post request to https://estimate.sunpaintingva.com/viewTakeoff with body param takeoff_id


  app.post("/viewTakeoff", mid.isAuth, function (req, res) {
    console.log("viewing", req.body.takeoff_id);

    db.generateEstimate(req.body.takeoff_id, function (err) {
      if (err) {
        console.log(err);
      } else {
        res.render("estimateView.html", defaultRender(req));
      }
    });

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
            if (req.file){
              console.log("about to read " ,req.file.filename);
              req.body.takeoff_id
              readTakeoff(req, res, "/var/www/spvaTrack/uploads/"+req.file.filename, function(err){
                if (err) {
                  console.log(err);
                } else {
                  console.log("takeoff read. time to generate estimate for takeoff_id :", req.body.takeoff_id);
                  res.redirect("/");
                }
              });

            } else {
              console.log("no file uploaded");
              res.send("no file uploaded");
            }
            
        }
    });
  });

  app.post("/editTakeoff", mid.isAuth, function (req, res) {
   // console.log("editing", req.body.takeoff_id);

    db.getTakeoff(req.body.takeoff_id, function (err, takeoff, materials) {
      if (err) {console.log(err)}
      db.getAllMaterials(function (err, allMaterials) {

        if (err) {
          console.log(err);
        } else {
          res.render("editTakeoff.html", {takeoff: takeoff, subjects:materials, materials:allMaterials, takeoff_id: req.body.takeoff_id});
        }

      });
    });
  });

  app.post("/loadTakeoffMaterials", mid.isAuth, function (req, res) {
  //console.log("editing", req.body.takeoff_id);

  db.getTakeoff(req.body.takeoff_id, function (err, takeoff, materials) {
    if (err) {console.log(err)}
      //console.log(materials);
    db.getAllMaterials(function (err, allMaterials) {

      if (err) {
        console.log(err);
      } else {
        res.send({takeoff: takeoff, subjects:materials, materials:allMaterials, takeoff_id: req.body.takeoff_id});
      }

    });
  });
});

  app.post("/generateEstimate", function (req, res) {
    var takeoff_id = req.body.takeoff_id;
    console.log("generating estimate for ", takeoff_id);
    // do some computation and redirect to /viewEstimate/:id
    // must do user validation here because outside users must access this page
    // ie if not authed, direct to enter passcode page
    // must add passcode to takeoffs table
    // the enter pascode page will be a simple form with a hidden field for takeoff_id
    // when the user enter the correct passcode, the page will render the estimate with the abiliy to sign the document, 
    // all accesses by client must be tracked

    db.generateEstimate(takeoff_id, function (err, estimate) {
      if (err) {
        console.log(err);
      } else {
        console.log('comput estimate here');
        console.log(estimate);
        //res.redirect("/viewEstimate/"+estimate.id);
        res.render("viewEstimate.html", {estimate: estimate});
      }
    });
  });


  app.get("/viewEstimate/:id"), mid.isAuth, function (req, res) {
    console.log("estimate view")
    db.getEstimate(req.params.id, function (err, estimate) {
      if (err) {
        console.log(err);
      } else {
        console.log(estimate);
        res.render("viewEstimate.html", {estimate: estimate});
      }
    });
  }



  app.post("/toggle-material", mid.isAuth, function (req, res) {
    console.log("toggling ", req.body.material_id);
    db.toggleMaterial(req.body.material_id, function (err) {
      if (err) {
        console.log(err);
      } else {
       res.end();
      }
    });
  });


//add-material-subject POST

app.post("/add-material-subject", mid.isAuth, function (req, res) {
  console.log("adding material subject ", req.body);
  db.addMaterialSubject(req.body.material_id, req.body.subject_id, function (err) {
    if (err) {
      console.log(err);
    } else {
      res.end();
    }
  });
});

app.post("/remove-material-subject", mid.isAuth, function (req, res) {
  console.log("remove-material-subject ", req.body.material_id);
  if (req.body.subject_id && req.body.material_id) {
    db.removeMaterialSubject(req.body.material_id, req.body.subject_id, function (err) {
      if (err) {
        console.log(err);
      } else {
        res.end();
      }
    });
  }
});



// material settings page

app.get("/materialSettings", mid.isAuth, function (req, res) {
  res.render("materialSettings.html", defaultRender(req));

});

app.post("/change-material-price", mid.isAuth, function (req, res) {
  console.log("changing material price ", req.body);
  db.changeMaterialPrice(req.body.material_id, req.body.new_price, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("updated");
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


// ending perentheses do not delete
};

function arrayToCSV(objArray) {
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
  let str = `${Object.keys(array[0]).map(value => `"${value}"`).join(",")}` + '\r\n';

  return array.reduce((str, next) => {
    str += `${Object.values(next).map(value => `"${value}"`).join(",")}` + '\r\n';
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
        message: "Hello,  " + req.user.name.givenName + "!"
      },
      defaults: {
        sysName: sys.SYSTEM_NAME
      }
    };
  } else {
    // default welcome message for unauthenticated user
    return {
      inDevMode: sys.inDevMode,
      auth: {
        message: "Welcome! Please log in."
      }
    };
  }
}

