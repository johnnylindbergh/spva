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

function getLevenshteinDistanceSetting() {
  con.query(
    "SELECT setting_value FROM system_settings WHERE setting_name = 'levenshtein_distance';",
    function (err, distance) {
      if (err) {
        console.log(err);
        return 2;
      }
      return parseInt(distance[0].setting_value);
    }
  );
}

function bankOffset(total){
  console.log("applying bank offset");
  return total + (15);

}

function cardOffset(total){
     
  return total*1.0288 + 0.3;

}



function generateHash() {
  return crypto
    .randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "0")
    .replace(/\//g, "0")
    .slice(0, 32);
}

function applySubjectCoatRules(takeoff_id, callback) {
  // for each applied_material with takeoff_id = takeoff_id, if the primer or top_coat integers are set to some number greater than 0, 
  // for n in top_coat,
    // insert duplicate row with top_coat = 0 and name = name + " top coat" + n
  // for n in primer,
    // insert duplicate row with primer = 0 and name = name + " primer" + n 

  con.query("SELECT * FROM applied_materials WHERE takeoff_id = ?;", [takeoff_id], function (err, subjects) {
    if (err) {
      console.error("Error fetching subjects:", err);
      return callback(err);
    }
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      console.log("Processing subject:", subject);
      if (subject.top_coat > 0) {
        for (let n = 1; n <= subject.top_coat; n++) {
          con.query(
            "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, labor_cost, top_coat, primer) VALUES (?, ?, ?, ?, ?, ?, ?);",
            [takeoff_id, subject.name + " top coat " + n, subject.measurement, subject.measurement_unit, 0, 0, 0],
            function (err) {
              if (err) {
                console.error("Error inserting top coat:", err);
              } else {
                console.log("Successfully inserted top coat.");
              }
            }
          );
        }
      }
      if (subject.primer > 0) {
        for (let n = 1; n <= subject.primer; n++) {
          con.query(
            "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, labor_cost, top_coat, primer) VALUES (?, ?, ?, ?, ?, ?, ?);",
            [takeoff_id, subject.name + " primer " + n, subject.measurement, subject.measurement_unit, 0, 0, 0],
            function (err) {
              if (err) {
                console.error("Error inserting primer:", err);
              } else {
                console.log("Successfully inserted primer.");
              }
            }
          );
        }
      }
    }
    callback(null);
  });
}


function applySubjectNamingRules(takeoff_id, callback) {
  // Fetch subjects based on the given takeoff_id
  con.query("SELECT * FROM applied_materials WHERE takeoff_id = ?;", [takeoff_id], function (err, subjects) {
    if (err) {
      console.error("Error fetching subjects:", err);
      return callback(err);
    }

    if (!subjects.length) {
      console.log("No subjects found for the given takeoff_id.");
      return callback(null);
    }

    let pendingQueries = 0;
    let completed = false;

    function checkPendingQueries() {
      if (pendingQueries === 0 && !completed) {
        completed = true; // Ensure callback is called only once
        callback(null);
      }
    }

    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      console.log("Processing subject:", subject);

      if (subject.name.toLowerCase().includes("remove from") || subject.name.toLowerCase().includes("remove")) {
        let removeSubject = subject.name.split("remove")[1]?.trim();

        if (removeSubject?.startsWith("from")) {
          removeSubject = removeSubject.split("from")[1]?.trim();
        }

        if (removeSubject?.length) {
          let minSubjectId = null;
          let minDistance = Infinity;

          for (let j = 0; j < subjects.length; j++) {
            const distance = levenshtein.get(subjects[j].name, removeSubject);
            if (distance < minDistance) {
              minDistance = distance;
              minSubjectId = j;
            }
          }

          if (minSubjectId == null || minDistance > 2) {
            console.log(`No matching subject found to remove from for "${removeSubject}".`);
          } else {
            const targetSubject = subjects[minSubjectId];
            console.log(`Subtracting ${subject.measurement} from ${targetSubject.measurement} (ID: ${targetSubject.id}).`);

            pendingQueries++;
            con.query("UPDATE applied_materials SET measurement = measurement - ? WHERE id = ?;", 
              [subject.measurement, targetSubject.id], function (err) {
              if (err) {
                console.error("Error updating measurement:", err);
              } else {
                console.log("Successfully updated measurement.");
              }
              pendingQueries--;
              checkPendingQueries();
            });

            pendingQueries++;
            con.query("DELETE FROM applied_materials WHERE id = ?;", [subject.id], function (err) {
              if (err) {
                console.error("Error deleting subject:", err);
              } else {
                console.log("Successfully removed subject.");
              }
              pendingQueries--;
              checkPendingQueries();
            });
          }
        }
      }
    }

    // Ensure callback is called if no pending queries were added
    checkPendingQueries();
  });
}



function matchSubjectStrings(currentSubjectId, takeoff_id) {
  // get the current subject
  con.query("SELECT * FROM subjects WHERE id = ?;", [currentSubjectId], function (err, currentSubjects) {
    if (err) {
      console.log(err);
      return;
    }
    const currentSubject = currentSubjects[0].name;

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

            if (minDistance < 2) {
              con.query(
                "UPDATE applied_materials SET material_id = ? WHERE name = ? AND takeoff_id = ?;",
                [min_id, currentSubject, takeoff_id],
                function (err) {
                  if (err) {
                    console.log(err);
                  }
                  console.log("found a close match: ", currentSubject, min_id);
                }
              );
            }
          });
        }
      }
    );
  });
}


module.exports = {
  connection: con,
  applySubjectNamingRules: applySubjectNamingRules,
  applySubjectCoatRules: applySubjectCoatRules,
  generateHash: generateHash,

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
    // make insert and retrieve inserted profile data (assumes default role is 2)
    con.query(
      "INSERT INTO users (email, name, user_type) VALUES (?, ?, 2); SELECT * FROM users WHERE uid = LAST_INSERT_ID();",
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


    console.log("the headers of the csv are: ",headers);
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

      // determine whuch column is Labled "Date"
      var dateIndex = headers.indexOf("Date");
      if (dateIndex === -1) {
        dateIndex = headers.indexOf("date");
      } else {
        results[i][dateIndex] = date(results[i][2]).format("YYYY-MM-DD HH:mm:ss");

      }



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

      if (parseFloat(results[i][9]) !== 0) { // if the wall area is not zero, use the wall area and wall area unit
        measurement = parseFloat(results[i][9]);
        measurementUnit = results[i][10];
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
        "INSERT INTO subjects (takeoff_id, subject, page_label, layer, color, measurement, measurement_unit, top_coat, primer) VALUES (?,?,?,?,?,?,?,?,?);",
        [
          takeoff_id,
          results[i][0],
          results[i][1],
          results[i][3],
          results[i][4],
          parseFloat(measurement),
          results[i][15],
          results[i][16],
          results[i][17],
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
    setTimeout(() => {
      cb(null);
    }, 2000);
    
  },

  createNewTakeoff: function (req, res, cb) {
    let lastInsertId;
    con.query(
      "INSERT INTO takeoffs (creator_id, name, hash) VALUES (?, ?, ?); SELECT LAST_INSERT_ID() as last;",
      [req.user.local.id, req.body.takeoffName, generateHash().toString()],
      function (err, result) {
        if (err) {
          return cb(err);
        }
        console.log("created takeoff", result[1][0].last);
        lastInsertId = result[1][0].last;
        // customer info 
        cb(null, lastInsertId);

      }
    );
  }, 


  createNewBlankTakeoff: function (req, res, cb) {
    con.query(
      "INSERT INTO takeoffs (creator_id, name, hash) VALUES (?, ?, ?); SELECT LAST_INSERT_ID() as last;",
      [req.user.local.id, "Al's Takeoff", generateHash().toString()],
      function (err, result) {
        if (err) {
          return cb(err);
        }
        console.log("created takeoff", result[1][0].last);
        cb(null, result[1][0].last);
      }
    );
  }, 
  
  deleteTakeoff: function (takeoff_id, deletedBy, callback) {
    // first check if the takeoff.created_by matches the deletedBy user_id
    con.query("SELECT creator_id FROM takeoffs WHERE id = ?;", [takeoff_id], function (err, results) {
      if (err) return callback(err);
      if (results.length === 0) return callback("Takeoff not found");

      if (results[0].creator_id !== deletedBy) {
        return callback("Unauthorized: You can only delete takeoffs you created");
      }

      con.query("DELETE FROM takeoffs WHERE id = ?;", [takeoff_id], function (err) {
        if (err) return callback(err);
        callback(null);
      });
    });
  },

  uploadPlans: function (takeoff_id, file, callback) {
    // set the takeoff's file_path_of_plans to the file string
    con.query(
      "UPDATE takeoffs SET file_path_of_plans = ? WHERE id = ?;",
      [file, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  createSubject: function (takeoff_id, subject, callback) {
    console.log("subject: ", subject);
    console.log("takeoff_id: ", takeoff_id);
    // is any of these value null?
    if (!takeoff_id || !subject.name || !subject.measurement || !subject.measurement_unit || !subject.labor_cost) {
      console.log("createSubject got null value");
    } else {
      con.query(
        "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, labor_cost, top_coat, primer) VALUES (?, ?, ?, ?, ?, ?, ?);",
        [takeoff_id, subject.name, subject.measurement, subject.measurement_unit, 0, 0,0],
        function (err) {
          if (err) {
            console.log(err);
            return callback(err);
          }
          callback(null);
        }
      );
    }
  },

  getCustomers: function (callback) {
    con.query("SELECT * FROM customers;", function (err, customers) {
      if (err) return callback(err);
      // if the data is not null, return the data
      callback(err, customers);
    });
  },
  

  updateTakeoffCustomer: function (takeoff_id, customer_id, callback) {
    if (!takeoff_id || !customer_id) {
       callback("Missing required parameters in updateTakeoffCustomer");
    } else {

      // query the customer table for the customer name
      con.query("SELECT * FROM customers WHERE id = ?;", [customer_id], function (err, customerInfo) {
        if (err) {
          console.log(err);
          return callback(err);
        }
        console.log("Customer Info: ", customerInfo[0]);
        let customer_id = customerInfo[0].id;
        con.query(
          "INSERT INTO customer_takeoffs (customer_id, takeoff_id) VALUES (?, ?);",
          [customer_id, takeoff_id],
          function (err) {
            if (err){
              console.log(err);
              callback(err);
            } else {

              // update the takeoffs table set customer_id = customer_id
              con.query( 
                "UPDATE takeoffs SET customer_id = ? WHERE id = ?;",
                [customer_id, takeoff_id],
                function (err) {
                  if (err) {
                    console.log(err);
                    return callback(err);
                  }
                  callback(null);
                }
              );

              callback(null);
            }
          }
        );
      });
    }
  },

// deprecated now just make association in the customer_takeoffs table
//   updateTakeoffCustomer: function (takeoff_id, customer, project, callback) {
//     console.log("Updating takeoff Customer: ", takeoff_id, customer, project);
//  // customer string become the owner name
//  // and the project name becomes appended to the takeoff name
//      if (!takeoff_id || !customer) {
//       console.log("updateTakeoffCustomer got null value");
//       console.log(takeoff_id, customer, project);
//       callback("Missing required parameters");
//     } else {

//       // query the customer table for the customer name

//       con.query("SELECT * FROM customers WHERE FullyQualifiedName = ?;", [customer], function (err, customerInfo) {
//         if (err){
//           console.log(err);
//           return callback(err);
//         } else {
//           console.log("Customer Info: ", customerInfo[0]);
//           console.log("Customer name: ", customerInfo[0].GivenName +" "+ customerInfo[0].FamilyName);
//           console.log("Customer billing address: "+ customerInfo[0].BillAddr_Line1 + ", " + customerInfo[0].BillAddr_City + ", " + customerInfo[0].BillAddr_CountrySubDivisionCode);
//           console.log("Customer email address:", customerInfo[0].PrimaryEmailAddr_Address)
//           let billing_address = customerInfo[0].BillAddr_Line1 + ", " + customerInfo[0].BillAddr_City + ", " + customerInfo[0].BillAddr_CountrySubDivisionCode
//           // use this info to update the takeoff's owner
//           con.query(
//             "UPDATE takeoffs SET owner = ?, name = ?, owner_billing_address = ?, owner_email = ? WHERE id = ?;",
//             [customerInfo[0].GivenName +" "+ customerInfo[0].FamilyName, project, billing_address, customerInfo[0].PrimaryEmailAddr_Address, takeoff_id],
//             function (err) {
//               if (err) {
//                 console.log(err);
//                 return callback(err);
//               }
//               callback(null);
//             }
//           );
//         }
//       });
//     }
//   },
    
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
      // get the customer id from the takeoff_id useing the customer_takeoffs table

      con.query("SELECT * FROM customer_takeoffs WHERE takeoff_id = ?;", [takeoff_id], function (err, customerInfo) {
        if (err) {
          console.log(err);
          return callback(err);
        } else {
          console.log(customerInfo[0]);
          con.query(
            "UPDATE customers SET givenName = ? WHERE id = ?;",
            [owner_name, customerInfo[0].customer_id],
            function (err) {
              if (err) return callback(err);
              callback(null);
            }
          );
        }
      });
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
      con.query("SELECT * FROM takeoffs WHERE id = ?;", [takeoff_id], function (
        err,
        takeoffInfo
      ) {
        if (err) {
          console.log(err);
          return callback(err);
        } else {
          console.log(takeoffInfo[0]);
          con.query(
            "UPDATE customers SET billing_address = ? WHERE id = ?;",
            [owner_billing_address, takeoffInfo[0].customer_id],
            function (err) {
              if (err) return callback(err);
              callback(null);
            }
          );
        }
      });
    }
  },


  getTakeoff: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, takeoff_info) {
        if (err) return callback(err);
        if (takeoff_info.length === 0) {
          return callback("Takeoff not found");
        }

        con.query(queries.getTakeoff, [takeoff_id], async function (err, rows) {
          if (err) return callback(err);

          // Create an array of promises to fetch material names
          const promises = rows.map((row) => {
            if (row && row.material_id) {
              return new Promise((resolve, reject) => {
                con.query(
                  "SELECT * FROM materials WHERE id = ?;",
                  [
                    row.material_id
                  ],
                  function (err, material) {
                    if (err) return reject(err);

                    // Add material names to the row
                    row.selected_materials = material; // You can customize how you want to store the materials info
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

            // query the customer_id and append the row to the takeoff_info
            con.query("SELECT * FROM customer_takeoffs join customers on customer_takeoffs.customer_id = customers.id  WHERE takeoff_id = ? LIMIT 1;", [takeoff_id], function (err, customerInfo) {
              if (err) {
                console.log(err);
                return callback(err);
              } else {
                Object.assign(takeoff_info[0], customerInfo[0]);

                callback(null, takeoff_info, updatedRows);

              }
            });
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

  generateEstimate: function (takeoff_id, callback) {
    // query takeoffs table for estimate_id
    // if the estimate_id is null, create a new estimate insert it into the db, and update the takeoff's estimate_id in the takeoffs table
    // if the estimate_id is not null, update the existing estimate with the new data
    con.query(
      "SELECT estimate_id FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, estimate_id) {
        if (err) return callback(err);
        console.log(estimate_id);

        if (estimate_id[0].estimate_id == null) {
          con.query(
            "INSERT INTO estimates (takeoff_id) VALUES (?); SELECT LAST_INSERT_ID() as last;",
            [takeoff_id],
            function (err, result) {
              if (err) {
              }
              con.query(
                "UPDATE takeoffs SET estimate_id = ? WHERE id = ?;",
                [result[1][0].last, takeoff_id],
                function (err) {
                  if (err) return callback(err);
                }
              );
            }
          );
        } else {
        }
      }
    );

    con.query(
      queries.getCustomerTakeoff,
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
                  "SELECT * FROM materials WHERE id IN (?, ?, ?, ?);",
                  [
                    row.material_id,
                    row.secondary_material_id,
                    row.tertiary_material_id,
                    row.quaternary_material_id,
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
      "UPDATE estimates SET inclusions = ?, exclusions = ? WHERE id = ?;",
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
      // use the takeoffs customer_id to update customers.email_address
      con.query("SELECT * FROM customer_takeoffs WHERE takeoff_id = ?;", [takeoff_id], function (err, customerInfo) {
        if (err) {
          console.log(err);
          return callback(err);
        } else {
          console.log(customerInfo[0]);
          con.query(
            "UPDATE customers SET primary_email_address = ? WHERE id = ?;",
            [owner_email, customerInfo[0].customer_id],
            function (err) {
              if (err) return callback(err);
              callback(null);
            }
          );
        }
      });
    }
  },

  updateTakeoffInvoiceEmail: function (takeoff_id, owner_email, callback) {
    if (!takeoff_id || !owner_email) {
      return callback("Missing required parameters");
    } else {
        // use the takeoffs customer_id to update customers.invoice_email_address
        con.query("SELECT * FROM customer_takeoffs WHERE takeoff_id = ?;", [takeoff_id], function (err, customerInfo) {
          if (err) {
            console.log(err);
            return callback(err);
          } else {
            console.log(customerInfo[0]);
            con.query(
              "UPDATE customers SET invoice_email_address = ? WHERE id = ?;",
              [owner_email, customerInfo[0].customer_id],
              function (err) {
                if (err) return callback(err);
                callback(null);
              }
            );
          }
        });
    }
  },

  deletePlans: function (takeoff_id, callback) {
    con.query(
      "UPDATE takeoffs SET file_path_of_plans = NULL WHERE id = ?;",
      [takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  // invoice 

  getInvoiceByNumber: function (invoice_number, callback) {
    if (invoice_number == null) {
      console.log("getInvoiceByNumber got null value");
    } else {
      con.query(
        `SELECT
          takeoffs.hash, 
          takeoffs.tax, 
          takeoffs.id AS takeoff_id, 
          invoices.id AS invoice_id, 
          takeoffs.total as estimateTotal, 
          invoices.total as invoiceTotal, 
          invoices.invoice_number,
          invoices.qb_number
        FROM 
          invoices 
        INNER JOIN 
          takeoffs ON invoices.takeoff_id = takeoffs.id 
        WHERE 
          invoices.invoice_number = ? OR invoices.qb_number = ?;`,
        [invoice_number,invoice_number],
        function (err, invoice) {
          if (err) {
            console.log(err);
            return callback(err);
          } else {
            callback(null, invoice);

            // update the invoice view count and last viewed date
            con.query(
              "UPDATE invoices SET view_count = view_count + 1, last_viewed = NOW() WHERE invoice_number = ?;",
              [invoice_number],
              function (err) {
                if (err) {
                  console.log(err);
                }
              }
            );

          }
        }
      );
    }
  },

  getInvoiceCount: function (takeoff_id, callback) {
    con.query("SELECT COUNT(*) as count FROM invoices WHERE takeoff_id = ?;", [takeoff_id], function (err, count) {
      if (err) return callback(err);
      callback(null, count[0].count);
    });
  },

  getInvoicableTotal: function (takeoff_id, callback) {
    con.query("SELECT SUM(amount) as total FROM payment_history WHERE takeoff_id = ?;", [takeoff_id], function (err, total) {
      if (err) return callback(err);
      if (total == null){
        total = 0;
        console.log("customer has not made any payments");
      }

      // get takeoff and join the estimate_id to get the signed_total
      con.query("SELECT * FROM takeoffs join estimates on takeoffs.estimate_id = estimates.id WHERE takeoffs.id = ?;", [takeoff_id], function (err, estimateTakeoffObject) {
        if (err) return callback(err);
        if (!estimateTakeoffObject || estimateTakeoffObject.length === 0 || !total || total.length === 0) {
          return callback(new Error("Invalid data retrieved"));
        }
        console.log("got signed_total: ", (parseFloat(estimateTakeoffObject[0].signed_total) - parseFloat(total[0].total)).toFixed(2));
        callback(null, (parseFloat(estimateTakeoffObject[0].signed_total) - parseFloat(total[0].total)).toFixed(2));
      });

    });
  },

  updateTakeoffLastUpdatedBy: function (takeoff_id, user_id, callback) {
    if (!takeoff_id || !user_id) {
      return callback("Missing required parameters");
    } else {
      con.query(
        "UPDATE takeoffs SET last_updated_by = ? WHERE id = ?;",
        [user_id, takeoff_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
  },


  
  logEmailSent: function (takeoff_id, sender_id, recipient_email, type, response, callback) {

    // add a check to the respose to see if it is a success or failure

    con.query(
      "INSERT INTO emails (takeoff_id, sender_id, recipient_email, type, response) VALUES (?,?,?,?,?);",
      [takeoff_id, sender_id, recipient_email, type, response],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
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
            "INSERT INTO estimates (takeoff_id, inclusions, exclusions) VALUES (?,?,?);",
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
          "UPDATE estimates SET inclusions = COALESCE(inclusions, ?), exclusions = COALESCE(exclusions, ?) WHERE id = ?;",
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

  addOption: function (takeoff_id, description, cost_delta, callback) {
    // first check if the row_id is null, if it is, insert a new row
    // if it is not, update the existing row
 
      // if row exists but is now blank, delete the row
      if (description == "" || cost_delta == null) {
        callback("Option or cost_delta is blank");
      } else {
        con.query(
          "INSERT INTO options (takeoff_id, description, cost) VALUES (?,?,?); SELECT LAST_INSERT_ID() as last;",
          [takeoff_id, description, cost_delta],
          function (err, last) {
            if (err) return callback(err);
            callback(null, last[1][0].last);
          }
        );
      }
    
  },

  deleteOption: function (option_id, callback) {
    con.query("SELECT * FROM options WHERE id = ?;", [option_id], function (err, option) {
      if (err) return callback(err);
      if (option.length == 0) {
        return callback("Option not found");
      }

      // check the status of the takeoff
      con.query('SELECT status FROM takeoffs WHERE id = ?;', [option[0].takeoff_id], function(err, status){
        if (err) return callback(err);
        if (status[0].status == 4) {
          return callback("Cannot delete option for signed takeoff");
        } else {
          con.query("DELETE FROM options WHERE id = ?;", [option_id], function (err) {
            if (err) return callback(err);
            callback(null);
          });
        }
      }
      );
    }
    );
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
      "SELECT * FROM estimates WHERE takeoff_id = ? LIMIT 1;",
      [takeoff_id],
      function (err, estimate) {
        if (err) return callback(err);
        con.query(
         queries.getCustomerTakeoff,
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
      queries.getCustomerTakeoffByHash,
      [hash],
      function (err, takeoffResults) {
        if (err) return callback(err);
        if (!takeoffResults || takeoffResults.length === 0) {
          console.log("non-existent hash: ", hash);
          return callback(
            new Error("No takeoff found for the provided hash")
          );
        }

        //format the takeoff_start_date
        takeoffResults[0].takeoff_start_date = moment(takeoffResults[0].takeoff_start_date).format("YYYY-MM-DD");

        const takeoff = takeoffResults[0]; // assuming only one result

        console.log("getting shared takeoff:", takeoff);

        con.query(
          "SELECT * FROM estimates WHERE id = ?;",
          [takeoff.estimate_id],
          function (err, estimateResults) {
            if (err) return callback(err);
            // const estimate = estimateResults[0]; // assuming only one result

            // Query the options table for the estimate_id
            con.query(
              "SELECT * FROM options WHERE takeoff_id = ?;",
              [takeoff.takeoff_id],
              function (err, optionsResults) {
                if (err) return callback(err);
                callback(null, estimateResults, takeoff, optionsResults);
              }
            );
          }
        );
      }
    );

    // update the view_count for the takeoff
    con.query(
      "UPDATE takeoffs SET view_count = view_count + 1 WHERE hash = ?;",
      [hash],
      function (err) {
        if (err) {
          console.log(err);
        }
      }
    );
  },

  changeStartDate: function (takeoff_id, startDate, callback) {
    con.query(
      "UPDATE takeoffs SET start_date = ? WHERE id = ?;",
      [startDate, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  renewEstimate: function (takeoff_id, callback) {
    con.query(
      "UPDATE takeoffs SET status = 6 WHERE id = ?;", // 6 for staged for renewal
      [takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
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

  updateCustomerPhone: function (takeoff_id, phone, callback) {
    con.query('SELECT customer_id FROM takeoffs WHERE id = ?;', [takeoff_id], function(err, results){
      if (err) return callback(err);
      console.log("updating phone number for customer_id: ", results[0].customer_id); 
      con.query("UPDATE customers SET phone = ? WHERE id = ?;", [phone, results[0].customer_id], function(err){
        if (err) return callback(err);
        callback(null);
      });
    });
  },



  updateSignature: function (takeoff_id, signature, date, callback) {
    // first get the owner_name in takeoffs
    con.query(
      "SELECT * FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, takeoff) {
        con.query("SELECT * from customers WHERE id = ?;", [takeoff[0].customer_id], function (err, owner) {

          if (err) return callback(err);
          console.log("comparing  ", owner[0].givenName); // there should only be one result
          console.log("to  ", signature);
          // if the levenshtein distance is less than 3, update the takeoff status to 4
          if (
            levenshtein.get(owner[0].givenName, signature) < 2 ||
            owner[0].givenName == null
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
        });
      }
    );
  },

  updateSignedTotal: (takeoff_id, total, callback) => {
    // first get the estimate id from the takeoff_id
    con.query( "SELECT estimate_id FROM takeoffs WHERE id = ?;", [takeoff_id], function(err, estimate_id){
      if (err) return callback(err);
      if (estimate_id[0].estimate_id == null) {
        console.log("No estimate_id found for takeoff_id: ", takeoff_id);
      }
      con.query(
        "UPDATE estimates SET signed_total = ? WHERE id = ?;",
        [total, estimate_id[0].estimate_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
    );
  },

  // this function get all the subjects for a takeoff and then adds blank (no materials) applied_materials for each subject

  generateTakeoffMaterials: function (takeoff_id, callback) {
    con.query(
      "SELECT subject, SUM(measurement) AS total_measurement, MAX(measurement_unit) AS measurement_unit, MAX(color) AS color, MAX(top_coat) AS top_coat, MAX(primer) AS primer FROM subjects WHERE takeoff_id = ? GROUP BY subject;",
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
              let currentSubjectId = subjects[i].id;

              // if the current subject contains "notes" or note, skip it
              if (currentSubject.toLowerCase().includes("note")) {
                continue;
              } 
                console.log("Inserted subject: ", currentSubject);
                con.query(
                "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, labor_cost, top_coat, primer) VALUES (?, ?, ?, ?, ?, ?, ?);",
                [
                  takeoff_id,
                  subjects[i].subject,
                  subjects[i].total_measurement,
                  subjects[i].measurement_unit,
                  default_labor_cost[0].setting_value,
                  subjects[i].top_coat||0,
                  subjects[i].primer||0,
                ],
                function (err) {
                  if (err) {
                  console.log(err);
                  } else {
                  //  matchSubjectStrings(currentSubjectId, takeoff_id);
                  }
                }
                );
            }
            applySubjectNamingRules(takeoff_id, function(err){
              if (err) return callback(err);
              callback(null);
            });
          
            // sleep for 1 second to allow the database to update
            setTimeout(function () {
              callback(null);
            }, 1000);
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
        function (err, materials) {
            if (err) {
                console.error("Database query error:", err);
                return callback(err); // Ensure the callback is called on error
            }

            if (!materials || materials.length === 0) {
                console.warn("Subject ID not found");
                return callback("Subject ID not found");
            }

            const materialRow = materials[0];
            const fields = [
                "material_id",
                "secondary_material_id",
                "tertiary_material_id",
                "quartary_material_id"
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
                const sql = `UPDATE applied_materials SET ${fieldToUpdate} = NULL WHERE id = ? AND ${fieldToUpdate} = ? LIMIT 1;`;
                con.query(sql, [subject_id, material_id], function (err, result) {
                    if (err) {
                        console.error("Error updating material slot:", err);
                        return callback(err);
                    }

                    // Check if any rows were actually updated
                    if (result.affectedRows === 0) {
                        console.warn(
                            `No matching material ID ${material_id} found for subject ID ${subject_id}`
                        );
                        return callback(
                            `Material ID ${material_id} not found for subject ID ${subject_id}`
                        );
                    }

                    console.log(
                        `${fieldToUpdate} updated to NULL for subject ID ${subject_id}`
                    );
                    callback(null); // Indicate success
                });
            } else {
                console.warn("No material slots match the material ID");
                callback("No material slots match the material ID");
            }
        }
    );
},


  // removeMaterialSubject: function (material_id, subject_id, callback) {
  //   // First, get the subject and the applied materials
  //   con.query(
  //     "SELECT * FROM applied_materials WHERE id = ?;",
  //     [subject_id],
  //     function (err, material) {
  //       if (err) {
  //         console.log(err);
  //         return callback(err); // Ensure the callback is called on error
  //       }

  //       if (!material || material.length === 0) {
  //         console.log("Subject ID not found");
  //         return callback("Subject ID not found");
  //       }

  //       const materialRow = material[0];
  //       const fields = [
  //         "material_id",
  //         "secondary_material_id",
  //         "tertiary_material_id",
  //       ];
  //       let fieldToUpdate = null;

  //       // Check which material slot matches the material_id
  //       for (let field of fields) {
  //         if (materialRow[field] == material_id) {
  //           fieldToUpdate = field;
  //           break;
  //         }
  //       }

  //       if (fieldToUpdate) {
  //         // Construct the SQL query dynamically
  //         const sql = `UPDATE applied_materials SET ${fieldToUpdate} = NULL WHERE id = ? LIMIT 1;`;
  //         con.query(sql, [subject_id], function (err) {
  //           if (err) {
  //             console.log(err);
  
  
  //             return callback(err);
  //           }
  //           console.log(
  //             `${fieldToUpdate} updated to NULL for subject ID ${subject_id}`
  //           );
  //           callback(null); // Indicate success
  //         });
  //       } else {
  //         console.log("No material slots match the material ID");
  //         callback("No material slots match the material ID");
  //       }
  //     }
  //   );
  // },

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
   // get the applied_materials row
   // insert the name into the options table with a default cost of 0
    // set the applied_material_id to null
    con.query("SELECT * FROM applied_materials WHERE id = ?;", [applied_material_id], function(err, material){
      if (err) {
        console.log(err);
        return callback(err);
      }
      if (material.length == 0) {
        console.log("Material not found");
        return callback("Material not found");
      }
      con.query("INSERT INTO options (takeoff_id, description, cost) VALUES (?,?,?); SELECT LAST_INSERT_ID() as last;", [material[0].takeoff_id, material[0].name, 0], function(err, last){
        if (err) {
          console.log(err);
          return callback(err);
        }
        con.query("UPDATE applied_materials SET name = NULL WHERE id = ?;", [applied_material_id], function(err){
          if (err) {
            console.log(err);
            return callback(err);
          }
          callback(null, last[1][0].last);
        });
      });
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

  changeMaterialPrice: function (takeoff_id, material_id,  price, callback) {
    con.query(
      "SELECT * FROM applied_materials WHERE material_id = ? AND takeoff_id = ?;",
      [material_id, takeoff_id],
      function (err, materials) {
        if (err) {
          console.log(err);
          callback(err);
        }
        //console.log(materials);
        for (var i = 0; i < materials.length; i++) {
          if (materials[i].material_id == material_id) {
            con.query(
              "UPDATE applied_materials SET cost_delta = ? WHERE material_id = ? AND takeoff_id = ?;",
              [price, material_id, takeoff_id],
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

    con.query(
      "SELECT * from applied_materials WHERE id = ?;",
      [subject_id],
      function (err, material) {
        if (err) {
          console.log(err);
          return callback(err);
        }
        if (!material || material.length === 0) {
          console.log("Subject ID not found");
          return callback("Subject ID not found");
        }
        if (material[0].material_id == null) {
          console.log("updating primary material");
          con.query(
            "UPDATE applied_materials SET material_id = ? WHERE id = ?;",
            [material_id, subject_id],
            function (err) {
              if (err) {
                console.log(err);
                return callback(err);
              }
              // set the primary_cost_delta to zero
              con.query("UPDATE applied_materials SET cost_delta = 0 WHERE id = ?;", [subject_id], function(err){
                if (err) {
                  console.log(err);
                  return callback(err);
                }
                callback(null);
              });
            }
          );
        } else {
          console.log("material ID is already set");
          callback(null);
        }

      }
    );
  },

  getTakeoffs: function (callback) {
    const query = `
      SELECT 
        takeoffs.id,
        takeoffs.name,
        takeoffs.status,
        estimates.date_created,
        takeoffs.created_at AS takeoff_created_at
      FROM 
        takeoffs
      LEFT JOIN 
        estimates
      ON 
        takeoffs.estimate_id = estimates.id;
    `;

    con.query(query, function (err, takeoffs) {
      if (err) {
        console.error("Error fetching takeoffs:", err);
        return callback(err);
      }
      callback(null, takeoffs);
    });
  },

  //used by mailer

  getTakeoffById: function (takeoff_id, callback) {
    con.query(
      queries.getCustomerTakeoff,
      [takeoff_id],
      function (err, takeoff) {
        if (err) return callback(err);
        callback(null, takeoff);
      }
    );
  },

  //    db.getTakeoffTotal(takeoff_id, function (err, takeoff, total) {
// get the raw pretax total excluding options
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

  updatePaymentMethod: function (takeoff_id, payment_method, callback) {
    con.query(
      "UPDATE takeoffs SET payment_method = ? WHERE id = ?;",
      [payment_method, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  getPaymentMethod: function (takeoff_id, callback) {
    con.query(
      "SELECT payment_method FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, results) {
        if (err) return callback(err);
        callback(null, results[0].payment_method);
      }
    );
  },

getTakeoffTotalForDeposit: function (takeoff_id, callback) {
  console.log("getting total for stripe");
    con.query(
      "SELECT  signed_total, name, tax, payment_method FROM estimates join takeoffs ON takeoffs.estimate_id = estimates.id WHERE takeoffs.id = ?;",
      [takeoff_id],
      function (err, rows) {
        console.log(rows);
        if (err) return callback(err);
        if (rows[0] != null && rows[0].signed_total != null && rows[0].name != null) {

          // get the option total
          con

          console.log(rows[0]);
          let tax = parseFloat(rows[0].tax);
          let estimateTotal = parseFloat(rows[0].signed_total);
          let method = rows[0].payment_method;

          console.log("estimateTotal: ", estimateTotal);
          console.log("tax: ", tax);
          console.log("method: ", method);

          // apply offsets for the stripe total
          let total = parseFloat(estimateTotal);
          console.log("total: ", total);

          // get 20% of the total for the deposit
          total = total * 0.2; // hard coded 20% deposit lol

          // get the optiontotal
          if (method == "card") {
            total = cardOffset(total);
          }
          if (method == "us_bank_account") {
            total = bankOffset(total);
          }

          console.log("total after offset: ", total);

          // get the total to 2 decimal places
          total = total.toFixed(2);
          // return the total 
          callback(null, rows[0].name, total);
        }

        else {
          callback(err);
        }
      }
    );
  },


  getInvoiceById: function (invoice_id, takeoff_id, callback) {
    con.query(
      "SELECT invoices.total AS invoiceTotal, takeoffs.name as takeoffName, takeoffs.customer_id AS customer_id, takeoffs.payment_method AS payment_method, takeoffs.id AS takeoff_id, invoices.hash AS invoice_hash FROM invoices join takeoffs ON takeoffs.id = invoices.takeoff_id WHERE invoices.id = ?;",
      [invoice_id],
      function (err, invoice) {
        if (err) return callback(err);
        callback(null, invoice[0]);
      }
    );
  },


  getInvoicesByTakeoffId: function (takeoff_id, callback) {
    con.query( "SELECT * FROM invoices WHERE takeoff_id = ?;", [takeoff_id], function(err, invoices){
      if (err) {
        console.log(err);
        return callback(err);
      }
      callback(null, invoices);
    }
    );
  },

  getSharedInvoice: function (hash, callback) {
    con.query(
      "SELECT * FROM invoices WHERE hash = ?;",
      [hash],
      function (err, invoice) {
        if (err) return callback(err);
        if (!invoice || invoice.length === 0) {
          console.log("non-existent hash: ", hash);
          return callback(new Error("No invoice found for the provided hash"));
        }
        callback(null, invoice[0]);
      }
    );
  },

  updateInvoiceWithQBNumber: function (invoice_id, qb_invoice_number, callback) {
    con.query(
      "UPDATE invoices SET qb_number = ? WHERE id = ?;",
      [qb_invoice_number, invoice_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  }
  ,


          // 

          //deprecated
  // // get the raw toatal + options + tax
  // getTakeoffTotalForStripe: function (takeoff_id, callback) {
  //   con.query(
  //     "SELECT total, name, tax FROM takeoffs join estimate WHERE takeoffs.id = ?;",
  //     [takeoff_id],
  //     function (err, rows) {
  //       console.log(rows);
  //       if (err) return callback(err);
  //       if (rows[0] != null && rows[0].total != null && rows[0].name != null) {

  //         console.log(rows[0]);
  //         let total = rows[0].total;
  //         let takeoffName = rows[0].name;
  //         let tax = parseFloat(rows[0].tax);


  //         // get the optiontotal
  //         con.query(
  //           "SELECT SUM(cost) as total FROM options WHERE takeoff_id = ? AND applied = 1;",
  //           [takeoff_id],
  //           function (err, options) {
  //             if (err) return callback(err);
  //             if (total == null) {
  //               total = 0;
  //             }

  //             if (options[0].total == null) {
  //               options[0].total = 0;
  //             }

  //             if (tax == null) {
  //               tax = 5.3;
  //             }

  //             let total = parseFloat(rows[0].total) + (parseFloat(options[0].total) || 0); // if no options, set to 0
  //             let takeoffName = rows[0].name;
  //             callback(null, takeoffName, total*(tax/100.0 + 1.0));

  //           }
  //         );
         
  //       } else {
  //         callback(err);
  //       }
  //     }
  //   );
  // },

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
          // cb(new Error("Cannot decrease status"));console.log("Cannot decrease status");
          cb(null);
        }
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
          "SELECT * FROM estimates WHERE takeoff_id = ?;",
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
