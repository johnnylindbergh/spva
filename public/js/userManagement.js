
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
        tableHtml += `
            <tr>
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
