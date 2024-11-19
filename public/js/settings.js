document.addEventListener('DOMContentLoaded', function() {
    const updateSettingsForm = document.getElementById('updateSettingsForm');
    const newMaterialForm = document.getElementById('newMaterialForm');

    updateSettingsForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(updateSettingsForm);
        fetch('/updateSettings', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Settings updated successfully!');
            } else {
                alert('Failed to update settings.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating settings.');
        });
    });

    newMaterialForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(newMaterialForm);
        fetch('/newMaterial', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('New material added successfully!');
            } else {
                alert('Failed to add new material.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while adding new material.');
        });
    });
});