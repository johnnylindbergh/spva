
$(document).ready(function() {
    // Fetch users from the server
    $.get('/userManagement/getUsers', function(users) {
        // Ensure users is an array (parse if necessary)
        if (typeof users === 'string') {
            try {
                users = JSON.parse(users);
            } catch (e) {
                $('#usersTableContainer').html('<p>Error loading users.</p>');
                return;
            }
        }
        if (!Array.isArray(users) || users.length === 0) {
            $('#usersTableContainer').html('<p>No users found.</p>');
            return;
        } else {
            console.log(users);
            window.users = users; // Store users in a global variable
            renderUsersTable(users);
        }
    });

    // Action handlers (edit, view, delete)
    $('#usersTableContainer').on('click', '.edit-btn', function() {
        const userId = $(this).data('id');
        $("#editUserModal").modal('show');

        fetch('/userManagement/getUser/' + userId)
            .then(response => response.json())
            .then(user => {
                $('#editUserId').val(user.id);
                $('#editUserName').val(user.name);
                $('#editUserEmail').val(user.email);
                $('#editUserPhoneNumber').val(user.phone_number);
                $('#editUserTitle').val(user.title);
            })
            .catch(error => console.error('Error fetching user:', error));
    });

    $('#editUserForm').on('submit', function(event) {
        event.preventDefault();
        const userId = $('#editUserId').val();
        const userData = {
            name: $('#editUserName').val(),
            email: $('#editUserEmail').val(),
            phone_number: $('#editUserPhoneNumber').val(),
            title: $('#editUserTitle').val()
        };

        $.ajax({
            url: '/userManagement/updateUser/' + userId,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(userData),
            success: function(response) {
             //   alert('User updated successfully!');
                $("#editUserModal").modal('hide');
                location.reload(); // Reload the page to see changes
            },
            error: function(error) {
                console.error('Error updating user:', error);
                alert('Error updating user.');
            }
        });
    });

    $('#usersTableContainer').on('click', '.view-btn', function() {
        const userId = $(this).data('id');
        fetch('/userManagement/getUser/' + userId)
            .then(response => response.json())
            .then(user => {
                $('#viewUserId').text(user.id);
                $('#viewUserEmail').text(user.email);
                $('#viewUserPhoneNumber').text(user.phone_number || 'None');
                $('#viewUserTitle').text(user.title);
                $("#viewUserModal").modal('show');
            })
            .catch(error => console.error('Error fetching user:', error));
    });

    $('#viewUserModal').on('hidden.bs.modal', function() {
        $('#viewUserId').text('');
        $('#viewUserEmail').text('');
        $('#viewUserPhoneNumber').text('');
        $('#viewUserTitle').text('');

    });

    $('#usersTableContainer').on('click', '.delete-btn', function() {
        const userId = $(this).data('id');
        fetch('/userManagement/getUser/' + userId)
            .then(response => response.json())
            .then(user => {
                $('#deleteUserId').text(user.id);
                $('#deleteUserEmail').text(user.email);
                $("#deleteUserModal").modal('show');
            })
            .catch(error => console.error('Error fetching user:', error));
    }
    );
    $('#deleteUserForm').on('submit', function(event) {
        event.preventDefault();
        const userId = $('#deleteUserId').text();

        $.ajax({
            url: '/userManagement/deleteUser/' + userId,
            type: 'DELETE',
            success: function(response) {
                alert('User deleted successfully!');
                $("#deleteUserModal").modal('hide');
                location.reload(); // Reload the page to see changes
            },
            error: function(error) {
                console.error('Error deleting user:', error);
                alert('Error deleting user.');
            }
        });
    });
});

function renderUsersTable(users) {
    let tableHtml = `
        <table class="table" id="usersTable">
            <thead>
                <tr>
                    <th>Send Email</th>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone Number</th>
                    <th>Title</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
// format the last login date to a more readable format

if (user.last_login) {
            user.last_login = new Date(user.last_login).toLocaleString();
        
        const lastLoginDate = new Date(user.last_login);
        const formattedDate = lastLoginDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        user.last_login = formattedDate;

    } else {
        user.last_login = 'Never';
    }


    // create a large, styled checkbox for sending email
    const emailCheckbox = `
        <input type="checkbox" class="form-check-input form-check-lg" id="sendEmail${user.id}" data-id="${user.id}" style="width: 1.5em; height: 1.5em;">
    `;


        tableHtml += `
            <tr>
                <td>${emailCheckbox}</td>
                <td>${user.id}</td>
                <td>
                    <span>${user.name}</span>
                    <span class="badge bg-info text-dark ms-2" data-bs-toggle="tooltip" title="Last Login">${user.last_login}</span>
                </td>
                <td>${user.email}</td>
                <td>${user.phone_number || 'None'}</td>
                <td>${user.title}</td>
                <td>
                    <button class="btn btn-outline-primary edit-btn" data-id="${user.id}">Edit</button>
                    <button class="btn btn-outline-danger delete-btn" data-id="${user.id}">Delete</button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;

    $('#usersTableContainer').html(tableHtml);
}



function onMassEmailButtonClick(){
    // collect the users that are checked and use window.users to get the user data and then append their email to the modal element 'recipients'
    const selectedUsers = [];
    $('#usersTable input[type="checkbox"]:checked').each(function() {
        console.log($(this).data('id'));
        // get the data-id
        const userId = $(this).data('id');
        const user = window.users.find(user => user.id === userId);
        if (user) {
            selectedUsers.push(user.email);
        }
    });
   

    // add selected user to recipients as options
    const recipients = document.getElementById('recipients');
    recipients.innerHTML = ''; // clear previous options
    selectedUsers.forEach(email => {
        const listItem = document.createElement('li');
        listItem.textContent = email;
        recipients.appendChild(listItem);
    });
    // show the modal
    $("#massEmailModal").modal('show');

 

}

// the function that gets the subject and body of the email as well as the recipients and sends the email
function sendMassEmail(event){
    event.preventDefault();
    const subject = document.getElementById('massEmailSubject').value;
    const body = document.getElementById('massEmailBody').value;
    const recipients = [];
    // get the recipients from the modal element 'recipients'
    const recipientList = document.getElementById('recipients');
    const recipientItems = recipientList.getElementsByTagName('li');
    for (let i = 0; i < recipientItems.length; i++) {
        const email = recipientItems[i].textContent;
        recipients.push(email);
    }
    console.log('Subject:', subject);
    console.log('Body:', body);
    console.log('Recipients:', recipients);

    // send the email using fetch
    fetch('/userManagement/sendMassEmail', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            subject: subject,
            body: body,
            recipients: recipients
        })
    })
    .then(response => {
        if (response.ok) {
            alert('Email sent successfully!');
            $("#massEmailModal").modal('hide');
            // clear the modal inputs
            document.getElementById('emailSubject').value = '';
            document.getElementById('emailBody').value = '';
            const recipients = document.getElementById('recipients');
            recipients.innerHTML = ''; // clear previous options
        } else {
            alert('Error sending email. Please try again.');
        }
    }
    );
}




function onSelectAllButtonClick(){
    console.log('Select all button clicked');
    // select all checkboxes
    $('#usersTable input[type="checkbox"]').each(function() {
        $(this).prop('checked', true);
    });
}
function onDeselectAllButtonClick(){
    console.log('Deselect all button clicked');
    // deselect all checkboxes
    $('#usersTable input[type="checkbox"]').each(function() {
        $(this).prop('checked', false);
    });
}



function onSelectAllSubcontractorsButtonClick(){
    onDeselectAllButtonClick();
    console.log('Select all subcontractors button clicked');
    // select all checkboxes of a user with user type 'subcontractor'
    $('#usersTable input[type="checkbox"]').each(function() {
        const userId = $(this).data('id');
        const user = window.users.find(user => user.id === userId);
        console.log(user);
        if (user && user.title === 'subcontractor') {
            console.log('User is a subcontractor');
            $(this).prop('checked', true);
        }
    });

}

function onSelectAllAdminsButtonClick(){
    onDeselectAllButtonClick();
    console.log('Select all admins button clicked');
    // select all checkboxes of a user with user type 'admin'
    $('#usersTable input[type="checkbox"]').each(function() {
        const userId = $(this).data('id');
        const user = window.users.find(user => user.id === userId);
        console.log(user);
        if (user && user.title === 'Admin') {
            console.log('User is an admin');
            $(this).prop('checked', true);
        }
    });

}

function onSelectAllSupervisorsButtonClick(){
    onDeselectAllButtonClick();
    console.log('Select all supervisors button clicked');
    // select all checkboxes of a user with user type 'supervisor'
    $('#usersTable input[type="checkbox"]').each(function() {
        const userId = $(this).data('id');
        const user = window.users.find(user => user.id === userId);
        console.log(user);
        if (user && user.title === 'supervisor') {
            console.log('User is a supervisor');
            $(this).prop('checked', true);
        }
    });

}


