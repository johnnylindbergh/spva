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
const subcontractor = require("./subcontractor.js");



function jsonToCSV(jsonData) {
    const csvRows = [];
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error("Invalid or empty JSON data provided");
    }
    const headers = Object.keys(jsonData[0]);
    csvRows.push(headers.join(','));
    jsonData.forEach(row => {
        const values = headers.map(header => {
            const escaped = ('' + (row[header] || '')).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    });
    return csvRows.join('\n');
}




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

    app.get('/api/jobs/:id', mid.isSubcontractorAdmin, function (req, res) {
        const jobId = req.params.id;
        db.query("SELECT * FROM jobs WHERE id = ?;", [jobId], function (error, results) {
            if (error) {
                console.error('Error fetching job:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Job not found' });
            }
            res.json(results[0]);
        });
    });

    

    app.get('/api/subcontractors', mid.isSubcontractorAdmin, function (req, res) {
        db.query("SELECT * FROM users WHERE user_type = 3;", function (error, results) {
            if (error) {
                console.error('Error fetching subcontractors:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(results);
        });
    });

    app.get('/api/forms', mid.isSubcontractorAdmin, function (req, res) {
        db.query("SELECT *, forms.created_at as form_created_at, forms.id as form_id, users.id as user_id FROM forms JOIN users ON forms.user_id = users.id;", function (error, results) {
            if (error) {
                console.error('Error fetching forms:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(results);
        });
    });

    app.get('/api/payments', mid.isSubcontractorAdmin, function (req, res) {
        // the sum of all form_bid.requests for each subcontractor using subcontractor_forms to get user_id
        db.query(
            `SELECT 
                form_bid.id as id, 
                users.id as user_id, 
                users.name as subcontractorName, 
                form_bid.request as total_requests, 
                form_bid.status, 
                jobs.job_name 
            FROM form_bid 
                JOIN subcontractor_forms ON form_bid.form_id = subcontractor_forms.form_id 
                JOIN users ON subcontractor_forms.user_id = users.id 
                JOIN jobs ON form_bid.job_id = jobs.id 
            
                GROUP BY form_bid.id, users.id, users.name, form_bid.request, form_bid.status, jobs.job_name;`,
            function (error, results) {
            if (error) {
                console.error('Error fetching payments:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json(results);
            }
        );
    });


    app.post('/api/payments/update-status', mid.isSubcontractorAdmin, function (req, res) {


   
        let {paymentId, status } = req.body;

        console.log('Payment ID:', paymentId);
        console.log('Status:', status);
        

        // Validate status
        const validStatuses = ['approve', 'reject'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        status = status === 'approve' ? 'accepted' : 'rejected';


        console.log('Updating payment status:', paymentId, status);
        // Update the payment status in the database
        db.query(
            "UPDATE form_bid SET status = ? WHERE id = ?;",
            [status, paymentId],
            function (error, results) {
                if (error) {
                    console.error('Error updating payment status:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (results.affectedRows === 0) {
                    return res.status(404).json({ error: 'Payment not found' });
                }
                res.json({ status: 'success', message: 'Payment status updated successfully' });
            }
        );
    });
    
  

    app.post('/api/jobs', mid.isSubcontractorAdmin, function (req, res) {
        const { job_name, job_description, job_location, job_start_date, job_end_date } = req.body;
        db.query(
            "INSERT INTO jobs (job_name, job_description, job_location, job_start_date, job_end_date) VALUES (?, ?, ?, ?, ?)",
            [job_name, job_description, job_location, job_start_date, job_end_date],
            function (error, result) {
                if (error) {
                    console.error('Error creating job:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                const newJob = { id: result.insertId, job_name, job_description, job_location, job_start_date, job_end_date };
                res.status(201).json(newJob);
            }
        );
    });

    app.post('/api/assignments', mid.isSubcontractorAdmin, function (req, res) {
        const { jobId, subcontractorId, allottedBid } = req.body;
        db.query(
            "INSERT INTO subcontractor_jobs_assignment (job_id, user_id, alloted_bid) VALUES (?, ?, ?);",
            [jobId, subcontractorId, allottedBid],
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


    app.get("/api/payments/export", mid.isSubcontractorAdmin, function (req, res) {
        db.query(
            `SELECT 
                form_bid.id as id, 
                users.id as user_id, 
                users.name as subcontractorName, 
                form_bid.request as total_requests, 
                form_bid.status, 
                jobs.job_name 
            FROM form_bid 
                JOIN subcontractor_forms ON form_bid.form_id = subcontractor_forms.form_id 
                JOIN users ON subcontractor_forms.user_id = users.id 
                JOIN jobs ON form_bid.job_id = jobs.id 
            WHERE form_bid.status = 'accepted'`,
            function (error, results) {
                if (error) {
                    console.error('Error fetching payments for export:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                console.log("Results for export:", results);    
                const csvData = results.map(row => ({
                    id: row.id,
                    user_id: row.user_id,
                    subcontractorName: row.subcontractorName,
                    total_requests: row.total_requests,
                    status: row.status,
                    job_name: row.job_name
                }));
                const csvString = jsonToCSV(csvData);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
                res.send(csvString);
            }
        );
    }
    );
};
