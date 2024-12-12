const creds = require("./credentials.js");
const sys = require("./settings.js");
const mysql = require("mysql2");
const moment = require("moment");
const date = require("date-and-time");
moment().format();

const queries = require("./queries.js");

// Levenshtein distance
const levenshtein = require("fast-levenshtein");
const crypto = require("crypto");
const e = require("express");

// establish database connection
const con = mysql.createPool({
  host: "127.0.0.1",
  user: creds.MYSQL_USERNAME,
  password: creds.MYSQL_PASSWORD,
  database: sys.DB_NAME,
  multipleStatements: true,
});

function generatePasscode() {
  return crypto
    .randomBytes(12)
    .toString("base64")
    .replace(/\+/g, "0")
    .replace(/\//g, "0")
    .slice(0, 16);
}

// unused function
function getFrequentMaterials(subject, callback) {
  con.query('SELECT material_id, COUNT(*) as count FROM applied_materials WHERE name = ? GROUP BY material_id ORDER BY count DESC LIMIT 1;', [subject], function(err, materials){
    if (err) {
      console.log(err);
      return callback(err);
    }
    // do the same for the secondary material_id
    con.query('SELECT secondary_material_id, COUNT(*) as count FROM applied_materials WHERE name = ? GROUP BY secondary_material_id ORDER BY count DESC LIMIT 1;', [subject], function(err, secondaryMaterials){
      if (err) {
        console.log(err);
        return callback(err);
      }
      // do the same for the tertiary material_id
      con.query('SELECT tertiary_material_id, COUNT(*) as count FROM applied_materials WHERE name = ? GROUP BY tertiary_material_id ORDER BY count DESC LIMIT 1;', [subject], function(err, tertiaryMaterials){
        if (err) {
          console.log(err);
          return callback(err);
        }
        // return the most frequent materials
        callback(null, [materials[0], secondaryMaterials[0], tertiaryMaterials[0]]);
      });
    });
  });
}

module.exports = {
  connection: con,

  lookUpUser: (email, cb) => {
    // retrieve user information associated with this email
    con.query("SELECT * FROM users WHERE email = ?;", [email], (err, rows) => {
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
    con.query(
      "INSERT INTO users (email, name, user_type) VALUES (?, ?, 1); SELECT * FROM users WHERE uid = LAST_INSERT_ID();",
      [user._json.email, user._json.name],
      (err, rows) => {
        if (
          !err &&
          rows !== undefined &&
          rows.length > 1 &&
          rows[1].length > 0
        ) {
          // callback on generated profile
          cb(err, rows[1][0]);
        } else {
          cb(err || "Failed to add a new user from Google account.");
        }
      }
    );
  },

  summaryAllTakeoffs: function (callback) {
    con.query("SELECT * FROM takeoffs;", function (err, takeoffs) {
      if (err) return callback(err);
      callback(null, takeoffs);
    });
  },

  // loads results with is an array with the headers into the table subjects in the database

  loadTakeoffData: function (takeoff_id, results, headers, cb) {
    [
      "Take out of walls",
      "A-201 - EXTERIOR ELEVATIONS",
      "9/13/2024 8:37",
      "",
      "#80FFFF",
      "59.76",
      `ft' in"`,
      "223.2",
      "sf",
      "507.96",
      "sf",
      "8.5",
      `ft' in"`,
      "0",
      "223.2",
      "sf",
    ];

    for (var i = 1; i < results.length; i++) {
      // format all values in the row and set blank values to zero
      for (var j = 0; j < results[i].length; j++) {
        if (
          results[i][j] === undefined ||
          results[i][j] === null ||
          results[i][j] === ""
        ) {
          results[i][j] = 0;
        } else {
          results[i][j] = results[i][j].trim();
        }
      }

      results[i][2] = moment(results[i][2]).format("YYYY-MM-DD HH:mm:ss");

      // console.log(results[i]);
      // console.log("subject: ", results[i][0]);
      // console.log("page_label: ", results[i][1]);
      // console.log("date: " ,results[i][2]);
      // console.log("layer: ", results[i][3]);
      // console.log("color: " ,results[i][4]);
      // console.log("length: " ,results[i][5]);
      // console.log("length_unit: ", results[i][6]);
      // console.log("area: ",  results[i][7]);
      // console.log("area_unit: " ,results[i][8]);
      // console.log("wall_area: " ,parseFloat(results[i][9]));
      // console.log("wall_area_unit: " ,results[i][10]);
      // console.log("depth: " ,results[i][11]);
      // console.log("depth_unit: " ,results[i][12]);
      // console.log("count: " ,results[i][13]);
      // console.log("measurement: " ,results[i][14]);
      // console.log("measurement_unit: " ,results[i][15]);

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

      con.query(
        "INSERT INTO subjects (takeoff_id, subject, page_label, layer, color, measurement, measurement_unit) VALUES (?,?,?,?,?,?,?);",
        [
          takeoff_id,
          results[i][0],
          results[i][1],
          results[i][3],
          results[i][4],
          parseFloat(measurement),
          results[i][15],
        ],
        function (err) {
          if (err) {
            console.log(err);
            //return cb(err);
          }
        }
      );
    }
    //console.log("values", values);
  },

  createNewTakeoff: function (req, res, cb) {
    con.query(
      "INSERT INTO takeoffs (creator_id, name, passcode) VALUES (?, ?, ?); SELECT LAST_INSERT_ID() as last;",
      [req.user.local.id, req.body.takeoffName, generatePasscode().toString()],
      function (err, result) {
        if (err) {
          return cb(err);
        }
        console.log("created takeoff", result[1][0].last);
        cb(null, result[1][0].last);
      }
    );
  },
  updateTakeoffName: function (takeoff_id, name, callback) {
    if (!takeoff_id || !name) {
      return callback("Missing required parameters");
    } else {
      con.query(
        "UPDATE takeoffs SET name = ? WHERE id = ?;",
        [name, takeoff_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
  },

  updateTakeoffOwnerName: function (takeoff_id, owner_name, callback) {
    if (!takeoff_id || !owner_name) {
      return callback("Missing required parameters");
    } else {
      con.query(
        "UPDATE takeoffs SET owner = ? WHERE id = ?;",
        [owner_name, takeoff_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
  },

  updateTakeoffOwnerBilling: function (
    takeoff_id,
    owner_billing_address,
    callback
  ) {
    if (!takeoff_id || !owner_billing_address) {
      return callback("Missing required parameters");
    } else {
      con.query(
        "UPDATE takeoffs SET owner_billing_address = ? WHERE id = ?;",
        [owner_billing_address, takeoff_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
  },

  getTakeoff: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, takeoff_info) {
        if (err) return callback(err);

        con.query(queries.getTakeoff, [takeoff_id], async function (err, rows) {
          if (err) return callback(err);

          // Create an array of promises to fetch material names
          const promises = rows.map((row) => {
            if (row && row.material_id) {
              return new Promise((resolve, reject) => {
                con.query(
                  "SELECT * FROM materials WHERE id IN (?, ?, ?);",
                  [
                    row.material_id,
                    row.secondary_material_id,
                    row.tertiary_material_id,
                  ],
                  function (err, materials) {
                    if (err) return reject(err);

                    // Add material names to the row
                    row.selected_materials = materials; // You can customize how you want to store the materials info
                    resolve(row);
                  }
                );
              });
            } else {
              return Promise.resolve(row); // If no material_id, just resolve the row as is
            }
          });

          try {
            const updatedRows = await Promise.all(promises);
            // Once all material info has been fetched, pass the updated rows to the callback
            //console.log(updatedRows);
            callback(null, takeoff_info, updatedRows);
          } catch (queryErr) {
            callback(queryErr);
          }
        });
      }
    );
  },

  updateTakeoffTotal: function (takeoff_id, total, callback) {
    con.query(
      "UPDATE takeoffs SET total = ? WHERE id = ?;",
      [total, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  getAllSystemSettings: function (callback) {
    con.query("SELECT * FROM system_settings;", function (err, settings) {
      if (err) return callback(err);
      callback(null, settings);
    });
  },

  updateSystemSetting: function (setting_id, value, callback) {
    con.query(
      "UPDATE system_settings SET setting_value = ? WHERE setting_id = ?;",
      [value, setting_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );  
  },
  // used for code reference
  getSystemSettingByName: function (setting_name, callback) {
    con.query(
      "SELECT * FROM system_settings WHERE setting_name = ?;",
      [setting_name],
      function (err, settings) {
        if (err) return callback(err);
        callback(null, settings);
      }
    );
  },


  getPaymentHistory: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM payment_history WHERE takeoff_id = ?;",
      [takeoff_id],
      function (err, payments) {
        if (err) return callback(err);
        console.log(payments);
        callback(null, payments);
      }
    );
  },
   // used for code reference
   getSystemSettingById: function (setting_id, callback) {
    con.query(
      "SELECT * FROM system_settings WHERE setting_id = ?;",
      [setting_name],
      function (err, settings) {
        if (err) return callback(err);
        callback(null, settings);
      }
    );
  },

generateEstimate: async function (takeoff_id, callback) {
  try {
    const [estimateRows] = await con.promise().query(
      "SELECT estimate_id FROM takeoffs WHERE id = ?;",
      [takeoff_id]
    );

    const estimateId = estimateRows[0]?.estimate_id;
    console.log("databse saw an estimate id of: ", estimateId);

    if (!estimateId) {
      const [insertResult] = await con.promise().query(
        "INSERT INTO estimate (takeoff_id) VALUES (?);",
        [takeoff_id]
      );

      const lastInsertId = insertResult.insertId;

      await con.promise().query(
        "UPDATE takeoffs SET estimate_id = ? WHERE id = ?;",
        [lastInsertId, takeoff_id]
      );
    }

    const [takeoffInfo] = await con.promise().query(
      "SELECT * FROM takeoffs WHERE id = ?;",
      [takeoff_id]
    );

    const [rows] = await con.promise().query(queries.getTakeoff, [takeoff_id]);

    const updatedRows = await Promise.all(
      rows.map(async (row) => {
        if (row.material_id) {
          const [materials] = await con
            .promise()
            .query(
              "SELECT * FROM materials WHERE id IN (?, ?, ?);",
              [
                row.material_id,
                row.secondary_material_id,
                row.tertiary_material_id,
              ]
            );
          row.selected_materials = materials;
        }
        return row;
      })
    );

    callback(null, takeoffInfo, updatedRows);
  } catch (err) {
    callback(err);
  }
},


  updateContent: function (id, inclusions, exclusions, callback) {
    // if (inclusions == null) {
    //   inclusions = "";
    // }
    // if (exclusions == null) {
    //   exclusions = "";
    // }
    // console.log("inclusions: ", inclusions);
    // console.log("exclusions: ", exclusions);

    con.query(
      "UPDATE estimate SET inclusions = ?, exclusions = ? WHERE id = ?;",
      [inclusions, exclusions, id],
      function (err) {
        if (err){
          console.log(err);
          return callback(err);
        }
        callback(null);
      }
    );
  },

  updateTakeoffOwnerEmail: function (takeoff_id, owner_email, callback) {
    if (!takeoff_id || !owner_email) {
      return callback("Missing required parameters");
    } else {
      con.query(
        "UPDATE takeoffs SET owner_email = ? WHERE id = ?;",
        [owner_email, takeoff_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
  },

  updateTakeoffInvoiceEmail: function (takeoff_id, owner_email, callback) {
    if (!takeoff_id || !owner_email) {
      return callback("Missing required parameters");
    } else {
      con.query(
        "UPDATE takeoffs SET invoice_email = ? WHERE id = ?;",
        [owner_email, takeoff_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
  },

  saveEstimate: function (takeoff_id, inclusions, exclusions, callback) {
    //console.log("saving estimate function received: ", inclusions, exclusions, takeoff_id);
    if (takeoff_id == null) {
      // get the last insert id takeoff_id
      con.query("SELECT MAX(id) as last FROM takeoffs;", function (err, last) {
        if (err) {
          console.log("Error getting last takeoff_id: ", err);
          return callback(err);
        } else {
          takeoff_id = last[0].last;
          con.query(
            "INSERT INTO estimate (takeoff_id, inclusions, exclusions) VALUES (?,?,?);",
            [takeoff_id, inclusions, exclusions],
            function (err) {
              if (err) {
                console.log("Error saving estimate: ", err);
                return callback(err);
              }
              callback(null);
            }
          );
        }
      });
    } else {
      // get the estimate_id from the takeoff_id  
      con.query('SELECT estimate_id FROM takeoffs WHERE id = ?;', [takeoff_id], function(err, estimate_id){
        estimate_id = estimate_id[0].estimate_id;
        if (estimate_id == null) {
          console.log("No estimate_id found for takeoff_id: ", takeoff_id);
        }
        
        con.query(
          "UPDATE estimate SET inclusions = COALESCE(inclusions, ?), exclusions = COALESCE(exclusions, ?) WHERE id = ?;",
          [inclusions, exclusions, estimate_id],
          function (err) {
            if (err) {
              console.log("Error updating estimate: ", err);
              return callback(err);
            }
            callback(null);
          }
        );
      });
    }
  },

  getOptions: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM options WHERE takeoff_id = ?;",
      [takeoff_id],
      function (err, options) {
        // also get the takeoff status
        con.query(
          "SELECT status FROM takeoffs WHERE id = ?;",
          [takeoff_id],
          function (err, status) {
            if (err) return callback(err);
            // if the status is 4, the takeoff is signed and the options should be locked
            if (status[0].status == 4) {
              return callback(null, options, false); // the third parameter is a boolean that indicates whether the options are mutable
            } else {
              return callback(null, options, true);
            }
          }
        );
      }
    );
  },

  addOption: function (takeoff_id, option, cost_delta, row_id, callback) {
    // first check if the row_id is null, if it is, insert a new row
    // if it is not, update the existing row
    if (row_id == null) {
      con.query(
        "INSERT INTO options (takeoff_id, description, cost) VALUES (?,?,?); SELECT LAST_INSERT_ID() as last;",
        [takeoff_id, option, cost_delta],
        function (err, results) {
          if (err) return callback(err);
          callback(null, results[1][0].last);
        }
      );
    } else {
      // if row exists but is now blank, delete the row
      if (option == "") {
        con.query(
          "DELETE FROM options WHERE id = ?;",
          [row_id],
          function (err) {
            if (err) return callback(err);
            callback(null);
          }
        );
      } else {
        con.query(
          "UPDATE options SET description = ?, cost = ? WHERE id = ?;",
          [option, cost_delta, row_id],
          function (err) {
            if (err) return callback(err);
            callback(null);
          }
        );
      }
    }
  },

  getMaterialTypes: function (callback) {
    con.query("SELECT * FROM material_archetypes;", function (err, types) {
      if (err) return callback(err);
      callback(null, types);
    });
  },

  addMaterial: function (name, desc, cost, coverage, type, callback) {
    type = parseInt(type);
    if (type == 0 || type == null || isNaN(type)) {
      type = 6; // the default for paint
    }
    con.query(
      "INSERT INTO materials (name, description, cost, coverage, material_type) VALUES (?,?,?,?,?);",
      [name, desc, cost, coverage, type],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },
  // the get request for the viewEstimate page
  getEstimateData: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM estimate WHERE takeoff_id = ?;",
      [takeoff_id],
      function (err, estimate) {
        if (err) return callback(err);

        con.query(
          "SELECT * FROM takeoffs WHERE id = ?;",
          [takeoff_id],
          function (err, takeoff) {
            if (err) return callback(err);

            con.query(
              "SELECT setting_value FROM system_settings WHERE setting_name = 'sales_tax';",
              function (err, salesTax) {
                if (err) return callback(err);
                callback(null, estimate, takeoff, salesTax[0].setting_value);
              }
            );
          }
        );
      }
    );
  },

  getSharedEstimate: function (hash, callback) {
    con.query(
      "SELECT * FROM takeoffs WHERE passcode = ?;",
      [hash],
      function (err, takeoffResults) {
        if (err) return callback(err);
        if (!takeoffResults || takeoffResults.length === 0) {
          console.log("non-existent hash: ", hash);
          return callback(
            new Error("No takeoff found for the provided passcode")
          );
        }

        const takeoff = takeoffResults[0]; // assuming only one result

        console.log("getting shared takeoff:", takeoff);

        con.query(
          "SELECT * FROM estimate WHERE id = ?;",
          [takeoff.estimate_id],
          function (err, estimateResults) {
            if (err) return callback(err);
            const estimate = estimateResults[0]; // assuming only one result

            // Query the options table for the estimate_id
            con.query(
              "SELECT * FROM options WHERE takeoff_id = ?;",
              [takeoff.estimate_id],
              function (err, optionsResults) {
                if (err) return callback(err);
                callback(null, estimate, takeoff, optionsResults);
              }
            );
          }
        );
      }
    );

    // update the view_count for the takeoff
    con.query(
      "UPDATE takeoffs SET view_count = view_count + 1 WHERE passcode = ?;",
      [hash],
      function (err) {
        if (err) {
          console.log(err);
        }
      }
    );
  },

  updateOptionSelection: function (takeoff_id, option_id, selected, callback) {
    if (selected == "true") {
      selected = 1;
    } else {
      selected = 0;
    }
    con.query(
      "UPDATE options SET applied = ? WHERE id = ? AND takeoff_id = ?;",
      [selected, option_id, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  getTakeoffTotal: function (takeoff_id, callback) {
    con.query(
      "SELECT total FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, options_total) {
        con
        if (err) return callback(err);
        callback(null, total[0]["total"]);
      }
    );
  },

  updateSignature: function (takeoff_id, signature, date, callback) {
    // first get the owner_name in takeoffs
    con.query(
      "SELECT owner FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, owner) {
        if (err) return callback(err);
        console.log("comparing  ", owner[0].owner); // there should only be one result
        console.log("to  ", signature);
        // if the levenshtein distance is less than 3, update the takeoff status to 4
        if (
          levenshtein.get(owner[0].owner, signature) < 2 ||
          owner[0].owner == null
        ) {
          // if the owner name is null, allow the signature to be accepted
          con.query(
            "UPDATE takeoffs SET status = 4 WHERE id = ?;",
            [takeoff_id],
            function (err) {
              if (err) return callback(err);
              //callback(true, null);
            }
          );

          // also update the signed_at date
          con.query(
            "UPDATE takeoffs SET signed_at = ? WHERE id = ?;",
            [date, takeoff_id],
            function (err) {
              if (err) return callback(err);
              //callback(true, null);
            }
          );
        } else {
          console.log(
            "signature does not match owner_name or owner_name is null"
          );
          callback(false, null);
        }
      }
    );
  },

  // this function get all the subjects for a takeoff and then adds blank (no materials) applied_materials for each subject

  generateTakeoffMaterials: function (takeoff_id, callback) {
    con.query(
      "SELECT subject, SUM(measurement) AS total_measurement, MAX(measurement_unit) AS measurement_unit, MAX(color) AS color FROM subjects WHERE takeoff_id = ? GROUP BY subject;",
      [takeoff_id],
      function (err, subjects) {
        if (err) return callback(err);
  
        // Get labor_cost setting
        con.query(
          "SELECT setting_value FROM system_settings WHERE setting_name = 'default_labor_cost';",
          function (err, default_labor_cost) {
            if (err) return callback(err);
  
            for (var i = 0; i < subjects.length; i++) {
              // Insert into applied_materials
              let currentSubject = subjects[i].subject;
                con.query(
                "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, labor_cost) VALUES (?, ?, ?, ?, ?);",
                [
                  takeoff_id,
                  subjects[i].subject,
                  subjects[i].total_measurement,
                  subjects[i].measurement_unit,
                  default_labor_cost[0].setting_value
                ],
                function (err) {
                  if (err) {
                  console.log(err);
                  } else {
                  console.log("Matching subject strings.");
                  // First, get the frequency of materials applied to a given subject in the applied_materials table
                  con.query(
                    "SELECT material_id, name, COUNT(*) as count FROM applied_materials WHERE name = ? AND material_id IS NOT NULL GROUP BY material_id ORDER BY count DESC LIMIT 1;",
                    [currentSubject],
                    function (err, materials) {
                    if (err) {
                      console.log(err);
                    }
                    
                    // Assign these materials to the applied_materials table
                    console.log("Frequent materials for " + currentSubject + ":" + materials);
          
                    if (materials != null && materials.length > 0) {
                      //very important to match to takeoff_id or else this query would update all the takeoffs in the table
                      con.query(
                      "UPDATE applied_materials SET material_id = ? WHERE name = ? AND takeoff_id = ?;", 
                      [materials[0].material_id, currentSubject, takeoff_id],
                      function (err) {
                        if (err) {
                        console.log(err);
                        }
                      }
                      );
                    } else {
                      console.log("No predicted materials found");
          
                      // Find the closest match in the materials table using Levenshtein distance
                      con.query("SELECT * FROM materials;", function (err, allMaterials) {
                      if (err) {
                        console.log(err);
                      }
          
                      var minDistance = 100;
                      var min_id = 0;
                      for (var j = 0; j < allMaterials.length; j++) {
                        var distance = levenshtein.get(allMaterials[j].name, currentSubject);
                        if (distance < minDistance) {
                        minDistance = distance;
                        min_id = allMaterials[j].id;
                        }
                      }
          
                      if (minDistance < 3) {
                        con.query(
                        "UPDATE applied_materials SET material_id = ? WHERE subject = ?;",
                        [min_id, subjects[i].subject],
                        function (err) {
                          if (err) {
                          console.log(err);
                          }
                        }
                        );
                      }
                      });
                    }
                    }
                  );
                  }
                }
                );
            }
            callback(null);
          }
        );
      }
    );
  },
  
  removeMaterialSubject: function (material_id, subject_id, callback) {
    // First, get the subject and the applied materials
    con.query(
      "SELECT * FROM applied_materials WHERE id = ?;",
      [subject_id],
      function (err, material) {
        if (err) {
          console.log(err);
          return callback(err); // Ensure the callback is called on error
        }

        if (!material || material.length === 0) {
          console.log("Subject ID not found");
          return callback("Subject ID not found");
        }

        const materialRow = material[0];
        const fields = [
          "material_id",
          "secondary_material_id",
          "tertiary_material_id",
        ];
        let fieldToUpdate = null;

        // Check which material slot matches the material_id
        for (let field of fields) {
          if (materialRow[field] == material_id) {
            fieldToUpdate = field;
            break;
          }
        }

        if (fieldToUpdate) {
          // Construct the SQL query dynamically
          const sql = `UPDATE applied_materials SET ${fieldToUpdate} = NULL WHERE id = ?;`;
          con.query(sql, [subject_id], function (err) {
            if (err) {
              console.log(err);
              return callback(err);
            }
            console.log(
              `${fieldToUpdate} updated to NULL for subject ID ${subject_id}`
            );
            callback(null); // Indicate success
          });
        } else {
          console.log("No material slots match the material ID");
          callback("No material slots match the material ID");
        }
      }
    );
  },

  toggleMaterial: function (applied_material_id, callback) {
    // a call to this function should not accept a toggle state, it should select the current state of the applied_material_id and then toggle it

    con.query(
      "SELECT applied FROM applied_materials WHERE id = ?;",
      [applied_material_id],
      function (err, material) {
        if (err || material.length == 0) {
          console.log(err);
        }
        let applied = !material[0].applied;
        console.log("new state", !material.applied);
        con.query(
          "UPDATE applied_materials SET applied = ? WHERE id = ?;",
          [applied, applied_material_id],
          function (err) {
            if (err) {
              console.log(err);
              return callback(err);
            }
            callback(null);
          }
        );
      }
    );
  },

  separateLineItem: function (applied_material_id, callback) {
    // update the this.separateLineItem value in the applied_materials table
    con.query(
      "SELECT separate_line_item FROM applied_materials WHERE id = ?;",
      [applied_material_id],
      function (err, material) {
        if (err || material.length == 0) {
          console.log(err);
        }
        let separate_line_item = !material[0].separate_line_item;
        console.log("new state", separate_line_item);
        con.query(
          "UPDATE applied_materials SET separate_line_item = ? WHERE id = ?;",
          [separate_line_item, applied_material_id],
          function (err) {
            if (err) {
              console.log(err);
              // finally, set applied to false
              con.query(
                "UPDATE applied_materials SET applied = 0 WHERE id = ?;",
                [applied_material_id],
                function (err) {
                  if (err) {
                    console.log(err);
                    return callback(err);
                  }
                  callback(err);
                }
              );
            }
          }
        );
      }
    );
  },
    

  changeLaborPrice: function (subject, price, callback) {
    con.query(
      "UPDATE applied_materials SET labor_cost = ? WHERE id = ?;",
      [price, subject],
      function (err) {
        if (err) {
          console.log(err);
          return callback(err);
        }
        callback(null);
      }
    );
  },

  changeMaterialPrice: function (material_id, price, callback) {
    // deterine whether the primary material or the secondary material or the teritary material price is being updated
    con.query(
      "SELECT * FROM applied_materials WHERE material_id = ? OR secondary_material_id = ? OR tertiary_material_id = ?;",
      [material_id, material_id, material_id],
      function (err, materials) {
        if (err) {
          console.log(err);
          callback(err);
        }
        //console.log(materials);
        for (var i = 0; i < materials.length; i++) {
          if (materials[i].material_id == material_id) {
            con.query(
              "UPDATE applied_materials SET primary_cost_delta = ? WHERE material_id = ?;",
              [price, material_id],
              function (err) {
                if (err) {
                  console.log(err);
                  callback(err);
                }
              }
            );
          } else if (materials[i].secondary_material_id == material_id) {
            con.query(
              "UPDATE applied_materials SET secondary_cost_delta = ? WHERE secondary_material_id = ?;",
              [price, material_id],
              function (err) {
                if (err) {
                  console.log(err);
                  callback(err);
                }
              }
            );
          } else if (materials[i].tertiary_material_id == material_id) {
            con.query(
              "UPDATE applied_materials SET tertiary_cost_delta = ? WHERE tertiary_material_id = ?;",
              [price, material_id],
              function (err) {
                if (err) {
                  console.log(err);
                  callback(err);
                }
              }
            );
          }
        }
      }
    );
  },

  addMaterialSubject: function (material_id, subject_id, callback) {
    // first select from applied_materials and check if the primary or secondary id is null;

    con.query(
      "SELECT * from applied_materials WHERE id = ?;",
      [subject_id],
      function (err, material) {
        if (err) {
          console.log(err);
        } else {
          if (material[0].material_id == null) {
            console.log("updating primary material");
            con.query(
              "UPDATE applied_materials SET material_id = ? WHERE id = ?;",
              [material_id, subject_id],
              function (err) {
                if (err) {
                  console.log(err);
                  callback(err);
                } else {
                  callback(err);
                }
                //callback(err);
              }
            );
          } else if (material[0].secondary_material_id == null) {
            console.log("updating secondary material");
            con.query(
              "UPDATE applied_materials SET secondary_material_id = ? WHERE id = ?;",
              [material_id, subject_id],
              function (err) {
                if (err) {
                  console.log(err);
                  callback(err);
                } else {
                  callback(err);
                }
              }
            );
          } else if (material[0].tertiary_material_id == null) {
            console.log("updating tertiary material");
            con.query(
              "UPDATE applied_materials SET tertiary_material_id = ? WHERE id = ?;",
              [material_id, subject_id],
              function (err) {
                if (err) {
                  console.log(err);
                  callback(err);
                } else {
                  callback(err);
                }
              }
            );
          } else if (material[0].tertiary_material_id == null) {
            con.query(
              "UPDATE applied_materials SET tertiary_material_id = ? WHERE id = ?;",
              [material_id, subject_id],
              function (err) {
                if (err) {
                  console.log(err);
                  callback(err);
                } else {
                  callback(err);
                }
              }
            );
          } else {
            console.log("all material slots are filled");
            callback(err);
          }
        }
      }
    );
  },

  getTakeoffs: function (callback) {
    con.query("SELECT * FROM takeoffs;", function (err, takeoffs) {
      if (err) return callback(err);
      callback(null, takeoffs);
    });
  },

  //used by mailer

  getTakeoffById: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, takeoff) {
        if (err) return callback(err);
        callback(null, takeoff);
      }
    );
  },

  //    db.getTakeoffTotal(takeoff_id, function (err, takeoff, total) {

  getTakeoffTotal: function (takeoff_id, callback) {
    con.query(
      "SELECT total, name FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, rows) {
        if (err) return callback(err);
        if (rows[0] != null && rows[0].total != null && rows[0].name != null) {
          console.log(rows[0]);
          let total = rows[0].total;
          let takeoffName = rows[0].name;
          callback(null, takeoffName, total);
        } else {
          callback(err);
        }
      }
    );
  },

  takeoffSetStatus: function (takeoff_id, status, cb) {
    con.query(
      "SELECT status FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, results) {
        if (err) {
          console.log(err);
          return cb(err);
        }
        const currentStatus = results[0].status;
        if (currentStatus < status) {
          con.query(
            "UPDATE takeoffs SET status = ? WHERE id = ?;",
            [status, takeoff_id],
            function (err) {
              if (err) {
                console.log(err);
                cb(err);
              } else {
                cb(null);
              }
            }
          );
        } else {
         // cb(new Error("Cannot decrease status"));
         console.log("Make copy?");
         cb(null);
        }
        cb(null);
      }
    );
  },

  generateInvoice: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, takeoff) {
        if (err) return callback(err);

        con.query(
          "SELECT * FROM estimate WHERE takeoff_id = ?;",
          [takeoff_id],
          function (err, estimate) {
            if (err) return callback(err);

                con.query(
                  "SELECT * FROM options WHERE takeoff_id = ?;",
                  [takeoff_id],
                  function (err, options) {
                    if (err) return callback(err);

                    con.query(
                      "SELECT * FROM payment_history WHERE takeoff_id = ?;",
                      [takeoff_id],
                      function (err, payments) {
                        if (err) return callback(err);

                        callback(null, takeoff, estimate, options, payments);
                      }
                    );
                  }
                );

          }
        );
      }
    );
  },

  // used by the material library
  getAllMaterials: function (callback) {
    con.query("SELECT * FROM materials;", function (err, materials) {
      if (err) return callback(err);
      callback(null, materials);
    });
  },

  updateMeasurement: function (subject_id, measurement, callback) {
    con.query(
      "UPDATE applied_materials SET measurement = ? WHERE id = ?;",
      [parseInt(measurement), subject_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  updateMeasurementUnit: function (subject_id, unit, callback) {
    con.query(
      "UPDATE applied_materials SET measurement_unit = ? WHERE id = ?;",
      [unit, subject_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  sumSFMaterial: function (material_id, takeoff_id, callback) {
    con.query(
      "SELECT subject, SUM(measurement) FROM subjects WHERE takeoff_id = ? GROUP BY subject;",
      [takeoff_id],
      function (err, subjects) {
        if (err) return callback(err);
        //console.log(subjects)
        callback(null, subjects);
      }
    );
  },

  query: function (sql, args, callback) {
    con.query(sql, args, function (err, results) {
      if (err) return callback(err);
      callback(results);
    });
  },
};
