const db = require("./database.js");
const sys = require("./settings.js");
const mid = require("./middleware.js");
const moment = require("moment");
const path = require("path");
const multer = require("multer");
const chatgpt = require("./chatgpt.js");
const emailer = require("./email.js");
const creds = require("./credentials.js");
const querystring = require("querystring");
const schedule = require('node-schedule');
const pdf = require("./pdf.js");

module.exports = function (app) {

    app.get('/subcontractorAdmin', mid.isSubcontractorAdmin, function (req, res) {
        res.render('subcontractorAdmin.html', { title: 'Subcontractor Admin' });
    });

    app.get('/api/jobs', mid.isSubcontractorAdmin, function (req, res) {
        db.query("SELECT * FROM jobs WHERE isArchived = 0;", function (error, results) {
            if (error) {
                console.error('Error fetching jobs:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            console.log(results);
            res.json(results);
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
            "SELECT jobs.* FROM jobs INNER JOIN subcontractor_jobs_assignment ON jobs.id = subcontractor_jobs_assignment.job_id WHERE subcontractor_jobs_assignment.user_id = ? AND jobs.isArchived = 0;",
            [user.id],
            function (error, results) {
                if (error) {
                    console.error('Error fetching assigned jobs:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                console.log(results);
                res.json(results);
            }
        );
    });

    app.get('/api/subcontractors', mid.isSubcontractorAdmin, function (req, res) {
        db.query("SELECT * FROM users WHERE user_type = 4;", function (error, results) {
            if (error) {
                console.error('Error fetching subcontractors:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(results);
        });
    });

    app.get('/api/forms', mid.isSubcontractorAdmin, function (req, res) {
        db.query("SELECT * FROM forms", function (error, results) {
            if (error) {
                console.error('Error fetching forms:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(results);
        });
    });

  

    app.post('/api/jobs', mid.isSubcontractorAdmin, function (req, res) {
        const { job_name, bid, job_description, job_location, job_start_date, job_end_date } = req.body;
        db.query(
            "INSERT INTO jobs (job_name, bid, job_description, job_location, job_start_date, job_end_date) VALUES (?, ?, ?, ?, ?, ?)",
            [job_name, bid, job_description, job_location, job_start_date, job_end_date],
            function (error, result) {
                if (error) {
                    console.error('Error creating job:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                const newJob = { id: result.insertId, job_name, bid, job_description, job_location, job_start_date, job_end_date };
                res.status(201).json(newJob);
            }
        );
    });

    app.post('/api/assignments', mid.isSubcontractorAdmin, function (req, res) {
        const { jobId, subcontractorId } = req.body;
        db.query(
            "INSERT INTO subcontractor_jobs_assignment (job_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)",
            [jobId, subcontractorId],
            function (error) {
                if (error) {
                    console.error('Error assigning job:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.status(200).json({ message: 'Job assigned successfully' });
            }
        );
    });

    app.post('/api/forms', mid.isSubcontractorAdmin, function (req, res) {
        const { user_id, form_name } = req.body;
        db.query(
            "INSERT INTO forms (user_id, form_name) VALUES (?, ?)",
            [user_id, form_name],
            function (error, result) {
                if (error) {
                    console.error('Error creating form:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                const newForm = { id: result.insertId, user_id, form_name };
                res.status(201).json(newForm);
            }
        );
    });

    app.post('/api/forms/assign', mid.isSubcontractorAdmin, function (req, res) {
        const { form_id, user_id } = req.body;
        db.query(
            "INSERT INTO subcontractor_forms (form_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)",
            [form_id, user_id],
            function (error) {
                if (error) {
                    console.error('Error assigning form:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.status(200).json({ message: 'Form assigned successfully' });
            }
        );
    });

    app.post('/api/form-items', mid.isSubcontractorAdmin, function (req, res) {
        const { form_id, job_id, item_description } = req.body;
        db.query(
            "INSERT INTO form_items (form_id, job_id, item_description) VALUES (?, ?, ?)",
            [form_id, job_id, item_description],
            function (error, result) {
                if (error) {
                    console.error('Error creating form item:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                const newItem = { id: result.insertId, form_id, job_id, item_description };
                res.status(201).json(newItem);
            }
        );
    });

    app.post('/api/form-item-days', mid.isSubcontractorAdmin, function (req, res) {
        const { form_item_id, day, duration } = req.body;
        db.query(
            "INSERT INTO form_item_days (form_item_id, day, duration) VALUES (?, ?, ?)",
            [form_item_id, day, duration],
            function (error, result) {
                if (error) {
                    console.error('Error creating form item day:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                const newDay = { id: result.insertId, form_item_id, day, duration };
                res.status(201).json(newDay);
            }
        );
    });
};
