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
        db.query('SELECT * FROM subcontractor_forms JOIN forms ON subcontractor_forms.form_id = forms.id WHERE subcontractor_forms.user_id = ?;', [req.user.local.id], (results) => {
          console.log(results);

          for (var i = 0; i < results.length; i++) {
            results[i].created_at = new Date(results[i].created_at).toLocaleString();
          }
          res.render('subcontractor.html', {forms: results, defaults: {email: req.user.local.email, name: req.user.local.name}}); 
        });
    });

    app.get('/subcontractor/viewForm/', mid.isAuth, mid.isSubcontractor, async (req, res) => {
      let id = req.query.id;
      if (id == undefined) {
        res.send('sowwy, no id found in query');
        return;
      }
      db.query('SELECT * FROM forms WHERE id = ?;', [id], (results) => {
        console.log(results);

        res.render('subcontractorViewForm.html', {form: results[0]});

        // db.query('SELECT * FROM form_items JOIN form_item_days ON form_items.id = form_item_days.form_item_id WHERE form_items.form_id = ?;', [id], (fields) => {
        //   console.log(fields);

        //   res.render('subcontractorViewForm.html', {form: results[0], data: fields});
        // });

      });
    });

    app.get('/subcontractor/getFormData/', mid.isAuth, mid.isSubcontractor, async (req, res) => {
      let form_id = req.query.id;
      let user_id = req.user.local.id;
      if (form_id == undefined) {
        res.send('sowwy, no form_id found in query');
        return;
      }
      db.query('SELECT * FROM form_items JOIN form_item_days ON form_items.id = form_item_days.form_item_id WHERE form_items.form_id = ?;', [form_id], (results) => {
        console.log(results);
        // group by job 
        let grouped = {};
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
    
        console.log(form);
    
        // Set default form_name
        if (!form.form_name || form.form_name.trim() === '') {
          form.form_name = 'New Form';
        }
    
        // Insert form into database
        db.query('INSERT INTO forms (form_name, user_id) VALUES (?, ?)', [form.form_name, user_id], ( results) => {
         
          form_id = results.insertId;
          console.log("Form ID:", form_id); 
          // Link subcontractor to form
          db.query('INSERT INTO subcontractor_forms (user_id, form_id) VALUES (?, ?)', [user_id, form_id], (err, results) => {
            console.log(err);
         

            // Insert items into form_items
            const items = form.data || [];
            for (const item of items) {
              // if and of the fields are empty, skip this item
              if (item.jobName.trim() === '') {
                continue;
              }

              console.log(item);
              console.log('inserting item');
              console.log(form_id);
              console.log(item.jobName);
              console.log(item.description);
              

              db.query('INSERT INTO form_items (form_id, job_name, item_description) VALUES (?, ?, ?)', [form_id, item.jobName, item.description], (err, itemResult) => {
                console.log(err);
                console.log(itemResult);
                const item_id = err.insertId;
                console.log("Item ID:", item_id);
          // Insert days into form_item_days
          let daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          for (var i = 0; i < daysOfTheWeek.length; i++) {
            console.log("On " + daysOfTheWeek[i]+": "+item.days[i]+" hours");
            db.query('INSERT INTO form_item_days (form_item_id, day, duration) VALUES (?, ?, ?)', [item_id, daysOfTheWeek[i], parseFloat(item.days[i])], (err, results) => {
          
            });
          }
              });
            }

            res.send('success');
          });
        });
      } catch (err) {
        console.error(err);
        res.status(500).send('Error submitting form.');
      }
    }
    );


};
