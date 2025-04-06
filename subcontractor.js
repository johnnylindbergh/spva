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



module.exports = function (app) {
  // in order to allow subcontractors to NOT use google oauth to fill out the preset form. Forms are created with a hash that is part of the sharable link that is emailed to the subcontractor

  // send a form page 
  // Subcontractor email
  // form preset 
  // notify me when form is submitted

  app.get('/subcontractor', mid.isAuth, mid.isSubcontractor, async (req, res) => {
    console.log(req.user.local.id);
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

  app.get('/subcontractor/viewForm/', mid.isAuth, mid.isSubcontractor, async (req, res) => {
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
      //console.log(results);

      res.render('subcontractorViewForm.html', { form: results });

      // db.query('SELECT * FROM form_items JOIN form_item_days ON form_items.id = form_item_days.form_item_id WHERE form_items.form_id = ?;', [id], (fields) => {
      //   console.log(fields);

      //   res.render('subcontractorViewForm.html', {form: results[0], data: fields});
      // });

    });
  });

  app.get('/subcontractor/getFormData/', mid.isAuth, mid.isSubcontractor, async (req, res) => {
    let form_id = req.query.id;
    console.log('viewing form', form_id);
    let user_id = req.user.local.id;
    if (form_id == undefined) {
      res.send('sowwy, no form_id found in query');
      return;
    }
    db.query('SELECT * FROM form_items JOIN form_item_days ON form_items.id = form_item_days.form_item_id WHERE form_items.form_id = ?;', [form_id], (err, results) => {
      console.log(results);
      // group by job 
      let grouped = {};

      if (results == null || results.length === 0) {
        res.send('sowwy, no form found with that id');
        return;
      }

      for (var i = 0; i < results.length; i++) {
        let item = results[i];
        if (grouped[item.job_name] == undefined) {
          grouped[item.job_name] = [];
        }
        grouped[item.job_name].push(item);
      }
      res.send(grouped);


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
            if (item.jobName.trim() === '') {
              continue;
            }




            db.query('INSERT INTO form_items (form_id, job_name, item_description) VALUES (?, ?, ?);', [form_id, item.jobName, item.description], (err, itemResult) => {
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

            for (const item of bid_data) {
              // if and of the fields are empty, skip this item
              if (item.jobName.trim() === '') {
                continue;
              }
              console.log(item);
              db.query('INSERT INTO form_bid (form_id, job_name, bid, request) VALUES (?, ?, ?, ?);', [form_id, item.jobName, item.bid | 0, item.requestedAmount], (err) => {
                if (err) {
                  console.log('bids insert error', err);
                  res.status(500).send('Error submitting form.');
                  return;
                }
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
};
