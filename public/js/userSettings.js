document.addEventListener('DOMContentLoaded', function () {
    const updateSettingsForm = document.getElementById('settings_form');

    // Load settings when the page is loaded
    function loadSettings() {
        fetch('/getSettings')
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    data.forEach(setting => {
                        const element = document.getElementById(setting.setting_name);
                        if (element) {
                            element.value = setting.setting_value; // Populate field with setting value
                        }
                    });
                } else {
                    console.error('No settings data available.');
                    alert('Failed to load settings.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while loading settings.');
            });
    }

    loadSettings();

    // Handle form submission for updating settings
    updateSettingsForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const formData = new FormData(updateSettingsForm);
        const updatedSettings = Object.fromEntries(formData);
        fetch('/updateSettings', {
            method: 'POST',
            body: JSON.stringify(updatedSettings),
            headers: { 'Content-Type': 'application/json' },
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
});
