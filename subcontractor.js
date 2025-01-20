'use strict';

const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { parse: json2csv } = require('json2csv');
const mid = require('./middleware.js');
const creds = require('./credentials');
const db = require('./database.js');
require('dotenv').config();



module.exports = function (app) {
  // in order to allow subcontractors to NOT use google oauth to fill out the preset form. Forms are created with a hash that is part of the sharable link that is emailed to the subcontractor

  // send a form page 
    // Subcontractor email
    // form preset 
    // notify me when form is submitted

    app.get('/subcontractor/', async (req, res) => {
        res.send('subcontractor page');
    });



};
