const creds   = require('./credentials.js');
const sys     = require('./settings.js');
const mysql   = require('mysql');
const moment = require('moment');
const date = require('date-and-time') 
moment().format();

// Levenshtein distance
const levenshtein = require('fast-levenshtein');


// establish database connection
const con = mysql.createPool({
  host: '127.0.0.1',
  user: creds.MYSQL_USERNAME,
  password: creds.MYSQL_PASSWORD,
  database: sys.DB_NAME,
  multipleStatements: true
});




module.exports = {
  connection: con,

  lookUpUser: (email, cb) => {
    // retrieve user information associated with this email
    con.query('SELECT * FROM users WHERE email = ?;', [email], (err, rows) => {
      if (!err && rows !== undefined && rows.length > 0) {
        // callback on retrieved profile
        cb(err, rows[0]);
      } else {
        cb(err || "Failed to find a user with the given email.");
      }
    });
  },

  /*  Add a new system user account, given the user's Google info.
      Callback on profile of created user. */
  addUserFromGoogle: (user, cb) => {

    // make insert and retrieve inserted profile data (assumes default role is 1)
    con.query('INSERT INTO users (email, name, user_type) VALUES (?, ?, 1); SELECT * FROM users WHERE uid = LAST_INSERT_ID();', [user._json.email, user._json.name], (err, rows) => {
      if (!err && rows !== undefined && rows.length > 1 && rows[1].length > 0) {
        // callback on generated profile
        cb(err, rows[1][0]);
      } else {
        cb(err || "Failed to add a new user from Google account.");
      }
    });
  },

  summaryAllTakeoffs: function (callback) {
    con.query('SELECT * FROM takeoffs;', function (err, takeoffs) {
      if (err) return callback(err);
      callback(null, takeoffs);
    });
  },


  // loads results with is an array with the headers into the table subjects in the database

  loadTakeoffData: function (takeoff_id, results, headers, cb){

      
 [
  'Take out of walls',
  'A-201 - EXTERIOR ELEVATIONS',
  '9/13/2024 8:37',
  '',
  '#80FFFF',
  '59.76',
  `ft' in"`,
  '223.2',
  'sf',
  '507.96',
  'sf',
  '8.5',
  `ft' in"`,
  '0',
  '223.2',
  'sf'
]

    for (var i = 1; i < results.length; i++) {
 
      // format all values in the row and set blank values to zero
      for (var j = 0; j < results[i].length; j++) {
        if (results[i][j] === undefined || results[i][j] === null || results[i][j] === '') {
          results[i][j] = 0;
        } else {
          results[i][j] = results[i][j].trim();
        }
      }

      results[i][2] = moment(results[i][2]).format('YYYY-MM-DD HH:mm:ss');


      console.log(results[i]);
      console.log("subject: ", results[i][0]);
      console.log("page_label: ", results[i][1]);
      console.log("date: " ,results[i][2]);
      console.log("layer: ", results[i][3]);
      console.log("color: " ,results[i][4]);
      console.log("length: " ,results[i][5]);
      console.log("length_unit: ", results[i][6]);
      console.log("area: ",  results[i][7]);
      console.log("area_unit: " ,results[i][8]);
      console.log("wall_area: " ,parseFloat(results[i][9]));
      console.log("wall_area_unit: " ,results[i][10]);
      console.log("depth: " ,results[i][11]);
      console.log("depth_unit: " ,results[i][12]);
      console.log("count: " ,results[i][13]);
      console.log("measurement: " ,results[i][14]);
      console.log("measurement_unit: " ,results[i][15]);

      var measurement = results[i][14];

      if (parseFloat(results[i][9]) !== 0) {
        measurement = parseFloat(results[i][9]);
      } 
      //console.log("measurement: ", measurement);


// id INT NOT NULL AUTO_INCREMENT,
//   takeoff_id INT,
//   material_id INT,
//   subject VARCHAR(64),
//   page_label VARCHAR(64),
//   layer VARCHAR(64),
//   color VARCHAR(64),
//   measurement DECIMAL(10,2),
//   measurement_unit VARCHAR(64), 



      con.query('INSERT INTO subjects (takeoff_id, subject, page_label, layer, color, measurement, measurement_unit) VALUES (?,?,?,?,?,?,?);', 
        [takeoff_id, results[i][0], results[i][1],  results[i][3], results[i][4], parseFloat(measurement), results[i][15]], function (err) {
        if (err) {
          console.log(err);
          //return cb(err);
        }
      });
      
      }
      //console.log("values", values);


  },




  createNewTakeoff: function (req, res, cb) {
    con.query('INSERT INTO takeoffs (creator_id, name) VALUES (?, ?); SELECT LAST_INSERT_ID() as last;', [req.user.local.id, req.body.takeoffName], function (err, result) {
      if (err) {
        return cb(err);
      }
      console.log("created takeoff", result[1][0].last);
      cb(null, result[1][0].last);
    });
  },

  getTakeoff: function (takeoff_id, callback) {
    con.query('SELECT * FROM takeoffs WHERE id = ?;', [takeoff_id], function (err, takeoff_info) {
      if (err) return callback(err);
          con.query('SELECT applied_materials.id as id, applied_materials.material_id as material_id, applied_materials.applied as applied, applied_materials.name AS material_name, applied_materials.secondary_material_id as secondary_material_id, applied_materials.tertiary_material_id as tertiary_material_id, applied_materials.quartary_material_id as quartary_material_id, applied_materials.primary_cost_delta AS primary_cost_delta, applied_materials.secondary_cost_delta as secondary_cost_delta, applied_materials.tertiary_cost_delta as tertiary_cost_delta, applied_materials.quartary_cost_delta as quartary_cost_delta,  measurement as measurement, measurement_unit as measurement_unit FROM applied_materials LEFT JOIN materials ON applied_materials.material_id = materials.id WHERE applied_materials.takeoff_id = ?;', [takeoff_id], function (err, rows) {
            if (err){
              callback(err);
              } else {
              for (var i = 0; i < rows.length; i++) {
                if (rows[i] != undefined && rows[i].length > 0) {
           
                // check the primary material_id
                if (rows[i].material_id){
                  // get the name and set field material_name in row
                  con.query('SELECT * FROM materials WHERE id = ?;', [rows[i].material_id], function (err, material) {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log(material[0].name);
                      rows[i].primary_material = material[0].name;
                      rows[i].primary_material_cost = material[0].cost;
                    }
                  });
                }

                // check secondary material
                if (rows[i].secondary_material_id){
                  // get the name and set field secondary_material_name in row
                  con.query('SELECT * FROM materials WHERE id = ?;', [rows[i].secondary_material_id], function (err, secondary_material) {
                    if (err) {
                      console.log(err);
                    } else {
                      rows[i].secondary_material_name = secondary_material[0].name;
                      rows[i].secondary_material_cost = secondary_material[0].cost;
                    }
                  });
                } 

                // check tertiary material

                if (rows[i].tertiary_material_id){
                  // get the name and set field tertiary_material_name in row
                  con.query('SELECT * FROM materials WHERE id = ?;', [rows[i].tertiary_material_id], function (err, tertiary_material) {
                    if (err) {
                      console.log(err);
                    } else {
                      rows[i].tertiary_material_name = tertiary_material[0].name;
                      rows[i].tertiary_material_cost = tertiary_material[0].cost;
                    }
                  });
                }

                // check quartary material

                if (rows[i].quartary_material_id){
                  // get the name and set field quartary_material_name in row
                  con.query('SELECT * FROM materials WHERE id = ?;', [rows.quartary_material_id], function (err, quartary_material) {
                    if (err) {
                      console.log(err);
                    } else {
                      rows[i].quartary_material_name = quartary_material[0].name;
                      rows[i].quartary_material_cost = quartary_material[0].cost;
                    }
                  });
                }
                  //update the rows
                }
                
              }
              
              callback(null, takeoff_info, rows);

              console.log(err);
            } 
          });
    });
  },

  generateTakeoffMaterials: function (takeoff_id, callback) {
      // kill me
    con.query('SELECT subject, SUM(measurement), MAX(measurement_unit), MAX(color) FROM subjects WHERE takeoff_id = ? GROUP BY subject;', [takeoff_id], function (err, subjects) { 
      if (err) return callback(err);
      console.log(subjects);
      for (var i = 0; i < subjects.length; i++) {
        // insert into applied_materials
        con.query('INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit) VALUES (?,?,?,?);', [takeoff_id, subjects[i].subject, subjects[i]['SUM(measurement)'],subjects[i]['MAX(measurement_unit)']], function (err) {
          if (err) {
            console.log(err);
          }
        });
      }

    });
  },


  toggleMaterial: function (applied_material_id, applied, callback) {
    con.query('UPDATE applied_materials set applied = ? WHERE id = ?;', [parseInt(applied), parseInt(applied_material_id)], function (err) {
      if (err) return callback(err);
      callback(null);

    });
  },

  addMaterialSubject: function (material_id, subject_id, callback){
    // first select from applied_materials and check if the primary or secondary id is null;

    con.query("SELECT * from applied_materials WHERE id = ?;", [subject_id], function (err, material) {
      if (err) {
        console.log(err);
      } else {
        if (material[0].material_id == null) {

          console.log("updating primary material");
          con.query("UPDATE applied_materials SET material_id = ? WHERE id = ?;", [material_id, subject_id], function (err) {
            if (err) {
              console.log(err);
            }
            callback(err);

           
          });
        } else if (material[0].secondary_id == null) {
          console.log("updating secondary material");
          con.query("UPDATE applied_materials SET secondary_material_id = ? WHERE id = ?;", [material_id, subject_id], function (err) {
            if (err) {
              console.log(err);
            }
            callback(err);
          });
        } else if (material[0].tertiary_material_id ==  null){
          console.log("updating tertiary material");
          con.query("UPDATE applied_materials SET tertiary_material_id = ? WHERE id = ?;", [material_id, subject_id], function (err) {
            if (err) {
              console.log(err);
            }                        
            callback(err);

          });
        } else {
          console.log("all material slots are filled");
        }
      }
    });
  },

  getAllMaterials: function (callback) {
    con.query('SELECT * FROM materials;', function (err, materials) {
      if (err) return callback(err);
      callback(null, materials);
    });
  },
  sumSFMaterial: function (material_id, takeoff_id, callback) {
    con.query('SELECT subject, SUM(measurement) FROM subjects WHERE takeoff_id = ? GROUP BY subject;', [takeoff_id], function (err, subjects) {
      if (err) return callback(err);
      console.log(subjects)
      callback(null, subjects);
    });
  },

  query: function (sql, args, callback) {
    con.query(sql, args, function (err, results) {
      if (err) return callback(err);
      callback(results);
    });
  },

	
}
