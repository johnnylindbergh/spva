const db = require("./database.js");
const sys = require("./settings.js");
const mid = require("./middleware.js");
const moment = require("moment");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
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

    app.put('/api/updateJob', mid.isSubcontractorAdmin, function (req, res) {

        const { job_id, job_name, job_description, job_location, job_start_date, job_end_date } = req.body;
        console.log('req body', req.body);
        if (!job_id || !job_name || !job_description || !job_location || !job_start_date || !job_end_date) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        db.query(
            "UPDATE jobs SET job_name = ?, job_description = ?, job_location = ?, job_start_date = ?, job_end_date = ? WHERE id = ?",
            [job_name, job_description, job_location, job_start_date, job_end_date, job_id],
            function (error, result) {
                if (error) {
                    console.error('Error updating job:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Job not found' });
                }
                res.json({ message: 'Job updated successfully' });
            }
        );
    });

    app.delete('/api/jobs/:id', mid.isSubcontractorAdmin, function (req, res) {
        const jobId = req.params.id;
        db.query("DELETE FROM jobs where id = ?;", [jobId], function (error, results) {
            if (error) {
                console.error('Error deleting job:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Job not found' });
            }
            res.json({ message: 'Job deleted successfully' });
        });
    }
    );

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
        const validStatuses = ['approvePayment', 'rejectPayment'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }


        // conversion from the ui approvePayment to db enum
        status = status === 'approvePayment' ? 'accepted' : 'rejected';


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
        const { job_name, job_description, job_location, job_start_date, job_end_date, job_type } = req.body;

        console.log('req body', req.body);
        db.query(
            "INSERT INTO jobs (job_name, job_description, job_location, job_start_date, job_end_date, job_type) VALUES (?, ?, ?, ?, ?, ?)",
            [job_name, job_description, job_location, job_start_date, job_end_date, job_type],
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

    app.get('/api/tickets', mid.isSubcontractorAdmin, function (req, res) {
        db.query(
            `SELECT 
                tickets.*, 
                users.name as subcontractorName, 
                jobs.job_name 
            FROM tickets 
            JOIN users ON tickets.subcontractor_id = users.id 
            JOIN jobs ON tickets.job_id = jobs.id;`,
            function (error, results) {
                if (error) {
                    console.error('Error fetching tickets:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.json(results);
            }
        );
    });

    app.get('/api/assignments', mid.isSubcontractorAdmin, function (req, res) {
        db.query(
            `SELECT 
                subcontractor_jobs_assignment.*, 
                users.name as subcontractorName, 
                jobs.job_name 
            FROM subcontractor_jobs_assignment 
            JOIN users ON subcontractor_jobs_assignment.user_id = users.id 
            JOIN jobs ON subcontractor_jobs_assignment.job_id = jobs.id;`,
            function (error, results) {
                if (error) {
                    console.error('Error fetching assignments:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.json(results);
            }
        );
    }
    );

    app.post('/api/tickets', mid.isSubcontractorAdmin, function (req, res) {
        console.log('req body', req.body);
        const { ticket_name, job_id, subcontractor_id, ticket_description, ticket_number } = req.body;

        if (!job_id || !subcontractor_id || !ticket_description || !ticket_number) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        db.query(
            "INSERT INTO tickets (ticket_name, job_id, subcontractor_id, ticket_description, ticket_number) VALUES (?, ?, ?, ?, ?)",
            [ticket_name, job_id, subcontractor_id, ticket_description, ticket_number],
            function (error, result) {
                if (error) {
                    console.error('Error creating ticket:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                const newTicket = { id: result.insertId, job_id, subcontractor_id, ticket_description, ticket_number };
                res.status(201).json(newTicket);
            }
        );
    });

app.delete('/api/assignments/:id', mid.isSubcontractorAdmin, function (req, res) {
    const assignmentId = req.params.id;
    db.query("DELETE FROM subcontractor_jobs_assignment WHERE id = ?;", [assignmentId], function (error, results) {
        if (error) {
            console.error('Error deleting assignment:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        res.json({ message: 'Assignment deleted successfully' });
    });
});

    app.post('/api/assignments', mid.isSubcontractorAdmin, function (req, res) {
        const { jobId, subcontractorId, allottedBid } = req.body;
        db.query(
            `INSERT INTO subcontractor_jobs_assignment (job_id, user_id, alloted_bid) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE alloted_bid = alloted_bid + VALUES(alloted_bid);`,
            [jobId, subcontractorId, allottedBid],
            function (error) {
                if (error) {
                    console.error('Error assigning job:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.status(200).json({ message: 'Job assigned successfully or allotted_bid updated' });
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

    app.post('/api/agreement/create', mid.isSubcontractorAdmin, function (req, res) {
        // use multer to handle file upload
        const storage = multer.memoryStorage();
        const upload = multer({ storage: storage });
        const uploadSingle = upload.single('agreementPdf');
        uploadSingle(req, res, function (err) {
            console.log('req body', req.body);

            if (err) {
                console.error('Error uploading file:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            const { subcontractorId, jobId, agreementDetails } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Check if record exists in subcontractor_jobs_assignment
            db.query(
                "SELECT * FROM subcontractor_jobs_assignment WHERE job_id = ? AND user_id = ?",
                [jobId, subcontractorId],
                function (checkError, results) {
                    if (checkError) {
                        console.error('Error checking subcontractor_jobs_assignment:', checkError);
                        return res.status(500).json({ error: 'Please assign sub to job' });
                    }

                    if (results.length === 0) {
                        return res.status(500).json({ error: 'No assignment found for the given subcontractor and job' });
                    }

                    // Save the file to the database or filesystem
                    const filePath = path.join(__dirname, 'uploads', file.originalname);
                    fs.writeFile(filePath, file.buffer, function (err) {
                        if (err) {
                            console.error('Error saving file:', err);
                            return res.status(500).json({ error: 'Internal server error' });
                        }

                        // Save the agreement details to the database
                        db.query(
                            "INSERT INTO agreements (description, hash, pdf_path) VALUES (?, ?, ?)",
                            [agreementDetails, db.generateHash(), filePath],
                            function (error, result) {
                                if (error) {
                                    console.error('Error creating agreement:', error);
                                    return res.status(500).json({ error: 'Internal server error' + error });
                                }

                                const agreementId = result.insertId;

                                // Update the subcontractor_jobs_assignment table with the agreement ID
                                db.query(
                                    "UPDATE subcontractor_jobs_assignment SET agreement_id = ? WHERE job_id = ? AND user_id = ?",
                                    [agreementId, jobId, subcontractorId],
                                    function (updateError) {
                                        if (updateError) {
                                            console.error('Error updating subcontractor_jobs_assignment:', updateError);
                                            return res.status(500).json({ error: 'Internal server error Error updating subcontractor_jobs_assignment' });
                                        }

                                        res.status(200).json({ message: 'Agreement created and assignment updated successfully', agreementId });
                                    }
                                );
                            }
                        );
                    });
                }
            );
        });
    });

    app.get('/api/agreements', mid.isSubcontractorAdmin, function (req, res) {
        console.log('Fetching all agreements');
        db.query(
            `SELECT 
                agreements.*, 
                subcontractor_jobs_assignment.*,
                users.name as subcontractorName 
            FROM agreements 
            JOIN subcontractor_jobs_assignment 
            ON agreements.id = subcontractor_jobs_assignment.agreement_id
            JOIN users 
            ON subcontractor_jobs_assignment.user_id = users.id;`,
            function (error, results) {
                if (error) {
                    console.error('Error fetching agreements:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.json(results);
            }
        );
    });
    

    app.delete('/api/agreements/:id', mid.isSubcontractorAdmin, function (req, res) {
        const agreementId = req.params.id;
        db.query("DELETE FROM agreements WHERE id = ?;", [agreementId], function (error, results) {
            if (error) {
                console.error('Error deleting agreement:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Agreement not found' });
            }
            res.json({ message: 'Agreement deleted successfully' });
        });
    });

    // endpoint for /subcontractorAdmin/viewAgreement
    app.get('/subcontractorAdmin/viewAgreement', mid.isSubcontractorAdmin, function (req, res) {
        const agreementId = req.query.agreement_id;
        if (!agreementId) {
            return res.status(400).json({ error: 'Agreement ID is required' });
        }

        db.query(
            "SELECT * FROM agreements WHERE id = ?",
            [agreementId],
            function (error, results) {
                if (error) {
                    console.error('Error fetching agreement:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (results.length === 0) {
                    return res.status(404).json({ error: 'Agreement not found' });
                }

                const agreement = results[0];
                const pdfPath = agreement.pdf_path;

                // Check if the file exists
                fs.access(pdfPath, fs.constants.F_OK, (err) => {
                    if (err) {
                        console.error('Error accessing PDF file:', err);
                        return res.status(404).json({ error: 'PDF file not found' });
                    }

                    // Stream the PDF file to the client
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `inline; filename="${path.basename(pdfPath)}"`);
                    const fileStream = fs.createReadStream(pdfPath);
                    fileStream.pipe(res);
                });
            }
        );
    });

    app.get('/api/agreement/:userid', mid.isSubcontractorAdmin, function (req, res) {
        const userId = req.params.userid;
        db.query(
            "SELECT * FROM agreements WHERE id IN (SELECT agreement_id FROM subcontractor_jobs_assignment WHERE user_id = ?)",
            [userId],
            function (error, results) {
                if (error) {
                    console.error('Error fetching agreements:', error);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.json(results);
            }
        );
    }
    );

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
