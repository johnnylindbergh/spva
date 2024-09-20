const creds   = require('./credentials.js');
const sys     = require('./settings.js');
const mysql   = require('mysql');
const moment = require('moment');
const date = require('date-and-time') 
moment().format();

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

  loadRevuData: function (row, takeoff_id, callback) {
    row[2] = moment(row[2], 'MM/DD/YYYY').format('YYYY-MM-DD');
    row.push(takeoff_id);
    // check for null values
    for (var i = 0; i < row.length; i++) {
      if (row[i] === '') {
        row[i] = null;
      } 
    }
    con.query('INSERT INTO subjects (name, page_label, date, layer, color, length, length_unit, area, area_unit, wall_area, wall_area_unit, depth, depth_unit, count, measurement, measurement_unit, takeoff_id) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', row, function (err){
      if (err) {
        return callback(err);
      }
    });
  },

  createNewTakeoff: function (req, res, cb) {
    con.query('INSERT INTO takeoffs (creator_id, name) VALUES (?, ?); SELECT LAST_INSERT_ID() as last;', [req.user.local.id, req.body.name], function (err, result) {
      if (err) {
        return cb(err);
      }
      console.log("created takeoff", result[1][0].last);
      cb(null, result[1][0].last);
    });
  },

  getMaterials: function (takeoff_id, callback) {
    con.query('SELECT DISTINCT name from subjects where takeoff_id = ?;', [takeoff_id], function (err, results) {
      if (err) return callback(err);
      callback(null, results);
    });
  },

  sumSFMaterial: function (material_id, takeoff_id, callback) {
    con.query('SELECT name as material, SUM(area) as area, SUM(length) as length  FROM subjects WHERE takeoff_id = ? AND name = ?;', [material, takeoff_id], function (err, results) {
      if (err) return callback(err);
      callback(null, results);
    });
  },

  query: function (sql, args, callback) {
    con.query(sql, args, function (err, results) {
      if (err) return callback(err);
      callback(results);
    });
  },

	
}
