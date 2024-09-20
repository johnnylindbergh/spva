
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
const { parse } = require("csv-parse");
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

  db.createNewTakeoff(req, res, function (err, takeoff_id) {
    console.log("takeoff id is ", takeoff_id);
    fs.createReadStream(filename)
      
      .pipe(parse({ delimiter: ",", from_line: 2 }))
      
      .on("data", function (row) {
        db.loadRevuData(row, takeoff_id, function (err) {
          if (err) {
            //console.log(err);
          } 
        });
      })
      .on("end", function () {
        console.log("csv parsed");
        cb(null);
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
    res.render("main.html", render);


  });

    app.get('/addTakeoff', mid.isAuth, (req, res) => {
      var render = defaultRender(req);
      // db
      res.render("addTakeoff.html",render);


  });



    // Route for handling file uploads
  app.post("/uploadTakeoff", mid.isAuth, function (req, res, next) {
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
                  console.log("takeoff read. time to generate estimate for creator id :", req.body.takeoff_id);
                  res.redirect("/editTakeoff/"+req.body.takeoff_id);
                }
              });

            } else {
              console.log("no file uploaded");
              res.send("no file uploaded");
            }
            
        }
    });
  });

  app.get("/editTakeoff/:id-takeoff", mid.isAuth, function (req, res) {
    res.send("works");
    // db.getTakeoff(req.params.id, function (err, results) {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     res.render("editTakeoff.html", { takeoff: results[0] });
    //   }
    // });
  });

  // Get all users
  app.get('/demo', mid.isAuth, (req, res) => {
    
  });

  // Get user by ID
  app.get('/users/:id', mid.isAuth, (req, res) => {
    const userId = req.params.id;
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results[0]);
    });
  });

  // Get all take-offs
  app.get('/takeoffs', mid.isAuth, (req, res) => {
    db.query('SELECT * FROM take_off', (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  });

  // Get take-off by ID
  app.get('/takeoffs/:id', mid.isAuth, (req, res) => {
    const takeoffId = req.params.id;
    db.query('SELECT * FROM take_off WHERE id = ?', [takeoffId], (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results[0]);
    });
  });

  // Get all estimates
  app.get('/estimates', mid.isAuth, (req, res) => {
    db.query('SELECT * FROM estimates', (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  });

  // Get estimate by ID
  app.get('/estimates/:id', mid.isAuth, (req, res) => {
    const estimateId = req.params.id;
    db.query('SELECT * FROM estimates WHERE id = ?', [estimateId], (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results[0]);
    });
  });

  // POST requests
  // Create a new user
  app.post('/users', mid.isAuth, (req, res) => {
    const { user_type, name, email, phone_number, public_key, authentication_token } = req.body;
    const query = 'INSERT INTO users (user_type, name, email, phone_number, public_key, authentication_token) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [user_type, name, email, phone_number, public_key, authentication_token], (err, results) => {
      if (err) return res.status(500).send(err);
      res.status(201).json({ id: results.insertId });
    });
  });

  // Create a new take-off
  app.post('/takeoffs', mid.isAuth, (req, res) => {
    const { name, owner, owner_billing_address, file_path_of_plans } = req.body;
    const query = 'INSERT INTO take_off (name, owner, owner_billing_address, file_path_of_plans) VALUES (?, ?, ?, ?)';
    db.query(query, [name, owner, owner_billing_address, file_path_of_plans], (err, results) => {
      if (err) return res.status(500).send(err);
      res.status(201).json({ id: results.insertId });
    });
  });

  // Create a new estimate
  app.post('/estimates', mid.isAuth, (req, res) => {
    const { takeoff_id, total_cost, labor_cost, materials_cost, duration_days } = req.body;
    const query = 'INSERT INTO estimates (takeoff_id, total_cost, labor_cost, materials_cost, duration_days) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [takeoff_id, total_cost, labor_cost, materials_cost, duration_days], (err, results) => {
      if (err) return res.status(500).send(err);
      res.status(201).json({ id: results.insertId });
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

