const creds = require("./credentials.js");
const sys = require("./settings.js");
const mysql = require("mysql2");
const moment = require("moment");
const date = require("date-and-time");
const request = require("request");
// const pushInvoiceToQuickbooks = require("./quickbooks.js").pushInvoiceToQuickbooks;
moment().format();

const queries = require("./queries.js");

// Levenshtein distance
const levenshtein = require("fast-levenshtein");
const crypto = require("crypto");
const e = require("express");
const OAuthClient = require("intuit-oauth");
const { group } = require("console");

// establish database connection
const con = mysql.createConnection({
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

function bankOffset(total) {
  console.log("applying bank offset");
  return total + (15);

}

function cardOffset(total) {

  return total * 1.0288 + 0.3;

}



function generateHash() {
  return crypto
    .randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "0")
    .replace(/\//g, "0")
    .slice(0, 32);
}

function pushInvoiceToQuickbooks(invoice_id, callback) {
  // just make get request to /pushInvoiceToQuickBooks/{{invoice_id}}
  request.get(sys.DOMAIN + "/pushInvoiceToQuickBooks/" + invoice_id, function (err, response, body) {
    if (err) {
      console.log(err);
      return callback(err);
    }
    console.log(body);
    callback(null);
  }
  );
}


function applySubjectCoatRules(takeoff_id, callback) {
  // for each applied_material with takeoff_id = takeoff_id, if the primer or top_coat integers are set to some number greater than 0, 
  // for n in top_coat,
  // insert duplicate row with top_coat = 0 and name = name + " top coat" + n
  // for n in primer,
  // insert duplicate row with primer = 0 and name = name + " primer" + n 
  console.log("Applying subject coat rules.db");
  con.query("SELECT * FROM applied_materials WHERE takeoff_id = ?;", [takeoff_id], function (err, subjects) {
    if (err) {
      console.error("Error fetching subjects:", err);
      return callback(err);
    }
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      //console.log("Processing subject:", subject);
      subject.top_coat = parseInt(subject.top_coat);
      subject.primer = parseInt(subject.primer);

      if (subject.top_coat > 0) {
        for (let n = 1; n <= subject.top_coat; n++) {
          console.log("inserting top coat"), subject + " top coat " + n;
          con.query(
            "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, color, labor_cost, top_coat, primer) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
            [takeoff_id, subject.name + " top coat " + n, subject.measurement, subject.measurement_unit, subject.color, 0, 0, 0],
            function (err) {
              if (err) {
                console.error("Error inserting top coat:", err);
              }
            }
          );
        }
      }
      if (subject.primer > 0) {
        for (let n = 1; n <= subject.primer; n++) {
          con.query(
            "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, color, labor_cost, top_coat, primer) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
            [takeoff_id, subject.name + " primer " + n, subject.measurement, subject.measurement_unit, subject.color, 0, 0, 0],
            function (err) {
              if (err) {
                console.error("Error inserting primer:", err);
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
      //console.log("Processing subject:", subject);

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
            //console.log(`Subtracting ${subject.measurement} from ${targetSubject.measurement} (ID: ${targetSubject.id}).`);

            pendingQueries++;
            con.query("UPDATE applied_materials SET measurement = measurement - ? WHERE id = ?;",
              [subject.measurement, targetSubject.id], function (err) {
                if (err) {
                  console.error("Error updating measurement:", err);
                } else {
                  //console.log("Successfully updated measurement.");
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


function matchSubjectStrings(currentSubjectId, takeoff_id, callback) {
  // get the current subject
  console.log("Matching subject strings.");
  console.log("currentSubjectId", currentSubjectId);
  con.query("SELECT * FROM applied_materials WHERE id = ?;", [currentSubjectId], function (err, currentSubjects) {
    if (err) {
      console.log(err);
      return callback(err);
    }
    if (currentSubjects.length === 0) {
      console.log("No current subjects found");
      return callback(null);
    }

    const currentSubject = currentSubjects[0];


    if (currentSubject){
      console.log("currentSubject", currentSubject);
    // First, get the frequency of materials applied to a given subject in the applied_materials table
    con.query(
      "SELECT material_id, name, COUNT(*) as count FROM applied_materials WHERE name = ? AND material_id IS NOT NULL GROUP BY material_id ORDER BY count DESC LIMIT 1;",
      [currentSubject.name],
      function (err, materials) {
        if (err) {
          console.log(err);
          return callback(err);
        }

        if (materials != null && materials.length > 0) {
          // very important to match to takeoff_id or else this query would update all the takeoffs in the table
          con.query(
            "UPDATE applied_materials SET material_id = ? WHERE name = ? AND takeoff_id = ?;",
            [materials[0].material_id, currentSubject.name, takeoff_id],
            function (err) {
              if (err) {
                console.log(err);
                return callback(err);
              }
              callback(null);
            }
          );
        } else {
          console.log("No predicted materials found");

          // Find the closest match in the materials table using Levenshtein distance
          con.query("SELECT * FROM materials;", function (err, allMaterials) {
            if (err) {
              console.log(err);
              return callback(err);
            }

            var minDistance = 100;
            var min_id = 0;
            for (var j = 0; j < allMaterials.length; j++) {
              var distance = levenshtein.get(allMaterials[j].name, currentSubject.name);
              if (distance < minDistance) {
                minDistance = distance;
                min_id = allMaterials[j].id;
              }
            }

            if (minDistance < 2) {
              con.query(
                "UPDATE applied_materials SET material_id = ? WHERE name = ? AND takeoff_id = ?;",
                [min_id, currentSubject.name, takeoff_id],
                function (err) {
                  if (err) {
                    console.log(err);
                    return callback(err);
                  }
                  callback(null);
                }
              );
            } else {
              callback(null);
            }
          });
        }
      }
    );
  }
  });
}
  

    



async function copyTakeoff(takeoff_id, callback) {
  // just copy the takeoff, applied_materials, and the customer_takeoffs table

  // first copy the takeoff
  con.query("SELECT * FROM takeoffs WHERE id = ?;", [takeoff_id], async function (err, takeoff) {
    if (err) {
      console.log(err);
      return callback(err);
    }

    // update the old takeoff hash
    con.query("UPDATE takeoffs SET hash = ? WHERE id = ?;", [generateHash(), takeoff_id], function (err) {
      if (err) {
        console.log(err);
        return callback(err);
      }
    });

    // copy the takeoff
    con.query(
      "INSERT INTO takeoffs (creator_id, name, hash, customer_id) VALUES (?, ?, ?, ?);",
      [takeoff[0].creator_id, takeoff[0].name + " copy", generateHash(), takeoff[0].customer_id],
      function (err, result) {
        if (err) {
          console.log(err);
          return callback(err);
        }
        const newTakeoffId = result.insertId;
        console.log("new takeoff id: ", newTakeoffId);

        // copy the applied_materials
        con.query("SELECT * FROM applied_materials WHERE takeoff_id = ?;", [takeoff_id], async function (err, applied_materials) {
          if (err) {
            console.log(err);
            return callback(err);
          }

          for (const material of applied_materials) {
            con.query(
              "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, color, labor_cost, top_coat, primer) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
              [newTakeoffId, material.name, material.measurement, material.measurement_unit, material.color, material.labor_cost, material.top_coat, material.primer],
              function (err) {
                if (err) {
                  console.log(err);
                  return callback(err);
                }
              }
            );
          }

          // copy the customer_takeoffs
          con.query(
            "INSERT INTO customer_takeoffs (customer_id, takeoff_id) SELECT customer_id, ? FROM customer_takeoffs WHERE takeoff_id = ?;",
            [newTakeoffId, takeoff_id],
            function (err) {
              if (err) {
                console.log(err);
                return callback(err);
              }

              // copy the estimates
              con.query("SELECT * FROM estimates WHERE takeoff_id = ?;", [takeoff_id], function (err, estimates) {
                if (err) {
                  console.log(err);
                  return callback(err);
                }

                for (const estimate of estimates) {
                  con.query(
                    "INSERT INTO estimates (takeoff_id, signed_total, inclusions, exclusions) VALUES (?, ?, ?, ?);",
                    [newTakeoffId, estimate.signed_total, estimate.inclusions, estimate.exclusions],
                    function (err) {
                      if (err) {
                        console.log(err);
                        return callback(err);
                      }
                    }
                  );
                }

                // copy the invoices
                con.query("SELECT * FROM invoices WHERE takeoff_id = ?;", [takeoff_id], function (err, invoices) {
                  if (err) {
                    console.log(err);
                    return callback(err);
                  }


                  for (const invoice of invoices) {
                    con.query(
                      "INSERT INTO invoices (invoice_number, qb_number, invoice_name, hash, takeoff_id, total, invoice_payment_method, status, payment_confirmation_email_sent, due_date, view_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
                      [invoice.invoice_number, invoice.qb_number, invoice.invoice_name, generateHash(), newTakeoffId, invoice.total, invoice.invoice_payment_method, invoice.status, invoice.payment_confirmation_email_sent, invoice.due_date, invoice.view_count],
                      function (err, result) {
                        if (err) {
                          console.log(err);
                          return callback(err);
                        }
                        const newInvoiceId = result.insertId;

                        // copy the invoice_items
                        con.query("SELECT * FROM invoice_items WHERE invoice_id = ?;", [invoice.id], function (err, invoice_items) {
                          if (err) {
                            console.log(err);
                            return callback(err);
                          }

                          for (const item of invoice_items) {
                            con.query(
                              "INSERT INTO invoice_items (invoice_id, description, quantity, cost) VALUES (?, ?, ?, ?);",
                              [newInvoiceId, item.description, item.quantity, item.cost],
                              function (err) {
                                if (err) {
                                  console.log(err);
                                  return callback(err);
                                }
                              }
                            );
                          }
                        });
                      }
                    );
                  }
                });
              });
            }
          );
        });
      }
    );
  });

  callback(null);
}



async function copyEstimateItemData(table, estimate_items, con) {
  for (const item of estimate_items) {
    const [records] = await con.query(`SELECT * FROM ${table} WHERE estimate_item_id = ?`, [item.id]);
    if (records.length > 0) {
      const values = records.map(record => {
        const { id, estimate_item_id, ...rest } = record; // Exclude ID
        return [item.new_estimate_item_id, ...Object.values(rest)];
      });

      const columns = Object.keys(records[0]).filter(col => col !== "id" && col !== "estimate_item_id");

      await con.query(
        `INSERT INTO ${table} (estimate_item_id, ${columns.join(", ")}) VALUES ?`,
        [values]
      );
    }
  }
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

  getUserById: (id, cb) => {
    con.query("SELECT * FROM users WHERE id = ?;", [id], (err, rows) => {
      if (!err && rows !== undefined && rows.length > 0) {
        // callback on retrieved profile
        cb(err, rows[0]);
      } else {
        cb(err || "Failed to find a user with the given id.");
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
    con.query(
        "SELECT *, takeoffs.id as id, customers.id as customer_id, estimates.id AS estimate_id FROM takeoffs JOIN customers ON takeoffs.customer_id = customers.id LEFT JOIN estimates on takeoffs.estimate_id = estimates.id WHERE takeoffs.isArchived = 0;",
        function (err, takeoffs) {
            if (err) return callback(err);
            
            let modifiedTakeoffs = [];
            let totalTakeoffs = takeoffs.length;
            let completedQueries = 0;
            
            //console.log(takeoffs[0]);
            for (let i = 0; i < totalTakeoffs; i++) {
                let takeoff = takeoffs[i];
                takeoff.total_due = 0;
                
                let invoiceQuery = `SELECT COALESCE(SUM(total), 0) AS total FROM invoices WHERE takeoff_id = ${takeoff.id};`;
                let changeOrdersQuery = `SELECT COALESCE(SUM(change_order_total), 0) AS total FROM change_orders WHERE takeoff_id = ${takeoff.id};`;
                let paymentHistoryQuery = `SELECT COALESCE(SUM(amount), 0) AS total FROM payment_history WHERE takeoff_id = ${takeoff.id};`;
                
                con.query(invoiceQuery, function (err, invoices) {
                    if (err) return callback(err);
                    let invoiceTotal = parseFloat(invoices[0].total);
                    
                    con.query(changeOrdersQuery, function (err, changeOrders) {
                        if (err) return callback(err);
                        let changeOrdersTotal = parseFloat(changeOrders[0].total);
                        
                        con.query(paymentHistoryQuery, function (err, paymentHistory) {
                            if (err) return callback(err);
                            let paymentHistoryTotal = parseFloat(paymentHistory[0].total);
                            
                            takeoff.total_due = invoiceTotal + changeOrdersTotal - paymentHistoryTotal;
                            // console.log("paymentHistoryTotal", paymentHistoryTotal);
                            // console.log("invoiceTotal", invoiceTotal);
                            // console.log("changeOrdersTotal", changeOrdersTotal);
                            // console.log("takeoff.total_due", takeoff.total_due);
                            modifiedTakeoffs.push(takeoff);
                            completedQueries++;
                            
                            if (completedQueries === totalTakeoffs) {
                                callback(null, modifiedTakeoffs);
                            }
                        });
                    });
                });
            }

            // if there are no takeoffs, return an empty array
            if (totalTakeoffs === 0) {
                callback(null, []);
            }
            
        }
    );
},


  // loads results with is an array with the headers into the table subjects in the database

  loadTakeoffData: function (takeoff_id, results, headers, cb) {


    //console.log("the headers of the csv are: ",headers);
    for (var i = 0; i < results.length; i++) {
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
        console.log("missing the date column");
        dateIndex = headers.indexOf("date");
      } else {
        results[i][dateIndex] = moment(results[i][2]).format("YYYY-MM-DD HH:mm:ss");

      }

      var subjectIndex = headers.indexOf("Subject");
      if (subjectIndex === -1) {
        subjectIndex = headers.indexOf("subject");
        console.log("missing subject column")
        if (subjectIndex === -1){
          console.log("Error: could not find subject column in the csv file");
          return cb("Error: could not find subject column in the csv file");
        }
      }
      var subject = results[i][subjectIndex];
      
      var pageLabelIndex = headers.indexOf("Page Label");
      if (pageLabelIndex === -1) {
        pageLabelIndex = headers.indexOf("page label");
      }
      var pageLabel = results[i][pageLabelIndex];

      var colorRef = headers.indexOf("Color");
      if (colorRef === -1) {
        colorRef = headers.indexOf("color");
      }
      var color = results[i][colorRef];

      var topCoatIndex = headers.indexOf("Top Coat");
      if (topCoatIndex === -1) {
        topCoatIndex = headers.indexOf("top coat");
      }
      var topCoat = results[i][topCoatIndex];

      var primerIndex = headers.indexOf("Primer");
      if (primerIndex === -1) {
        primerIndex = headers.indexOf("primer");
      }
      var primer = results[i][primerIndex];


      var mesurementIndex = headers.indexOf("Measurement");
      if (mesurementIndex === -1) {
        mesurementIndex = headers.indexOf("measurement");
      }

      var measurementUnitIndex = headers.indexOf("Measurement Unit");
      if (measurementUnitIndex === -1) {
        measurementUnitIndex = headers.indexOf("measurement unit");
      }

      var wallAreaIndex = headers.indexOf("Wall Area");
      if (wallAreaIndex === -1) {
        wallAreaIndex = headers.indexOf("wall area");
      }

      var wallAreaUnitIndex = headers.indexOf("Wall Area Unit");
      if (wallAreaUnitIndex === -1) {
        wallAreaUnitIndex = headers.indexOf("wall area unit");
      }

      var measurement = parseFloat(results[i][mesurementIndex]);
      var measurementUnit = results[i][measurementUnitIndex];

      var wallArea = parseFloat(results[i][wallAreaIndex]);
      var wallAreaUnit = parseFloat(results[i][wallAreaUnitIndex]);

      if (parseFloat(wallArea) !== 0) { // if the wall area is not zero, use the wall area and wall area unit
        measurement = parseFloat(results[i][wallAreaIndex]);
        measurementUnit = results[i][wallAreaUnitIndex];

        // if also linear ft, warn the user that the measurement is in linear ft
        if (measurementUnit === "ft' in") {
          console.log("the original measurement unit is in sqft ")
          measurementUnit = "sqft";
        }
      }

      // if top_coat or primer is not a number, set it to zero
      if (isNaN(parseFloat(topCoat))) {
        topCoat = 0;
      }
      if (isNaN(parseFloat(primer))) {
        primer = 0;
      }
      if (subject && subject.toLowerCase().includes("note")) {
        continue;
      }

      con.query(
        "INSERT INTO subjects (takeoff_id, subject, page_label, color, measurement, measurement_unit, top_coat, primer) VALUES (?,?,?,?,?,?,?,?);",
        [
          takeoff_id,
          subject,
          pageLabel,
          color,
          parseFloat(measurement),
          measurementUnit,
          parseFloat(topCoat),
          parseFloat(primer),
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
    // setTimeout(() => {
    //   cb(null);
    // }, 2000);
    cb(null);

  },

  createNewTakeoff: function (req, res, cb) {
    let lastInsertId;
    const type = req.body.type ? 'commercial' : 'residential';
    con.query(
      "INSERT INTO takeoffs (creator_id, name, type, hash) VALUES (?, ?, ?, ?); SELECT LAST_INSERT_ID() as last;",
      [req.user.local.id, req.body.takeoffName, type, generateHash().toString()],
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

    // insert new blank customer into the customers table
    con.query(
      "INSERT INTO customers (givenName) VALUES (?); SELECT LAST_INSERT_ID() as last;",
      ["New Customer"],
      function (err, result) {
        if (err) {
          return cb(err);
        }
        console.log("created customer", result[1][0].last);
        let lastInsertId = result[1][0].last;
        // insert new blank takeoff into the takeoffs table
        con.query(
          "INSERT INTO takeoffs (creator_id, name, hash, isAlTakeoff, customer_id) VALUES (?, ?, ?, ?, ?); SELECT LAST_INSERT_ID() as last;",
          [req.user.local.id, "New Takeoff", generateHash().toString(), true, result[1][0].last],
          function (err, result) {
            if (err) {
              return cb(err);
            }
            console.log("created takeoff", result[1][0].last);
            con.query("INSERT INTO customer_takeoffs (customer_id, takeoff_id) VALUES (?, ?);", [lastInsertId, result[1][0].last], function (err) {
              if (err) {
                console.log(err);
                return cb(err);
              }

              // insert a blank estimate, get its id and update the takeoffs table set estimate_id where id = new takeoff id
              con.query("INSERT INTO estimates (takeoff_id) VALUES (?); SELECT LAST_INSERT_ID() as last;", [result[1][0].last], function (err, estimateResult) {
                if (err) {
                  console.log(err);
                  return cb(err);
                }

                console.log("created estimate", estimateResult[1][0].last);

                con.query("UPDATE takeoffs SET estimate_id = ? WHERE id = ?;", [estimateResult[1][0].last, result[1][0].last], function (err) {
                  if (err) {
                    console.log(err);
                    return cb(err);
                  }
                  cb(null, result[1][0].last);

                });
              });

            });
          }
        );
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

      con.query("UPDATE takeoffs SET isArchived = 1 where id = ?;", [takeoff_id], function (err) {
        if (err) return callback(err);
        callback(null);
      });
    });
  },

  // marks the takeoff isArchived as 1
  // creates a new takeoff in its place with the same data but status = 1

  // sets the new takeoff hash to old takeoff hash
  // sets the old takeoff hash to null


  copyTakeoff: function (takeoff_id, user_id, callback) {
    // call the copyTakeoff function
    copyTakeoff(takeoff_id, callback);
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
        [takeoff_id, subject.name, subject.measurement, subject.measurement_unit, subject.labor_cost, 0, 0],
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

  // uses levenstein distance to match the material names to the subject names
  // if the material name is not found, ie distance > 1, then disregard
  // if the material name is found, then update the applied_materials table with the material_id
  matchSubjectsToMaterial: function (takeoff_id, callback) {
    con.query("SELECT * FROM applied_materials WHERE takeoff_id = ?;", [takeoff_id], function (err, subjects) {
      if (err) {
        console.log(err);
        return callback(err);
      }
      for (let i = 0; i < subjects.length; i++) {
        matchSubjectStrings(subjects[i].id, takeoff_id, function (err) {
          if (err) {
            console.log(err);
            return callback(err);
          } else {
            callback(null);
          }
        });
      }
      callback(null);
    });
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
            if (err) {
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

  getTakeoffNotes: function (id, callback) {
    // the id is applied_materials.id
    con.query(
      "SELECT notes FROM applied_materials WHERE id = ?;",
      [id],
      function (err, notes) {
        if (err) return callback(err);
        callback(null, notes);
      }
    );
  },


  saveTakeoffNotes: function (id, notes, callback) {
    con.query(
      "UPDATE applied_materials SET notes = ? WHERE id = ?;",
      [notes, id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  archiveTakeoff: function (takeoff_id, callback) {
    con.query("UPDATE takeoffs SET isArchived = 1 WHERE id = ?;", [takeoff_id], function (err) {
      if (err) return callback(err);
      callback(null);
    }
    );
  },

  updateTakeoffTotal: function (takeoff_id, total, materialTotal, laborTotal, callback) {
    con.query(
      "UPDATE takeoffs SET total = ?, material_cost = ?, labor_cost = ? WHERE id = ?;",
      [total, materialTotal, laborTotal, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeLaborRate: function (takeoff_id, labor_rate, callback) {
    console.log("change labor rate: ", labor_rate);
    con.query(
      "UPDATE takeoffs SET labor_rate = ? WHERE id = ?;",
      [labor_rate, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeLaborMarkup: function (takeoff_id, labor_markup, callback) {
    console.log("change labor markup: ", labor_markup);
    con.query(
      "UPDATE takeoffs SET labor_markup = ? WHERE id = ?;",
      [labor_markup, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeMaterialMarkup: function (takeoff_id, material_markup, callback) {
    console.log("change material markup: ", material_markup);
    con.query(
      "UPDATE takeoffs SET material_markup = ? WHERE id = ?;",
      [material_markup, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeSupervisorMarkup: function (takeoff_id, supervisor_markup, callback) {
    console.log("change supervisor markup: ", supervisor_markup);

    con.query(
      "UPDATE takeoffs SET supervisor_markup = ? WHERE id = ?;",
      [parseFloat(supervisor_markup).toFixed(2), takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeTravelCost: function (takeoff_id, travel_cost, callback) {
    console.log("change travel cost: ", travel_cost);
    con.query(
      "UPDATE takeoffs SET travel_cost = ? WHERE id = ?;",
      [travel_cost, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeTouchupsCost: function (takeoff_id, touchups_cost, callback) {
    console.log("change touchups cost: ", touchups_cost);
    con.query(
      "UPDATE takeoffs SET touchups_cost = ? WHERE id = ?;",
      [touchups_cost, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeMiscMaterialCost: function (takeoff_id, misc_material_cost, callback) {
    console.log("change misc material cost: ", misc_material_cost);
    con.query(
      "UPDATE takeoffs SET misc_materials_cost = ? WHERE id = ?;", [misc_material_cost, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeProfit: function (takeoff_id, profit, callback) {
    console.log("change profit: ", profit);
    con.query(
      "UPDATE takeoffs SET profit = ? WHERE id = ?;",
      [profit, takeoff_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  changeTax: function(takeoff_id, tax, callback) {
    console.log("change tax: ", tax);
    con.query(
      "UPDATE takeoffs SET tax = ? WHERE id = ?;",
      [tax, takeoff_id],
      function(err) {
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

  getChangeOrdersByTakeoffId: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM change_orders WHERE takeoff_id = ?; ",
      [takeoff_id],
      function (err, changeOrders) {
        if (err) return callback(err);
        console.log(changeOrders);
        callback(null, changeOrders);
      }
    );
  },

  getChangeOrderById: function (change_order_id, callback) {
    con.query(
      `SELECT change_orders.*, customers.primary_email_address AS owner_email 
       FROM change_orders 
       JOIN takeoffs ON change_orders.takeoff_id = takeoffs.id 
       JOIN customers ON takeoffs.customer_id = customers.id 
       WHERE change_orders.id = ?;`,
      [change_order_id],
      function (err, changeOrder) {
      if (err) return callback(err);
      callback(null, changeOrder[0]);
      }
    );
  },

  getChangeOrderByTakeoffId: function (takeoff_id, callback) {
    con.query(
      "SELECT * FROM change_orders WHERE takeoff_id = ?; ",
      [takeoff_id],
      function (err, changeOrders) {
        if (err) return callback(err);
        console.log(changeOrders);
        callback(null, changeOrders);
      }
    );
  },

      // change order is invoicable if it is marked as require_client_approval = false, or status > 0; 
  getInvoicableChangeOrdersByTakeoffId: function (takeoff_id, callback) {
    con.query(
      `SELECT * FROM change_orders 
       WHERE takeoff_id = ? 
       AND (require_client_approval = 0 OR status > 0); `,
      [takeoff_id],
      function (err, changeOrders) {
        if (err) return callback(err);
        console.log(changeOrders);
        callback(null, changeOrders);
      }
    );
  },



getChangeOrderItemsById: function (change_order_id, callback) {
    con.query(
      "SELECT * FROM change_order_items WHERE change_order_id = ?; ",
      [change_order_id],
      function (err, changeOrderItems) {
        if (err) return callback(err);
        console.log(changeOrderItems);

        //  for each change order item, set the total if it is not already set

        for (let i = 0; i < changeOrderItems.length; i++) {
          let changeOrderItem = changeOrderItems[i];
          if (changeOrderItem.total === null) {
            changeOrderItem.total = changeOrderItem.quantity * changeOrderItem.cost;
          }
        }

        callback(null, changeOrderItems);
      }
    );
  },


  // get change order and then change_order_items by hash
  getSharedChangeOrder: function (hash, callback) {
      con.query(
        `SELECT * FROM change_orders WHERE hash = ?; `,
        [hash],
        function (err, changeOrder) {
          if (err || changeOrder.length == 0) return callback(err);
          console.log(changeOrder);
          con.query(
            `SELECT * FROM change_order_items WHERE change_order_id = ?; `,
            [changeOrder[0].id],
            function (err, changeOrderItems) {
              if (err) return callback(err);

              // for each change order item set the total if it is not already set and set the cardinal number
              for (let i = 0; i < changeOrderItems.length; i++) {
                let changeOrderItem = changeOrderItems[i];
                changeOrderItem.total = changeOrderItem.quantity * changeOrderItem.cost;
                changeOrderItem.total = parseFloat(changeOrderItem.total).toFixed(2)

                changeOrderItem.number = i + 1;
              }


              console.log(changeOrderItems);
              callback(null, changeOrder, changeOrderItems);
            }
          );
        }
      );
    },

    updateChangeOrderStatus: function (change_order_id, status, callback) {
      con.query(
        "UPDATE change_orders SET status = ? WHERE id = ?;",
        [status, change_order_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    },


  // this function is used to create a new change order
  // request is an object:
  // request = {
  //   customerName: 'Test McTest',
  //   customerAddress: '3141 Burnley Station Road, Barboursville, VA 22923',
  //   description: 'Test desc',
  //   itemDescription: [ 'Test one', 'Test Two' ],
  //   quantity: [ '3', '2' ],
  //   cost: [ '100', '200' ],
  //   materialTotal: '300.00',
  //   laborTotal: '400.00',
  //   clientAgreement: 'on'
  // }
  createChangeOrder: function (request, callback) {
    let {
      takeoff_id,
      customerName,
      description,
      itemDescription,
      quantity,
      cost,
      changeOrderTotal,
      clientAgreement
    } = request;




    // CREATE TABLE change_orders (
    //   id INT NOT NULL AUTO_INCREMENT,
    //   takeoff_id INT NOT NULL,
    //   name VARCHAR(64),
    //   description TEXT,
    //   qb_number INT,
    //   co_number INT,
    //   hash VARCHAR(64),
    //   -- 0 unpaid, 1 paid, 2 due, 
    //   status TINYINT(1) DEFAULT 0,
    //   -- client-agreement 0 not approved, 1 approved
    //   co_approved TINYINT DEFAULT 0,
    //   change_order_total DECIMAL(10,2),
    //   payment_confirmation_email_sent TINYINT(1) DEFAULT 0,
    //   due_date TIMESTAMP,
    //   last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //   view_count INT DEFAULT 0,
    //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //   PRIMARY KEY (id),
    //   FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE
    // );
    // Insert the change order into the change_orders table
    let status = 0;


    clientAgreement = clientAgreement === "on" ? 1 : 0;

    if (clientAgreement) {
      status = 0;
    } else {
      status = 2;
    }

    con.query(
      "INSERT INTO change_orders (takeoff_id, name, status, description, qb_number, co_number, hash, change_order_total, require_client_approval ) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?); SELECT LAST_INSERT_ID() as last;", 
      [takeoff_id, customerName, status, description, null, Math.floor(Math.random() * 1000000), generateHash(), parseFloat(changeOrderTotal), clientAgreement],
      function (err, result) {
      if (err) {
        console.log(err);
        return callback(err);
      }

      const changeOrderId = result[1][0].last;

      // Insert each item into the change_order_items table
      const items = itemDescription.map((desc, index) => [
        changeOrderId,
        desc,
        quantity[index],
        cost[index]
      ]);

      con.query(
        "INSERT INTO change_order_items (change_order_id, description, quantity, cost) VALUES ?;",
        [items],
        function (err) {
        if (err) {
          console.log(err);
          return callback(err);
        }
        callback(null, changeOrderId);
        }
      );
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




  separateAlts: function (takeoff_id, callback) {
    console.log("separateAlts called");
    // get the applied materials for the takeoff_id
    con.query(
      "SELECT *, applied_materials.name as subject, applied_materials.labor_cost as applied_materials_labor_cost  FROM applied_materials  JOIN materials ON materials.id = applied_materials.material_id  WHERE applied_materials.takeoff_id = ?;", // weird query, just alternate name for shared 'name' and 'labor_cost' columns
      [takeoff_id],
      function (err, subjects) {
        if (err) return callback(err);
        // for each subject, if the name contains "alt" or "alternate" or "option", 
        // insert a new row into the applied_materials table with the same values as the original row
        // except the name is the original name + " alt" + n
        // where n is the number of alts for that subject

        let groupMaterialTotals = {};
        let groupLaborTotals = {};
        let groupNames = {};

        for (let i = 0; i < subjects.length; i++) {
          const subject = subjects[i];
          if (
            subject.subject.toLowerCase().includes("alt") ||
            subject.subject.toLowerCase().includes("alternate") ||
            subject.subject.toLowerCase().includes("option")
          ) {
            console.log(subject.subject);
            // use map to subject name is of the form "alt <group number> <subject name>"
            let group_number = subject.subject.split(" ")[1];
            let subject_name = subject.subject.split(" ").slice(2).join(" ");

            console.log("The group number is: ", group_number);
            console.log("The subject name is: ", subject_name);


            console.log(subject)

            let optionMaterialTotal = (parseFloat(subject.measurement) / parseFloat(subject.coverage)) * (parseFloat(subject.cost) - parseFloat(subject.cost_delta)) | 0;
            let optionLaborTotal = (parseFloat(subject.measurement) * parseFloat(subject.applied_materials_labor_cost) | 0);

            console.log("the optionMaterialTotal is: ", optionMaterialTotal);
            console.log("the optionLaborTotal is: ", optionLaborTotal);

            if (groupMaterialTotals[group_number] == null) {
              groupMaterialTotals[group_number] = optionMaterialTotal;
            } else {
              groupMaterialTotals[group_number] = groupMaterialTotals[group_number] + optionMaterialTotal;
            }

            if (groupLaborTotals[group_number] == null) {
              groupLaborTotals[group_number] = optionLaborTotal;
            } else {
              groupLaborTotals[group_number] = groupLaborTotals[group_number] + optionLaborTotal;
            } 

            if (groupNames[group_number] == null) {
              groupNames[group_number] = subject_name;
            } else {
              console.log(groupNames);
            }
          }
        }



        for (group_number in groupNames) {
          console.log("The group name is: ", groupNames[group_number]);
          console.log("The group number is: ", group_number);
          console.log("The total Labor cost for this group is: ", groupLaborTotals[group_number]);
          console.log("The total Material cost for this group is: ", groupMaterialTotals[group_number]);

          let optionTotal = groupMaterialTotals[group_number] + groupLaborTotals[group_number];
          console.log("The total for this option is", optionTotal);

          con.query(
            "INSERT INTO options (takeoff_id, description, material_cost, labor_cost, total_cost) VALUES (?, ?, ?, ?, ?);",
            [
              takeoff_id,
              groupNames[group_number],
              groupMaterialTotals[group_number],
              groupLaborTotals[group_number],
              optionTotal
            ],
            function (err) {
              console.log(err);
              // if (err) return callback(err);
            }
          );
        }

      }
    );
    callback(null);
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
        //console.log(estimate_id);

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
                  "SELECT * FROM materials WHERE id = ?;",
                  [
                    row.material_id,

                  ],
                  function (err, material) {
                    if (err) return reject(err);

                    // Add material names to the row
                    row.selected_materials = material;
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
        if (err) {
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
          //(customerInfo[0]);
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

  checkForExpiredEstimates: function (callback) {
    let expritationDate = new Date();
    // add 60 days to the expritationDate 
    expritationDate.setDate(expritationDate.getDate() - 30);
    console.log("expritationDate: ", expritationDate);
    // status < 4 means the estimate has not been signed
    con.query("SELECT * FROM estimates join takeoffs on estimates.takeoff_id = takeoffs.id where estimates.date_last_shared < ?  AND takeoffs.status < 4 ", [expritationDate], function (err, estimates) {
      if (err) return callback(err);
      console.log("expired estimates: ", estimates);
      callback(null, estimates);
    });
  },


  getEstimateById: function (estimate_id, callback) {
    con.query("SELECT * FROM estimates join takeoffs on takeoffs.id = estimates.takeoff_id WHERE estimates.id = ?;", [estimate_id], function (err, estimate) {
      if (err) return callback(err);
      callback(null, estimate[0]);
    }
    );
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
          // console.log(customerInfo[0]);
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
          invoices.qb_number,
          invoices.status as invoice_status
        FROM 
          invoices 
        INNER JOIN 
          takeoffs ON invoices.takeoff_id = takeoffs.id 
        WHERE 
          invoices.invoice_number = ? OR invoices.qb_number = ?;`,
        [invoice_number, invoice_number],
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
      if (total == null) {
        total = 0;
        console.log("customer has not made any payments");
      }

      // get takeoff and join the estimate_id to get the signed_total
      con.query("SELECT * FROM takeoffs join estimates on takeoffs.estimate_id = estimates.id WHERE takeoffs.id = ?;", [takeoff_id], function (err, estimateTakeoffObject) {
        if (err) return callback(err);
        if (!estimateTakeoffObject || estimateTakeoffObject.length === 0 || !total || total.length === 0) {
          return callback(new Error("Invalid data retrieved"));
        }
        // console.log("got signed_total: ", (parseFloat(estimateTakeoffObject[0].signed_total) - parseFloat(total[0].total)).toFixed(2));
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

    // get the takeoff and use estimate_id to update estimate.date_last_shared to now()

    con.query("SELECT * FROM takeoffs WHERE id = ?;", [takeoff_id], function (err, takeoff) {
      if (err) return callback(err);
      con.query(
        "UPDATE estimates SET date_last_shared = NOW() WHERE id = ?;",
        [takeoff[0].estimate_id],
        function (err) {
          if (err) return callback(err);
        }
      );
    }
    );
  },

  setInclusionsExclusions: function (takeoff_id, inclusions, exclusions, callback) {
    con.query("SELECT * FROM takeoffs WHERE id = ?;", [takeoff_id], function (err, takeoff) {
      if (err) return callback(err);
      if (takeoff.length == 0) {
        return callback("Takeoff not found");
      }
      con.query(
        "UPDATE estimates SET inclusions = ?, exclusions = ? WHERE id = ?;",
        [inclusions, exclusions, takeoff[0].estimate_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
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
      con.query('SELECT estimate_id FROM takeoffs WHERE id = ?;', [takeoff_id], function (err, estimate_id) {
        estimate_id = estimate_id[0].estimate_id;
        if (estimate_id == null || err) {
          console.log(err);
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
    // get the material tax rate for that takeoff
    con.query('SELECT tax from takeoffs WHERE id = ?;', [takeoff_id], function (err, tax) {
      if (err) return callback(err);

      let taxRate = tax[0].tax;
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

            let materialOptionsTotal = 0;

              for (let i = 0; i < options.length; i++) {
                if (options[i].applied){
                  materialOptionsTotal += options[i].material_cost;

                }
              }

              // compute the selected options material tax
              let materialTax = materialOptionsTotal * (taxRate/100.00);
            
            // if the status is 4, the takeoff is signed and the options should be locked
            if (status[0].status == 4) {

              // compute the selected options material tax
              // the material_cost has already been taxed 5.3% so do the math to get the tax alone

              
             
              return callback(null, options, false, materialTax); // the third parameter is a boolean that indicates whether the options are mutable
            } else {
              return callback(null, options, true, materialTax);
            }
          }
        );
      }
    );
    });
  },

  getTerms: function (callback) {
    // query the settings table for the terms
    con.query("SELECT setting_value FROM system_settings WHERE setting_name = 'terms';", function (err, terms) {
      if (err) return callback(err);
      callback(null, terms[0].setting_value);
    }
    );
  },

  addOption: function (takeoff_id, description, material_cost, labor_cost, isRequired, callback) {
    // first check if the row_id is null, if it is, insert a new row
    // if it is not, update the existing row

    // if row exists but is now blank, delete the row
    if (description == "" || material_cost == null || labor_cost == null) {
      callback("Option or cost_delta is blank");
    } else {

      // add 5.3% to the material cost
      material_cost = parseFloat(material_cost) * 1.053;
      let optionTotal = parseFloat(material_cost) + parseFloat(labor_cost);

      con.query(
        "INSERT INTO options (takeoff_id, description, material_cost, labor_cost, required, total_cost) VALUES (?,?,?,?,?,?); SELECT LAST_INSERT_ID() as last;",
        [takeoff_id, description, material_cost, labor_cost, isRequired, optionTotal],
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
      con.query('SELECT status FROM takeoffs WHERE id = ?;', [option[0].takeoff_id], function (err, status) {
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

  addMaterial: function (name, desc, cost, laborCost, datasheet, coverage, type, callback) {
    type = parseInt(type);
    if (type == 0 || type == null || isNaN(type)) {
      type = 6; // the default for paint
    }
    con.query(
      "INSERT INTO materials (name, description, cost, labor_cost, datasheet, coverage, material_type) VALUES (?,?,?,?,?,?,?);",
      [name, desc, cost, laborCost, datasheet, coverage, type],
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
            if (err) {
              console.log(err);
              return callback(err);
            }
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

        const takeoff = takeoffResults[0]; // assuming only one result

        // if the takeoff is signed, throw error
        console.log("takeoff status: ", takeoff);
        if (takeoff.takeoff_status == 4) {
          return callback(new Error("This estimate has already been signed"));
        }

        //format the takeoff_start_date
        takeoff.takeoff_start_date = moment(takeoff.takeoff_start_date).format("YYYY-MM-DD");


        // console.log("getting shared takeoff:", takeoff);

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

    let start = moment(startDate).format("YYYY-MM-DD");

    // is the date within 5 days of today
    let today = moment().format("YYYY-MM-DD");
    let diff = moment(start).diff(today, 'days');
    if (diff > 5) {

      con.query(
        "UPDATE takeoffs SET start_date = ? WHERE id = ?;",
        [start, takeoff_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    } else {
      callback("Start date must be at least 5 days in the future");
    }
  },

  // renewEstimate: function (takeoff_id, callback) {
  //   con.query(
  //     "UPDATE takeoffs SET status = 6 WHERE id = ?;", // 6 for staged for renewal
  //     [takeoff_id],
  //     function (err) {
  //       if (err) return callback(err);
  //       callback(null);
  //     }
  //   );
  // },

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
    con.query('SELECT customer_id FROM takeoffs WHERE id = ?;', [takeoff_id], function (err, results) {
      if (err) return callback(err);
      //console.log("updating phone number for customer_id: ", results[0].customer_id); 
      con.query("UPDATE customers SET phone = ? WHERE id = ?;", [phone, results[0].customer_id], function (err) {
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
              "UPDATE takeoffs SET signed_at = NOW() WHERE id = ?;",
              [takeoff_id],
              function (err) {
                if (err) return callback(err);
                //callback(true, null);
              }
            );

            // create an invoice for 20% of the total
            con.query(
              "SELECT * FROM takeoffs WHERE id = ?;",
              [takeoff_id],
              function (err, takeoff) {
                if (err) return callback(err);
                let invoiceTotal = parseFloat(takeoff[0].total) * 0.2;
                let invoiceNumber = Math.floor(Math.random() * 1000000000);

                con.query("SELECT SUM(total_cost) as total from options where takeoff_id = ? OR required = 1;", [takeoff_id], function (err, total) {
                  if (err) return callback(err);
                  //console.log("total: ", total[0].total);
                  if (total[0].total != null) {
                    invoiceTotal += (parseFloat(total[0].total) * 0.2);
                  }


                  con.query(
                    "INSERT INTO invoices (takeoff_id, total, invoice_number, hash) VALUES (?,?,?,?); SELECT LAST_INSERT_ID() as last;",
                    [takeoff_id, invoiceTotal, invoiceNumber, generateHash()],
                    function (err, results) {
                      if (err) return callback(err);
                      console.log(results);
                      let invoice_id = results[1][0].last;
                      console.log("invoice id in update sig", invoice_id);
                      // insert into invoice_items
                      con.query(
                        "INSERT INTO invoice_items (invoice_id, cost, quantity, description) VALUES (?,?,?,?);",
                        [invoice_id, invoiceTotal, 1, "Initial Deposit"],
                        function (err) {
                          if (err) {
                            console.log(err);
                            return callback(err);
                          }
                          // return the invoice_id
                          console.log(`passing new invoice id ${invoice_id}`);
                          callback(true, invoice_id, null);
                        });




                    });

                });

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
    con.query("SELECT estimate_id FROM takeoffs WHERE id = ?;", [takeoff_id], function (err, estimate_id) {
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
        if (err || subjects.length == 0) return callback(err);

        // Get labor_cost setting
        con.query(
          "SELECT setting_value FROM system_settings WHERE setting_name = 'default_labor_cost';",
          function (err, default_labor_cost) {
            if (err) return callback(err);
            console.log(subjects[0]);
            for (var i = 0; i < subjects.length; i++) {
              // Insert into applied_materials
              let currentSubject = subjects[i].subject;
              let currentSubjectId = subjects[i].id;

              // if (currentSubject == null) {
              //   continue;
              // }

             //if the current subject contains "notes" or note, skip it
              // if (currentSubject && (currentSubject.toLowerCase().includes("note")) || currentSubject.toLowerCase().includes("notes")) {
              //   console.log()
              //   continue;
              // }
              console.log("Inserted subject: ", currentSubject);
              con.query(
                "INSERT INTO applied_materials (takeoff_id, name, measurement, measurement_unit, color, labor_cost, top_coat, primer) VALUES (?, ?, ?, ?, ?, ?, ?, ?); SELECT LAST_INSERT_ID() as last;",
                [
                  takeoff_id,
                  subjects[i].subject,
                  subjects[i].total_measurement,
                  subjects[i].measurement_unit,
                  subjects[i].color,
                  default_labor_cost[0].setting_value,
                  subjects[i].top_coat || 0,
                  subjects[i].primer || 0,
                ],
                function (err, results) {
                  if (err) {
                    console.log(err);
                  } else {
                      //åmatchSubjectStrings(results[1][0].last, takeoff_id);
                  }
                }
              );
            }
            // applySubjectNamingRules(takeoff_id, function (err) {
            //   if (err) return callback(err);
            //   callback(null);
            // });

            //sleep for 1 second to allow the database to update
            // setTimeout(function () {
            //   callback(null);
            // }, 2000);
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

  setAppliedMaterialState: function (applied_material_id, state, callback) {
    con.query(
      "UPDATE applied_materials SET applied = ? WHERE id = ?;",
      [state, applied_material_id],
      function (err) {
        if (err) {
          console.log(err);
          return callback(err);
        }
        callback(null);
      }
    );
  },


  separateLineItem: function (takeoff_id, applied_material_id, callback) {
    // get the applied_materials row
    // insert the name into the options table with a default cost of 0
    // set the applied_material_id to null
    con.query("SELECT *, applied_materials.name as subject, applied_materials.labor_cost as applied_materials_labor_cost  FROM applied_materials  JOIN materials ON materials.id = applied_materials.material_id  WHERE applied_materials.id = ?;", [applied_material_id], function (err, result) {
      if (err) {
        console.log(err);
        return callback(err);
      }
      if (result.length == 0) {
        console.log("Material not found");
        return callback("Material not found");
      }

      let material = result[0];
      console.log("material: ", material);
      let materialLaborCost = material.applied_materials_labor_cost;
      let materialCost = material.measurement / material.coverage * (material.cost - material.cost_delta);
      console.log("materialCost: ", materialCost);
      console.log("materialLaborCost: ", materialLaborCost);

      con.query("INSERT INTO options (takeoff_id, description, cost) VALUES (?,?,?); SELECT LAST_INSERT_ID() as last;", [takeoff_id, material.subject, 0], function (err, last) {
        if (err) {
          console.log(err);
          return callback(err);
        }
        con.query("DELETE FROM applied_materials where id = ? limit 1;", [applied_material_id], function (err) {
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

  changeMaterialPrice: function (takeoff_id, material_id, price, callback) {
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
              con.query("UPDATE applied_materials SET cost_delta = 0 WHERE id = ?;", [subject_id], function (err) {
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

  getTakeoffByCustomerID: function (customer_id, callback) {
    con.query(
      queries.getTakeoffByCustomerID,
      [customer_id],
      function (err, takeoff) {
        if (err) return callback(err);
        callback(null, takeoff[0]);
      }
    );
  }
  ,

  //    db.getTakeoffTotal(takeoff_id, function (err, takeoff, total) {
  // get the raw pretax total excluding options
  getTakeoffTotal: function (takeoff_id, callback) {
    con.query(
      "SELECT total, name FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, rows) {
        if (err) return callback(err);
        if (rows[0] != null && rows[0].total != null && rows[0].name != null) {
          // console.log(rows[0]);
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
        //   console.log(rows);
        if (err) return callback(err);
        if (rows[0] != null && rows[0].signed_total != null && rows[0].name != null) {

          // get the option total
          con

          //      console.log(rows[0]);
          let tax = parseFloat(rows[0].tax);
          let estimateTotal = parseFloat(rows[0].signed_total);
          let method = rows[0].payment_method;

          // console.log("estimateTotal: ", estimateTotal);
          // console.log("tax: ", tax);
          // console.log("method: ", method);

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


  getInvoiceById: function (invoice_id, callback) {
    con.query(
      queries.getinvoiceById,
      [invoice_id],
      function (err, invoice) {
        if (err) return callback(err);
        callback(null, invoice[0]);
      }
    );
  },

  getInvoiceItemsById: function (invoice_id, callback) {
    con.query(
      "SELECT * FROM invoices WHERE id = ?;",
      [invoice_id],
      function (err, invoice) {
        con.query("SELECT * FROM invoice_items WHERE invoice_id = ?;", [invoice_id], function (err, items) {
          if (err) return callback(err);
          // add the item total to each row 
          // total = quantity * cost
          for (var i = 0; i < items.length; i++) {
            items[i].total = items[i].quantity * items[i].cost;
            // round to two decimal places
            items[i].total = items[i].total.toFixed(2);
          }
          
          callback(err, invoice[0], items);
        });
      }
    );
  },



  getInvoicesByTakeoffId: function (takeoff_id, callback) {
    con.query("SELECT * FROM invoices WHERE takeoff_id = ?;", [takeoff_id], function (err, invoices) {
      if (err) {
        console.log(err);
        return callback(err);
      }
      callback(null, invoices);
    }
    );
  },

  updateInvoicePaymentMethod: function (invoice_id, payment_method, callback) {
    con.query(
      "UPDATE invoices SET invoice_payment_method = ? WHERE id = ?;",
      [payment_method, invoice_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  // updates the invoice to payment_confirmation_email_sent = true to prevent multiple emails from being sent
  updateInvoicePaymentConfirmationEmailSent: function (invoice_id, callback) {
    con.query(
      "UPDATE invoices SET payment_confirmation_email_sent = 1 WHERE id = ?;",
      [invoice_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },


  // used by client to get the invoice, thus the view is counted
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

        // get the invoice items
        con.query(
          "SELECT * FROM invoice_items WHERE invoice_id = ?;",
          [invoice[0].id],
          function (err, items) {
            if (err) return callback(err);
            //console.log(items);

            // get the takeoff
            con.query(
              "SELECT takeoffs.*, customers.* FROM takeoffs JOIN customers ON takeoffs.customer_id = customers.id WHERE takeoffs.id = ?;",
              [invoice[0].takeoff_id],
              function (err, takeoff) {
              if (err) return callback(err);

              //console.log(takeoff);

              // compute the total amount for the invoice
              let total = 0;
              for (var i = 0; i < items.length; i++) {
                total += items[i].quantity * items[i].cost;
                // also set the rows total
                items[i].total = items[i].quantity * items[i].cost;
              }

              console.log("invoice total: ", total);

              // update the view count
              con.query(
                "UPDATE invoices SET view_count = view_count + 1 WHERE hash = ?;",
                [hash],
                function (err) {
                  if (err) {
                    console.log(err);
                  }
                  callback(null, invoice[0], items, takeoff[0], total);
                }
              );

              }
            );
          }
        );
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
  },

  deleteInvoice: function (invoice_id, callback) {
    con.query(
      "DELETE FROM invoices WHERE id = ?;",
      [invoice_id],
      function (err) {
        if (err) return callback(err);
        callback(null);
      }
    );
  },

  invoicePaid: function (takeoff_id, invoice_id, amount, callback) {
    console.log("invoice paid id: ", invoice_id);
    // get the invoice 
    // check if the takeoff_id matches
    // check if the amount matches
    // check if the invoice is not already paid
    // update the invoice to paid
    // insert the payment into the payment_history table

    con.query(
      "SELECT * FROM invoices WHERE id = ?;",
      [invoice_id],
      function (err, invoice) {
        if (err) return callback(err);
        let invoice_total = invoice[0].total;

        if (invoice.status == 1) {
          return callback("Invoice is already paid");
        }

        con.query(
          "UPDATE invoices SET status = 1 WHERE id = ?;",
          [invoice_id],
          function (err) {
            if (err) return callback(err);
            console.log("invoice", invoice);
            con.query(
              "INSERT INTO payment_history (takeoff_id, invoice_id, amount) VALUES (?,?,?);",
              [takeoff_id, invoice_id, invoice_total],
              function (err) {
                if (err) return callback(err);
                callback(null);
              }
            );
          }
        );
      }
    );
  },


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


/*

sov stuff

*/




createNewSov: function (takeoff_id, callback) {
  // get the previous sov
  // if none exists, the new sov will be initially 0 for the total, and have no items
  // if one exists, get the associated sov_items and copy them onto the new sov
  con.query("SELECT * FROM sov WHERE takeoff_id = ? ORDER BY id DESC LIMIT 1;", [takeoff_id], function (err, sov) {
    if (err) return callback(err);
    if (sov.length == 0) {
      // create a new sov with no items
      console.log('This is the first SOV for this takeoff');
      con.query("INSERT INTO sov (takeoff_id, name, total, hash) VALUES (?,?,?,?); SELECT LAST_INSERT_ID() as last;", [takeoff_id, 'SOV', 0, generateHash()], function (err, results) {
        if (err) return callback(err);
        let sov_id = results[1][0].last;
        console.log("new sov id: ", sov_id);
        callback(null, sov_id);
      });
    } else {
      console.log('This is not the first SOV for this takeoff');
      console.log('the previous sov id: ', sov[0].id);
      // create a new sov with the same items as the previous one
      let previousSovId = sov[0].id;
      con.query("INSERT INTO sov (takeoff_id, name, total, hash) VALUES (?,?,?,?); SELECT LAST_INSERT_ID() as last;", [takeoff_id, 'SOV',0, generateHash()], function (err, results) {
        if (err) return callback(err);
        let sov_id = results[1][0].last;
        console.log("new sov id: ", sov_id);
        // get the items from the previous sov

        let newSovTotal = 0;
        con.query("SELECT * FROM sov_items WHERE sov_id = ?;", [previousSovId], function (err, items) {
          if (err) return callback(err);
          // insert the items into the new sov
          console.log("the previous sov items: ", items);
          for (var i = 0; i < items.length; i++) {
            newSovTotal += parseFloat(items[i].this_invoiced_amount);
            let new_previous_invoiced_amount = parseFloat(items[i].this_invoiced_amount) + parseFloat(items[i].previous_invoiced_amount);
            con.query("INSERT INTO sov_items (sov_id, total_contracted_amount, description, previous_invoiced_amount) VALUES (?,?,?,?);", [sov_id, items[i].total_contracted_amount, items[i].description, new_previous_invoiced_amount], function (err) {
              if (err) return callback(err);
            });
          }
          // update the new sov with the newSovTotal

          con.query("UPDATE sov SET total = ? WHERE id = ?;", [newSovTotal, sov_id], function (err) {
            if (err) return callback(err);
            console.log("new sov total: ", newSovTotal);
            // update the previous sov with the new total

          });

        });
        callback(null, sov_id);
      });
    }
  });
},


getMostRecentSOV: function (takeoff_id, callback) {
  con.query(
    "SELECT * FROM sov WHERE takeoff_id = ? ORDER BY id DESC LIMIT 1;",
    [takeoff_id],
    function (err, sov) {
      if (err) return callback(err);
      if (sov.length == 0) {
        return callback(null, null);
      } else {
        return callback(null, sov[0]);
      }
    }
  );
},
getSOVById: function (sov_id, callback) {
  con.query(
    "SELECT * FROM sov WHERE id = ?;",
    [sov_id],
    function (err, sov) {
      if (err) return callback(err);
      if (sov.length == 0) {
        return callback(null, null);
      } else {
        return callback(null, sov[0]);
      }
    }
  );
},

getSOVItemsById: function (sov_id, callback) {
  con.query(
    "SELECT * FROM sov_items WHERE sov_id = ?;",
    [sov_id],
    function (err, items) {
      if (err) return callback(err);
      if (items.length == 0) {
        return callback(null, null);
      } else {
        return callback(null, items);
      }
    }
  );
},


getSOVHashByTakeoffId: function (takeoff_id, callback) {
  con.query(
    "SELECT hash FROM sov WHERE takeoff_id = ?;",
    [takeoff_id],
    function (err, sov) {
      if (err) return callback(err);
      if (sov.length == 0) {
        return callback(null, null);
      } else {
        return callback(null, sov[0].hash);
      }
    }
  );
},

getSOVHistoryByTakeoffId: function (takeoff_id, callback) {
  con.query(
    "SELECT * FROM sov WHERE takeoff_id = ? ORDER BY id DESC;",
    [takeoff_id],
    function (err, sov) {
      if (err) return callback(err);
      if (sov.length == 0) {
        return callback(null, null);
      } else {
        return callback(null, sov);
      }
    }
  );
},

// used by the view function
getSOVHistoryById: function (sov_id, callback) {
  con.query(
    "SELECT * FROM sov WHERE id = ?;",
    [sov_id],
    function (err, sov) {
      if (err) return callback(err);
      if (sov.length == 0) {
        return callback(null, null);
      } else {
        return callback(null, sov[0]);
      }
    }
  );
},

updateSOVItems: function (sov_id, items, callback) {


  for (var i = 0; i < items.length; i++) {
    if (items[i].id == null) {
      console.log("aaaah! the sov_items id is null");
    } else {
      con.query(
        "UPDATE sov_items SET description = ?, total_contracted_amount = ?, previous_invoiced_amount = ?, this_invoiced_amount = ? WHERE id = ?;",
        [items[i].description, items[i].total_contracted_amount, items[i].previous_invoiced_amount, items[i].this_invoiced_amount, items[i].id],
        function (err) {
          if (err) return callback(err);
        }
      );
    }
  }

  // update the total for the sov
  con.query(
    "SELECT SUM(this_invoiced_amount) as total FROM sov_items WHERE sov_id = ?;",
    [sov_id],
    function (err, results) {
      if (err) return callback(err);
      let total = results[0].total;
      con.query(
        "UPDATE sov SET total = ? WHERE id = ?;",
        [total, sov_id],
        function (err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
  );

},

// add item to sov, and return the id
addSOVItem: function (sov_id, callback) {
  if (sov_id == null || sov_id == NaN) {
    console.log("sov_id is null");
  }
  con.query(
    "INSERT INTO sov_items (sov_id, description) VALUES (?, ''); SELECT LAST_INSERT_ID() as last;",
    [sov_id],
    function (err, results) {
      if (err) return callback(err);
      let id = results[1][0].last;
      callback(null, id);
    }
  );
},

  takeoffGetStatus: function (takeoff_id, callback) {
    if (takeoff_id == null) {
      console.log("takeoffGetStatus got null takeoff_id");
    }
    console.log("Getting status for takeoff_id: ", takeoff_id);
    con.query(
      "SELECT status FROM takeoffs WHERE id = ?;",
      [takeoff_id],
      function (err, results) {
        if (err) {
          console.log(err);
          return callback(err);
        }
        callback(null, results[0].status);
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
        if (currentStatus <= status) {
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
      callback(err,results);
    });
  },
};
