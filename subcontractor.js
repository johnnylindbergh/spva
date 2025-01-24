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

        db.query('SELECT * FROM form_items JOIN form_item_days ON form_items.id = form_item_days.form_item_id WHERE form_items.form_id = ?;', [id], (fields) => {
          console.log(fields);

          res.render('subcontractorViewForm.html', {form: results[0], data: fields});
        });

      });
    });



};
