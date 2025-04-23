'use strict';

const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { parse: json2csv } = require('json2csv');
const mid = require('./middleware.js');
const creds = require('./credentials');
const db = require('./database.js');
const { name } = require('ejs');
require('dotenv').config();

function getBidsData(form_id) {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT form_bid.*, jobs.*, subcontractor_jobs_assignment.alloted_bid as bid 
       FROM form_bid 
       JOIN jobs ON form_bid.job_id = jobs.id 
       JOIN subcontractor_jobs_assignment ON form_bid.job_id = subcontractor_jobs_assignment.job_id 
       WHERE form_bid.form_id = ?;`,
      [form_id],
      (err, results) => {
        if (err) {
          console.error(err);
          reject(err);
          return;
        }
        resolve(results);
      }
    );
  });
}

function getTotalRequestedAmount(jobId, userId, callback) {
  db.query(
    "SELECT SUM(form_bid.request) as total_requested FROM form_bid JOIN subcontractor_forms ON form_bid.form_id = subcontractor_forms.form_id WHERE form_bid.job_id = ? AND subcontractor_forms.user_id = ? AND form_bid.status IN ('Approved', 'Pending')",
    [jobId, userId],
    function (error, results) {
      if (error) {
        console.error('Error fetching total requested amount:', error);
        return callback(error);
      }
      const totalRequested = results[0].total_requested || 0;

      // Fetch totalAllotted from subcontractor_jobs_assignment
      db.query(
        "SELECT alloted_bid FROM subcontractor_jobs_assignment WHERE job_id = ? AND user_id = ?",
        [jobId, userId],
        function (error, bidResults) {
          if (error) {
            console.error('Error fetching total allotted amount:', error);
            return callback(error);
          }
          console.log('Total allotted:', bidResults);
          callback(null, totalRequested, bidResults[0].alloted_bid);
        }
      );
    }
  );
}

function getAvailableFunds(userId, jobId, callback) {
  getTotalRequestedAmount(jobId, userId, (err, totalRequested, totalAllotted) => {
    if (err) {
      console.error('Error fetching total requested amount:', err);
      return callback(err);
    }
    console.log('Total requested amount:', totalRequested);
    console.log('Total allotted amount:', totalAllotted);
    const availableFunds = totalAllotted - totalRequested;
    console.log('Available funds:', availableFunds);
    callback(null, availableFunds);
  });
}




module.exports = function (app) {
  // in order to allow subcontractors to NOT use google oauth to fill out the preset form. Forms are created with a hash that is part of the sharable link that is emailed to the subcontractor

  // send a form page 
  // Subcontractor email
  // form preset 
  // notify me when form is submitted

  app.get('/subcontractor', mid.isAuth, mid.isSubcontractor, async (req, res) => {
    console.log(req.user.local.name, "accessing subcontractor page");
    db.query('SELECT * FROM subcontractor_forms JOIN forms ON subcontractor_forms.form_id = forms.id WHERE subcontractor_forms.user_id = ?;', [req.user.local.id], (err, results) => {
      console.log(results);
      if (results == null) {
        res.render('subcontractor.html', { forms: [], defaults: { email: req.user.local.email, name: req.user.local.name } });
        return;
      }
      for (var i = 0; i < results.length; i++) {
        results[i].created_at = new Date(results[i].created_at).toLocaleString();
      }
      res.render('subcontractor.html', { forms: results, defaults: { email: req.user.local.email, name: req.user.local.name } });
    });
  });

  app.get('/subcontractor/viewForm/', mid.isAuth, async (req, res) => {
    let id = req.query.id;
    console.log(id);
    if (id == undefined) {
      res.send('sowwy, no id found in query');
      return;
    }
    db.query('SELECT * FROM forms WHERE id = ?;', [id], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error retrieving form.');
        return;
      }
      console.log(results);
      if (results == null || results.length === 0) {
        res.send('sowwy, no form found with that id');
        return;
      }

      const form = results[0];
      if (form.user_id !== req.user.local.id && req.user.local.user_type !== 4) {
        res.status(403).send('Unauthorized access to this form.');
        return;
      }

      res.render('subcontractorViewForm.html', { form: results });
    });
  });


  // access by subcontractor
      // only get jobs assigned to the logged in subcontractor
      app.get('/subcontractor/jobs', mid.isSubcontractor, function (req, res) {
          console.log("subcontractor jobs access");
          const user = req.user.local;
          console.log("subcontractor userId:", user.id);
          console.log("Looking for jobs assigned to userId:",  user.id);
          db.query(
              "SELECT jobs.*, subcontractor_jobs_assignment.alloted_bid as bid FROM jobs INNER JOIN subcontractor_jobs_assignment ON jobs.id = subcontractor_jobs_assignment.job_id WHERE subcontractor_jobs_assignment.user_id = ? AND jobs.isArchived = 0;",
              [user.id],
              function (error, results) {
                  if (error) {
                      console.error('Error fetching assigned jobs:', error);
                      return res.status(500).json({ error: 'Internal server error' });
                  }
  
                  
                  // for each job, call subcontractor.getAvailableFunds(user.id, job.id, callback)
                  const jobsWithFunds = [];
                  let jobsProcessed = 0;
                  results.forEach((job) => {
                      
                      getAvailableFunds(user.id, job.id, (error, availableFunds) => {
                          
                          if (error) {
                              console.error('Error fetching available funds:', error);
                              return res.status(500).json({ error: 'Internal server error' });
                          }

                          if (availableFunds> 0) {
                            job.bid = availableFunds;
                            jobsWithFunds.push(job);
                          }
                         
                          jobsProcessed++;
                          if (jobsProcessed === results.length) {
                              res.json(jobsWithFunds);
                          }
                      });

                  });                  
              }
          );

      });



  app.get('/subcontractor/getFormData/', mid.isAuth, async (req, res) => {
    let form_id = req.query.id;
    console.log('viewing form', form_id);
    let user_id = req.user.local.id;
    let user_type = req.user.local.user_type;

    if (form_id == undefined) {
      res.send('sowwy, no form_id found in query');
      return;
    }

    // Check if the user owns the form or is user_type 4 or 1
    db.query('SELECT * FROM forms WHERE id = ?;', [form_id], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error retrieving form.');
        return;
      }

      if (results == null || results.length === 0) {
        res.send('sowwy, no form found with that id');
        return;
      }

      const form = results[0];
      if (form.user_id !== user_id && user_type !== 4 && user_type !== 1) {
        res.status(403).send('Unauthorized access to this form.');
        return;
      }

      // Proceed to fetch form data
      db.query('SELECT * FROM form_items JOIN form_item_days ON form_items.id = form_item_days.form_item_id JOIN jobs ON form_items.job_id = jobs.id JOIN subcontractor_jobs_assignment on subcontractor_jobs_assignment.job_id = form_items.job_id WHERE form_items.form_id = ?;', [form_id], (err, results) => {
        console.log(results);
        // group by job 
        let grouped = {};

        if (results != null && results.length > 0) {
          for (var i = 0; i < results.length; i++) {
            let item = results[i];
            if (grouped[item.job_name] == undefined) {
              grouped[item.job_name] = [];
            }
            grouped[item.job_name].push(item);
          }
        }

        // also get the bids data
        getBidsData(form_id).then((bids) => {
          console.log('bids data:', bids);
          // send the grouped object and the bids data
          res.send({ timesheetData: grouped, bidData: bids });
        });
      });
    });
  });

  app.get('/subcontractor/createForm', mid.isAuth, mid.isSubcontractor, async (req, res) => {
    req.user.local.id;
    res.render('subcontractorForm.html');
  });

  app.post('/subcontractor/submit', mid.isAuth, mid.isSubcontractor, async (req, res) => {

    try {
      let form = req.body;
      let user_id = req.user.local.id;
      let form_id = null;

      let bid_data = req.body.bidsData

      console.log(form);

      // Set default form_name
      if (!form.form_name || form.form_name.trim() === '') {
        form.form_name = 'New Form';
      }

      // null check

      // Insert form into database
      db.query('INSERT INTO forms (form_name, user_id) VALUES (?, ?); SELECT LAST_INSERT_ID() as last;', [form.form_name, user_id], (err, results) => {
        if (err) {
          console.log('forms insert error:', err);
          res.status(500).send('Error submitting form.');
          return;
        }

        form_id = results[0].insertId;
        console.log("Form ID:", form_id);
        // Link subcontractor to form
        db.query('INSERT INTO subcontractor_forms (user_id, form_id) VALUES (?, ?);', [user_id, form_id], (err) => {
          if (err) {
            console.log('subcontractor_forms insert error', err);
            res.status(500).send('Error submitting form.');
            return;
          }


          // Insert items into form_items
          const items = form.timesheetData || [];
          for (const item of items) {
            // if and of the fields are empty, skip this item

            console.log(item);
            if (item.jobId == '') {
              continue;
            }




            db.query('INSERT INTO form_items (form_id, job_id, item_description) VALUES (?, ?, ?);', [form_id, item.jobId, item.description], (err, itemResult) => {
              if (err) {
                console.log('form_items insert error', err);
                res.status(500).send('Error submitting form.');
                return;
              }

              // console.log(itemResult);
              const item_id = itemResult.insertId;
              console.log("Item ID:", item_id);
              // Insert days into form_item_days
              let daysOfTheWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              for (var i = 0; i < daysOfTheWeek.length; i++) {
                console.log("On " + daysOfTheWeek[i] + ": " + item.days[i] + " hours");
                db.query('INSERT INTO form_item_days (form_item_id, day, duration) VALUES (?, ?, ?);', [item_id, daysOfTheWeek[i], parseFloat(item.days[i])], () => {

                });
              }
            });
          }
          console.log('form submit process done');

          // start inserting the bids data

          // check if the bidsData is not empty
          if (bid_data == undefined || bid_data.length == 0) {
            console.log('no bids data found');
            res.status(200).send('success');
            return;
          } else {
            
            console.log('bids data found');

            // check if there are any rows with duplicate jobId
            let jobIds = bid_data.map(item => item.jobId);
            let uniqueJobIds = [...new Set(jobIds)];
            if (jobIds.length !== uniqueJobIds.length) {
              console.log('Duplicate jobId found');
              res.status(400).send('Duplicate jobId found');
              return;
            }

            for (const item of bid_data) {
              // if and of the fields are empty, skip this item
              if (item.jobId == '') {
                continue;
              }

              // use getTotalRequestedAmount to validate the requested amount
              getTotalRequestedAmount(item.jobId, user_id, (err, totalRequested, totalAllotted) => {
                if (err) {
                  console.error('Error fetching total requested amount:', err);
                  res.status(500).send('Error submitting form.');
                  return;
                }
                console.log('Total requested amount:', totalRequested);
                console.log('Total allotted amount:', totalAllotted);

                if (totalRequested + item.requestedAmount > totalAllotted) {
                  console.log('Requested amount exceeds allotted amount');
                  //res.status(400).send('Requested amount exceeds allotted amount');
                  return;
                }
                console.log('Requested amount is within limits');
                console.log(item);
                db.query('INSERT INTO form_bid (form_id, job_id, request) VALUES (?, ?, ?);', [form_id, item.jobId | 0, item.requestedAmount], (err) => {
                  if (err) {
                    console.log('bids insert error', err);
                    res.status(500).send('Error submitting form.');
                    return;
                  }
                });
              });
             
            }
            console.log('bids data insert done');

          }

          // send success status
         // res.status(200).send('success');
           //res.redirect('/subcontractor');

           // send user to the viewForm page
           // res.redirect('/subcontractor/viewForm?id=' + form_id);

           res.send({
            status: 'success',
            form_id: form_id
           });
        });
      });
    } catch (err) {
      console.error('caught: ', err);
      res.status(500).send('Error submitting form.');
    }
  }
  );


  app.get('/subcontractor/profile', mid.isAuth, mid.isSubcontractor, async (req, res) => {
    db.query('SELECT * FROM users WHERE id = ?;', [req.user.local.id], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error retrieving profile.');
        return;
      }
      console.log(results);
      if (results == null || results.length === 0) {
        res.send('sowwy, no user found with that id');
        return;
      }
      res.render('subcontractorProfile.html', results[0] );
    });
  }
  );

  app.post('/subcontractor/updateProfile', mid.isAuth, mid.isSubcontractor, async (req, res) => {
    let profile = req.body;
    let user_id = req.user.local.id;
    console.log(profile);

    if (profile.name != undefined && profile.name.trim() != '') {
      db.query('UPDATE users SET name = ? WHERE id = ?;', [profile.name, user_id], (err, results) => {
        if (err) {
          console.log('update error:', err);
          res.status(500).send('Error updating profile.');
          return;
        }
        console.log("Profile updated");
      });
    }
    if (profile.email != undefined && profile.email.trim() != '') {
      db.query('UPDATE users SET email = ? WHERE id = ?;', [profile.email, user_id], (err, results) => {
        if (err) {
          console.log('update error:', err);
          res.status(500).send('Error updating profile.');
          return;
        }
        console.log("Profile updated");
      });
    }
    if (profile.phone != undefined && profile.phone.trim() != '') {
      db.query('UPDATE users SET phone = ? WHERE id = ?;', [profile.phone, user_id], (err, results) => {
        if (err) {
          console.log('update error:', err);
          res.status(500).send('Error updating profile.');
          return;
        }
        console.log("Profile updated");
      });
    }
  });
};
