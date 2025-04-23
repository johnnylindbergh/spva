document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const createJobForm = document.getElementById('createJobForm');
    const assignJobForm = document.getElementById('assignJobForm');
    const jobSelect = document.getElementById('jobSelect');
    const subcontractorSelect = document.getElementById('subcontractorSelect');
    const allotedBidInput = document.getElementById('allotedBid');
    const subcontractorFormsTable = document.getElementById('subcontractorFormsTable');
    const paymentsTable = document.getElementById('paymentsTable');

    // Initialize the page
    function init() {
        fetchData();
        setupEventListeners();
    }

    // Fetch data from the server
    async function fetchData() {
        try {
            const [jobsData, subcontractorsData, formsData, paymentsData] = await Promise.all([
                fetch('/api/jobs').then(res => res.json()),
                fetch('/api/subcontractors').then(res => res.json()),
                fetch('/api/forms').then(res => res.json()),
                fetch('/api/payments').then(res => res.json())
            ]);

            renderJobSelect(jobsData);
            renderJobsTable(jobsData);
            renderSubcontractorSelect(subcontractorsData);
            renderFormsTable(formsData);
            renderPaymentsTable(paymentsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        createJobForm.addEventListener('submit', handleCreateJob);
        assignJobForm.addEventListener('submit', handleAssignJob);
    }

    // Handle job creation
    async function handleCreateJob(e) {
        e.preventDefault();

        const jobName = document.getElementById('jobName').value;
        const jobDescription = document.getElementById('jobDescription').value;
        const jobLocation = document.getElementById('jobLocation').value;
        const jobStartDate = document.getElementById('jobStartDate').value;
        const jobEndDate = document.getElementById('jobEndDate').value;

        try {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_name: jobName,
                    job_description: jobDescription,
                    job_location: jobLocation,
                    job_start_date: jobStartDate,
                    job_end_date: jobEndDate
                })
            });

            if (response.ok) {
                alert(`Job "${jobName}" created successfully!`);
                fetchData(); // Refresh data
                createJobForm.reset();
            } else {
                alert('Failed to create job.');
            }
        } catch (error) {
            console.error('Error creating job:', error);
        }
    }

    // Handle job assignment
    async function handleAssignJob(e) {
        e.preventDefault();

        const jobId = parseInt(jobSelect.value);
        const subcontractorId = parseInt(subcontractorSelect.value);
        const allotedBid = parseFloat(allotedBidInput.value);

        try {
            const response = await fetch('/api/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, subcontractorId })
            });

            if (response.ok) {
                alert('Job assigned successfully!');
                assignJobForm.reset();
            } else {
                alert('Failed to assign job.');
            }
        } catch (error) {
            console.error('Error assigning job:', error);
        }
    }

    function renderJobsTable(jobs) {
        const jobsTable = document.getElementById('jobsTable');
        jobsTable.innerHTML = '';

        if (jobs.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">No jobs available</td>';
            jobsTable.appendChild(row);
            return;
        }

        jobs.forEach(job => {
            const row = document.createElement('tr');

            const actions = `
                <button class="btn btn-sm btn-primary me-2" data-id="${job.id}" data-action="edit">Edit</button>
                <button class="btn btn-sm btn-danger" data-id="${job.id}" data-action="delete">Delete</button>
            `;

            row.innerHTML = `
                <td>${job.job_name}</td>
                <td>${job.job_location}</td>
        
                <td>${job.job_description}</td>
                
            `;
            row.innerHTML += `<td>${actions}</td>`;
            jobsTable.appendChild(row);
        });
    }


    // Add event listeners using event delegation
    document.getElementById('jobsTable').addEventListener('click', function(e) {
        if (e.target && (e.target.dataset.action === 'edit' || e.target.dataset.action === 'delete')) {
            handleJobAction(e);
        }
    });
    async function handleJobAction(e) {
        
        const jobId = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;
        console.log("jobId:", jobId);
        console.log("action:", action);
        if (action === 'edit') {
            // Open the edit modal and populate it with job data
            const job = await fetch(`/api/jobs/${jobId}`).then(res => res.json());
            document.getElementById('editJobName').value = job.job_name;
            document.getElementById('editJobDescription').value = job.job_description;
            document.getElementById('editJobLocation').value = job.job_location;
            document.getElementById('editJobStartDate').value = job.job_start_date;
            document.getElementById('editJobEndDate').value = job.job_end_date;
            $('#jobEditModal').modal('show');
        }
        else if (action === 'delete') {
            // Confirm deletion
            if (confirm(`Are you sure you want to delete job #${jobId}?`)) {
                try {
                    const response = await fetch(`/api/jobs/${jobId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        alert(`Job #${jobId} deleted successfully!`);
                        fetchData(); // Refresh data
                    } else {
                        alert('Failed to delete job.');
                    }
                } catch (error) {
                    console.error('Error deleting job:', error);
                }
            }
        }
    }



    // Render job select dropdown
    function renderJobSelect(jobs) {
        jobSelect.innerHTML = '<option value="">Select Job</option>';
        jobs.forEach(job => {
            const option = document.createElement('option');
            console.log("job:", job);
            option.value = job.id;
            option.textContent = `${job.job_name} `;
            jobSelect.appendChild(option);
        });
    }

    // Render subcontractor select dropdown
    function renderSubcontractorSelect(subcontractors) {
        subcontractorSelect.innerHTML = '<option value="">Select Subcontractor</option>';
        subcontractors.forEach(subcontractor => {
            const option = document.createElement('option');
            option.value = subcontractor.id;
            option.textContent = subcontractor.name;
            subcontractorSelect.appendChild(option);
        });
    }

    // Render forms table
    function renderFormsTable(forms) {
        subcontractorFormsTable.innerHTML = '';
        if (forms.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="text-center">No forms submitted yet</td>';
            subcontractorFormsTable.appendChild(row);
            return;
        }

        forms.forEach(form => {
            const row = document.createElement('tr');

            console.log("form:", form);
            row.innerHTML = `
                <td>${form.form_id}</td>
                <td>${form.name}</td>
                <td><a href="/subcontractor/viewForm/?id=${form.form_id}" target="_blank">${form.form_name}</a></td>
            `;
            subcontractorFormsTable.appendChild(row);
        });
    }

    // Render payments table with action buttons
    function renderPaymentsTable(payments) {

        console.log("payments:", payments);
        paymentsTable.innerHTML = '';
        if (payments.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">No payments to review</td>';
            paymentsTable.appendChild(row);
            return;
        }

        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.job_name}</td>
                <td>${payment.subcontractorName}</td>
                <td>$${payment.total_requests}</td>
                <td>${payment.status}</td>
                <td>
                    ${payment.status === 'pending' ? 
                        `<button class="btn btn-sm btn-success me-2" data-id="${payment.id}" data-action="approve">Approve</button>
                         <button class="btn btn-sm btn-danger" data-id="${payment.id}" data-action="reject">Reject</button>` : 
                        '<span class="text-muted">Completed</span>'}
                </td>
            `;
            paymentsTable.appendChild(row);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('[data-action="approve"]').forEach(btn => {
            btn.addEventListener('click', handlePaymentAction);
        });

        document.querySelectorAll('[data-action="reject"]').forEach(btn => {
            btn.addEventListener('click', handlePaymentAction);
        });
    }

    // Handle payment approval/rejection
    async function handlePaymentAction(e) {
        const paymentId = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;

        try {
            const response = await fetch(`/api/payments/${paymentId}/${action}`, {
                method: 'POST'
            });

            if (response.ok) {
                alert(`Payment #${paymentId} ${action}ed successfully!`);
                fetchData(); // Refresh data
            } else {
                alert(`Failed to ${action} payment.`);
            }
        } catch (error) {
            console.error(`Error ${action}ing payment:`, error);
        }
    }

    // Initialize the application
    init();
});
