
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
        console.log(`First header: ${headersInOrder}`);
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


// GET requests
module.exports = function (app) {
  // GET requests
  app.get('/', mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    db.summaryAllTakeoffs(function (err, takeoffs) {
      if (err) {
        console.log(err);
      } else {
        render.takeoffs = takeoffs;
        res.render("main.html", render);
      }
    
    });

  });

    app.get('/addTakeoff', mid.isAuth, (req, res) => {
      var render = defaultRender(req);
      // db
      res.render("addTakeoff.html",render);


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
    console.log("editing", req.body.takeoff_id);

    db.getTakeoff(req.body.takeoff_id, function (err, takeoff, materials) {
      db.getAllMaterials(function (err, allMaterials) {

        if (err) {
          console.log(err);
        } else {
          res.render("editTakeoff.html", {takeoff: takeoff, subjects:materials, materials:allMaterials, takeoff_id: req.body.takeoff_id});
        }

      });
    });
  });

  app.post("/toggle-material", mid.isAuth, function (req, res) {
    console.log("toggling ", req.body);
    db.toggleMaterial(req.body.material_id, req.body.applied, function (err) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    });
  });


//add-material-subject POST

app.post("/add-material-subject", mid.isAuth, function (req, res) {
  console.log("adding material subject ", req.body);
  db.addMaterialSubject(req.body.material_id, req.body.subject_id, function (err) {
    if (err) {
      console.log(err);
    }
  });
});

}

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
        message: "Welcome,  " + req.user.name.givenName + "!"
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

