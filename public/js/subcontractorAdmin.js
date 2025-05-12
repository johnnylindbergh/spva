
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const createJobForm = document.getElementById('createJobForm');
    const assignJobForm = document.getElementById('assignJobForm');
    const jobSelect = document.getElementById('jobSelect');
    const subcontractorSelect = document.getElementById('subcontractorSelect');
    const allottedBidInput = document.getElementById('allottedBid');
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
            const [jobsData, subcontractorsData, formsData, paymentsData, agreementsData, assignmentsData, ticketsData, supervisorsData] = await Promise.all([
                fetch('/api/jobs').then(res => res.json()),
                fetch('/api/subcontractors').then(res => res.json()),
                fetch('/api/forms').then(res => res.json()),
                fetch('/api/payments').then(res => res.json()),
                fetch('/api/agreements').then(res => res.json()),
                fetch('/api/assignments').then(res => res.json()),
                fetch('api/tickets').then(res => res.json()),
                fetch('/api/supervisors').then(res => res.json())

            ]);

            renderJobSelect(jobsData);
            renderJobsTable(jobsData);
            renderJobSelectAgreement(jobsData);
            renderSubcontractorSelect(subcontractorsData);
            renderSubcontractorExportSelect(subcontractorsData);
            renderSubcontractorSelectAgreement(subcontractorsData);
            renderFormsTable(formsData);
            renderPaymentsTable(paymentsData);
            renderAgreementsTable(agreementsData);
            renderAssignmentsTable(assignmentsData);
            renderTicketsTable(ticketsData);
            renderTicketJobSelect(jobsData);
            renderTicketSubcontractorSelect(subcontractorsData);
            renderSupervisorsSelect(supervisorsData);

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        createJobForm.addEventListener('submit', handleCreateJob);
        assignJobForm.addEventListener('submit', handleAssignJob);
    }

    // Handle agreement creation
    async function handleCreateAgreement(e) {
        e.preventDefault();

        const subcontractorId = parseInt(document.getElementById('subcontractorSelectAgreement').value);
        const jobId = parseInt(document.getElementById('jobSelectAgreement').value);
        const agreementDetails = document.getElementById('agreementDetails').value;
        const agreementPdf = document.getElementById('agreementPdf').files[0];

        if (!subcontractorId || !jobId || !agreementDetails || !agreementPdf) {
            console.log("subcontractorId:", subcontractorId);
            console.log("jobId:", jobId);
            console.log("agreementDetails:", agreementDetails);
            console.log("agreementPdf:", agreementPdf);
            alert('Please fill in all fields and upload a PDF.');
            return;
        }

        const formData = new FormData();
        formData.append('subcontractorId', subcontractorId);
        formData.append('jobId', jobId);
        formData.append('agreementDetails', agreementDetails);
        formData.append('agreementPdf', agreementPdf);

        try {
            const response = await fetch('/api/agreement/create', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('Agreement created successfully!');
                document.getElementById('createAgreementForm').reset();
                fetchData(); // Refresh data
            } else {
                console.log('Failed to create agreement:', response.statusText);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.statusText,
                });
            }
        } catch (error) {
            console.error('Error creating agreement:', error);
        }
    }

    // Add event listener for the agreement form
    document.getElementById('createAgreementForm').addEventListener('submit', handleCreateAgreement);
    // Handle job creation
    async function handleCreateJob(e) {
        e.preventDefault();

        const jobName = document.getElementById('jobName').value;
        const jobDescription = document.getElementById('jobDescription').value;
        const jobLocation = document.getElementById('jobLocation').value;
        const jobStartDate = document.getElementById('jobStartDate').value;
        const jobEndDate = document.getElementById('jobEndDate').value;
        const jobTypeBid = document.getElementById('jobTypeBid').checked;
        const jobTypeTM = document.getElementById('jobTypeTM').checked;

        const supervisorId = parseInt(document.getElementById('supervisorSelect').value);
       

        // if jobTypeBid is selected, set jobType to 'bid'
        // if jobTypeTM is selected, set jobType to 'tm'

        console.log("job type bid:", jobTypeBid);
        console.log("job type tm:", jobTypeTM);
        let jobType = '';
        if (jobTypeBid) {
            jobType = 'bid';
        } else if (jobTypeTM) {
            jobType = 'tm';
        }

        try {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_name: jobName,
                    job_description: jobDescription,
                    job_location: jobLocation,
                    job_start_date: jobStartDate,
                    job_end_date: jobEndDate,
                    job_type: jobType
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
        const allottedBid = parseFloat(allottedBidInput.value);

        try {
            const response = await fetch('/api/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, subcontractorId, allottedBid })
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Job assigned successfully!',
                });
                assignJobForm.reset();
                // Refresh data
                fetchData();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.statusText,
                });
            }
        } catch (error) {
            console.error('Error assigning job:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while assigning the job.',
            });
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
                <button class="btn btn-sm btn-primary me-2" data-id="${job.id}" data-action="editJob">Edit</button>
                <button class="btn btn-sm btn-danger" data-id="${job.id}" data-action="deleteJob">Delete</button>
            `;

            row.innerHTML = `
                <td>${job.job_name}</td>
                <td>${job.job_location}</td>
        
                <td>${job.job_description}</td>
                <td>${job.job_type}</td>
                
            `;
            row.innerHTML += `<td>${actions}</td>`;
            jobsTable.appendChild(row);
        });
    }


    // Add event listeners using event delegation
    document.getElementById('jobsTable').addEventListener('click', function(e) {
        if (e.target && (e.target.dataset.action === 'editJob' || e.target.dataset.action === 'deleteJob')) {
            handleJobAction(e);
        }
    });
    async function handleJobAction(e) {
        
        // the button data-id is the job id
        const jobId = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;
        console.log("jobId h:", jobId);
        console.log("action:", action);
        if (action === 'editJob') {
            // Open the edit modal and populate it with job data
            const job = await fetch(`/api/jobs/${jobId}`).then(res => res.json());
            console.log("job:", job);
            document.getElementById('editJobId').value = job.id;
            document.getElementById('editJobName').value = job.job_name;
            document.getElementById('editJobDescription').value = job.job_description;
            document.getElementById('editJobLocation').value = job.job_location;

            // Format the dates to YYYY-MM-DD
            const startDate = new Date(job.job_start_date);
            const formattedStartDate = startDate.toISOString().split('T')[0];
            const endDate = new Date(job.job_end_date);
            const formattedEndDate = endDate.toISOString().split('T')[0];
            job.job_start_date = formattedStartDate;
            job.job_end_date = formattedEndDate;

            document.getElementById('editJobStartDate').value = job.job_start_date;
            document.getElementById('editJobEndDate').value = job.job_end_date;
            $('#jobEditModal').modal('show');
        }
        else if (action === 'deleteJob') {
            // Confirm deletion
            if (confirm(`Are you sure you want to delete job?`)) {
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

    //  add listner to the saveChangesBtn button
    document.getElementById('saveChangesBtn').addEventListener('click', async function() {
        const jobId = document.getElementById('editJobId').value;
        const jobName = document.getElementById('editJobName').value;
        const jobDescription = document.getElementById('editJobDescription').value;
        const jobLocation = document.getElementById('editJobLocation').value;
        const jobStartDate = document.getElementById('editJobStartDate').value;
        const jobEndDate = document.getElementById('editJobEndDate').value;
        console.log("jobId:", jobId);
            console.log("jobName:", jobName);
            console.log("jobDescription:", jobDescription);
            console.log("jobLocation:", jobLocation);
            console.log("jobStartDate:", jobStartDate);
            console.log("jobEndDate:", jobEndDate);

        if (!jobId || !jobName || !jobDescription || !jobLocation || !jobStartDate || !jobEndDate) {
            alert('Please fill in all fields.');
            console.log("jobId:", jobId);
            console.log("jobName:", jobName);
            console.log("jobDescription:", jobDescription);
            console.log("jobLocation:", jobLocation);
            console.log("jobStartDate:", jobStartDate);
            console.log("jobEndDate:", jobEndDate);
            
            return;
        }

        try {
            const response = await fetch(`/api/updateJob/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    job_name: jobName,
                    job_description: jobDescription,
                    job_location: jobLocation,
                    job_start_date: jobStartDate,
                    job_end_date: jobEndDate
                })
            });
            if (response.ok) {
                alert(`Job "${jobName}" updated successfully!`);
                fetchData(); // Refresh data
                $('#jobEditModal').modal('hide'); // Hide the modal
            } else {
                alert('Failed to update job.');
            }
        } catch (error) {
            console.error('Error updating job:', error);
        }
    });


    function renderAssignmentsTable(assignments) {
        const assignmentsTable = document.getElementById('assignmentsTable');
        assignmentsTable.innerHTML = '';
        if (assignments.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">No assignments available</td>';
            assignmentsTable.appendChild(row);
            return;
        }
        assignments.forEach(assignment => {
            const row = document.createElement('tr');
            console.log("assignment:", assignment);
            row.innerHTML = `

                <td>${assignment.job_name}</td>
                <td>${assignment.subcontractorName}</td>
                <td>$${assignment.allotted_bid}</td>
                <td>
                    <button class="btn btn-sm btn-danger" data-id="${assignment.id}" data-action="deleteAssignment">Delete</button>
                </td>
            `;
            assignmentsTable.appendChild(row);
        });
        // Add event listeners to action buttons
        document.querySelectorAll('[data-action="deleteAssignment"]').forEach(btn => {
            btn.addEventListener('click', handleAssignmentAction);
        });
    }

    async function handleAssignmentAction(e) {
        const assignmentId = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;
        if (action === 'handleAssignment') {
            // Confirm deletion
            if (confirm(`Are you sure you want to delete assignment #${assignmentId}?`)) {
                try {
                    const response = await fetch(`/api/assignments/${assignmentId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        alert(`Assignment #${assignmentId} deleted successfully!`);
                        

                        fetchData(); // Refresh data
                    }
                    else {
                        alert('Failed to delete assignment.');
                    }
                } catch (error) {
                    console.error('Error deleting assignment:', error);
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

    function renderSubcontractorSelectAgreement(subcontractors) {
        const subcontractorSelectAgreement = document.getElementById('subcontractorSelectAgreement');
        subcontractorSelectAgreement.innerHTML = '<option value="">Select Subcontractor</option>';
        subcontractors.forEach(subcontractor => {
            const option = document.createElement('option');
            option.value = subcontractor.id;
            option.textContent = subcontractor.name;
            subcontractorSelectAgreement.appendChild(option);
        });
    }
    function renderAgreementsTable(agreements) {
        console.log("agreements:", agreements);
        const agreementsTable = document.getElementById('agreementsTable');
        agreementsTable.innerHTML = '';
        if (agreements.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">No agreements available</td>';
            agreementsTable.appendChild(row);
            return;
        }

        agreements.forEach(agreement => {
            const row = document.createElement('tr');

            // Format the agreement.created_at to YYYY-MM-DD
            const date = new Date(agreement.created_at);
            const formattedDate = date.toISOString().split('T')[0];
            agreement.created_at = formattedDate;

            row.innerHTML = `
                <td>${agreement.id}</td>
                <td>
                    <span class="description-hover" data-bs-toggle="tooltip" title="${agreement.description}">
                        ${agreement.description.length > 30 ? agreement.description.substring(0, 30) + '...' : agreement.description}
                    </span>
                </td>
                <td>${agreement.subcontractorName}</td>
                <td>${agreement.created_at}</td>
                <td><a href="/subcontractorAdmin/viewAgreement/?agreement_id=${agreement.agreement_id}" target="_blank">View</a></td>
                <td>${agreement.status}</td>
                <td>
                    <button class="btn btn-sm btn-danger" data-id="${agreement.agreement_id}" data-action="deleteAgreement">Delete</button>
                </td>
            `;
            agreementsTable.appendChild(row);
        });

        // Initialize Bootstrap tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('[data-action="deleteAgreement"]').forEach(btn => {
            btn.addEventListener('click', handleAgreementDelete);
        });
    }

    // Handle agreement deletion
    async function handleAgreementDelete(e) {
        const agreementId = parseInt(e.target.dataset.id);
        if (confirm(`Are you sure you want to delete agreement #${agreementId}?`)) {
            try {
                const response = await fetch(`/api/agreements/${agreementId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    alert(`Agreement #${agreementId} deleted successfully!`);
                    fetchData(); // Refresh data
                } else {
                    alert('Failed to delete agreement.');
                }
            } catch (error) {
                console.error('Error deleting agreement:', error);
            }
        }
    }
    
    function renderJobSelectAgreement(jobs) {
        const jobSelectAgreement = document.getElementById('jobSelectAgreement');
        jobSelectAgreement.innerHTML = '<option value="">Select Job</option>';
        jobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = `${job.job_name} `;
            jobSelectAgreement.appendChild(option);
        });
    }

    // Render forms table
    function renderFormsTable(forms) {
        console.log("forms:", forms);   
        subcontractorFormsTable.innerHTML = '';

        // Create a dropdown for filtering by week
        const searchContainer = document.createElement('div');
        searchContainer.classList.add('mb-3');
        searchContainer.innerHTML = `
            <label for="weekDropdown" class="form-label">Filter by Week:</label>
            <select id="weekDropdown" class="form-select">
                <option value="">All Weeks</option>
            </select>
        `;
        subcontractorFormsTable.parentElement.insertBefore(searchContainer, subcontractorFormsTable);

        const weekDropdown = document.getElementById('weekDropdown');

        // Generate all weeks from forms data
        const weeks = forms.map(form => {
            const date = new Date(form.form_created_at);
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            return startOfWeek.toISOString().split('T')[0];
        });

        // Get unique weeks and sort them in descending order (newest first)
        const uniqueWeeks = Array.from(new Set(weeks)).sort((a, b) => new Date(b) - new Date(a));

        // Populate the dropdown with all weeks
        uniqueWeeks.forEach(week => {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `Week of ${week}`;
            weekDropdown.appendChild(option);
        });

        // Filter forms by the selected week
        function filterFormsByWeek() {
            const selectedWeek = weekDropdown.value;
            if (!selectedWeek) {
                renderForms(forms); // Render all forms if no week is selected
                return;
            }

            const startOfWeek = new Date(selectedWeek);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            const filteredForms = forms.filter(form => {
                const formDate = new Date(form.form_created_at);
                return formDate >= startOfWeek && formDate <= endOfWeek;
            });

            renderForms(filteredForms);
        }

        // Render forms into the table
        function renderForms(formsToRender) {
            subcontractorFormsTable.innerHTML = '';
            if (formsToRender.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="4" class="text-center">No forms found for the selected week</td>';
                subcontractorFormsTable.appendChild(row);
                return;
            }

            formsToRender.forEach(form => {
                const row = document.createElement('tr');


                // format the date to YYYY-MM-DD
                const date = new Date(form.form_created_at);
                const formattedDate = date.toISOString().split('T')[0];
                form.form_created_at = formattedDate;
                
                row.innerHTML = `
                    <td>${form.form_id}</td>
                    <td>${form.name}</td>
                    <td>${form.form_created_at}</td>
                    <td><a href="/subcontractor/viewForm/?id=${form.form_id}" target="_blank">${form.form_name}</a></td>
                `;
                subcontractorFormsTable.appendChild(row);
            });
        }

        // Initial render of all forms
        renderForms(forms);

        // Add event listener to the dropdown
        weekDropdown.addEventListener('change', filterFormsByWeek);
    }

    function renderTicketsTable(tickets) {
        console.log("tickets:", tickets);
        const ticketsTable = document.getElementById('ticketsTable');
        ticketsTable.innerHTML = '';
        if (tickets.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">No tickets available</td>';
            ticketsTable.appendChild(row);
            return;
        } else {
            tickets.forEach(ticket => {
                const row = document.createElement('tr');
             
                row.innerHTML = `
                    <td>${ticket.ticket_number}</td>
                    <td>${ticket.ticket_description}</td>
                    <td>${ticket.subcontractorName}</td>
                    <td>${ticket.job_name}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" data-id="${ticket.id}" data-action="viewTicket">View</button>
                        <button class="btn btn-sm btn-danger" data-id="${ticket.id}" data-action="deleteTicket">Delete</button>
                    </td>
                `;
                ticketsTable.appendChild(row);
            });
        }
        // Add event listeners to action buttons
        document.querySelectorAll('[data-action="viewTicket"]').forEach(btn => {
            btn.addEventListener('click', handleTicketAction);
        });
        document.querySelectorAll('[data-action="deleteTicket"]').forEach(btn => {
            btn.addEventListener('click', handleTicketAction);
        });
    }

    async function handleTicketAction(e) {
        const ticketId = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;
        if (action === 'viewTicket') {
            // Open the view modal and populate it with ticket data
            const ticket = await fetch(`/api/tickets/${ticketId}`).then(res => res.json());
            console.log("ticket:", ticket);
            document.getElementById('viewTicketNumber').textContent = ticket.ticket_number;
            document.getElementById('viewTicketDescription').textContent = ticket.ticket_description;
            document.getElementById('viewTicketSubcontractor').textContent = ticket.subcontractorName;
            document.getElementById('viewTicketJob').textContent = ticket.job_name;
            $('#ticketViewModal').modal('show');
        }
        else if (action === 'deleteTicket') {
            // Confirm deletion
            if (confirm(`Are you sure you want to delete ticket #${ticketId}?`)) {
                try {
                    const response = await fetch(`/api/tickets/${ticketId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        alert(`Ticket #${ticketId} deleted successfully!`);
                        fetchData(); // Refresh data
                    } else {
                        alert('Failed to delete ticket.');
                    }
                } catch (error) {
                    console.error('Error deleting ticket:', error);
                }
            }
        }
    }




    function renderTicketJobSelect(jobs) {
        const ticketJobSelect = document.getElementById('jobSelectTicket');
        ticketJobSelect.innerHTML = '<option value="">Select Job</option>';
        jobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = job.job_name;
            ticketJobSelect.appendChild(option);
        });


    }

    function renderSupervisorsSelect(supervisors) {
        console.log("supervisors:", supervisors);
        const supervisorSelect = document.getElementById('supervisorSelect');
        supervisorSelect.innerHTML = '<option value="">Select Supervisor</option>';
        supervisors.forEach(supervisor => {
            const option = document.createElement('option');
            option.value = supervisor.id;
            option.textContent = `${supervisor.name}`;
            supervisorSelect.appendChild(option);
        });
    }
    

    function renderTicketSubcontractorSelect(subcontractors) {
        const ticketSubcontractorSelect = document.getElementById('subcontractorSelectTicket');
        ticketSubcontractorSelect.innerHTML = '<option value="">Select Subcontractor</option>';
        subcontractors.forEach(subcontractor => {
            const option = document.createElement('option');
            option.value = subcontractor.id;
            option.textContent = subcontractor.name;
            ticketSubcontractorSelect.appendChild(option);
        });
    }



    function handleTicketFormSubmit(e) {
        e.preventDefault();
        const ticketName = document.getElementById('ticketName').value;
        const ticketNumber = document.getElementById('ticketNumber').value;
        const ticketDescription = document.getElementById('ticketDescription').value;
        const jobId = parseInt(document.getElementById('jobSelectTicket').value);
        const subcontractorId = parseInt(document.getElementById('subcontractorSelectTicket').value);
        if (!ticketNumber || !ticketDescription || !jobId || !subcontractorId) {
            alert('Please fill in all fields.');
            return;
        }

        const data = {
            ticket_name: ticketName,
            ticket_number: ticketNumber,
            ticket_description: ticketDescription,
            job_id: jobId,
            subcontractor_id: subcontractorId
        };

        fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                alert('Ticket created successfully!');
                document.getElementById('ticketForm').reset();
                fetchData(); // Refresh data
            } else {
                alert('Failed to create ticket.');
            }
        })
        .catch(error => {
            console.error('Error creating ticket:', error);
        });
    }
    // Add event listener to the ticket form

    document.getElementById('ticketForm').addEventListener('submit', handleTicketFormSubmit);
    // Render payments table

    



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
                        `<button class="btn btn-sm btn-success me-2" data-id="${payment.id}" data-action="approvePayment">Approve</button>
                         <button class="btn btn-sm btn-danger" data-id="${payment.id}" data-action="rejectPayment">Reject</button>` : 
                        '<span class="text-muted">Completed</span>'}
                </td>
            `;
            paymentsTable.appendChild(row);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('[data-action="approvePayment"]').forEach(btn => {
            btn.addEventListener('click', handlePaymentAction);
        });

        document.querySelectorAll('[data-action="rejectPayment"]').forEach(btn => {
            btn.addEventListener('click', handlePaymentAction);
        });
    }

    // Handle payment approval/rejection
    async function handlePaymentAction(e) {
        const paymentId = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;

        const data = {
            paymentId: paymentId,
            status: action
        };

        try {
            const response = await fetch(`/api/payments/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const responseData = await response.json();
            if (responseData.status == "success") {
                alert(`Payment #${paymentId} ${action}ed successfully!`);
                fetchData(); // Refresh data
            } else {
                alert(`Failed to ${action} payment.`);
            }
        } catch (error) {
            console.error(`Error ${action}ing payment:`, error);
        }
    }

    function renderSubcontractorExportSelect(subcontractors) {
        const subcontractorExportSelect = document.getElementById('subcontractorSelectExport');
        subcontractorExportSelect.innerHTML = '<option value="">Select Subcontractor</option>';
        subcontractors.forEach(subcontractor => {
            const option = document.createElement('option');
            option.value = subcontractor.id;
            option.textContent = subcontractor.name;
            subcontractorExportSelect.appendChild(option);
        });
    }
    // Add event listener to the exportPaymentsBtn button

    // add listner to the exportPaymentsBtn 
    document.getElementById('exportPaymentsBtn').addEventListener('click', async function() {

        const subcontractorId = parseInt(document.getElementById('subcontractorSelectExport').value);

        if (!subcontractorId) {
            alert('Please select a subcontractor.');
            return;
        }
        const data = {
            subcontractorId: subcontractorId
        };
        
        try {
            const response = await fetch('/api/payments/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'payments.csv';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert('Failed to export payments.');
            }
        } catch (error) {
            console.error('Error exporting payments:', error);
        }
    });

    

    // Initialize the application
    init();
});
