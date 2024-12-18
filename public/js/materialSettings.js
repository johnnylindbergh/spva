


// Function to populate materials table
function populateMaterials(materials) {
    const table = document.getElementById('materials');
    // Clear existing rows
    table.innerHTML = '';
    // Populate with new materials
    materials.forEach(material => {
        const row = table.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        const cell3 = row.insertCell(2);
        const cell4 = row.insertCell(3);
        cell1.innerHTML = material.name;
        cell2.innerHTML = material.desc;
        cell3.innerHTML = `$${material.cost}`;
        cell4.innerHTML = material.type;
    });
}

// Function to add a new material
function addMaterial() {
    const form = document.getElementById('add_material_form');
    const feedback = document.getElementById('feedback');

    const data = {
        name: form.name.value,
        desc: form.desc.value,
        cost: parseFloat(form.cost.value),
        coverage: parseFloat(form.coverage.value),
        material_type: form.material_type.value
    };

    // Implement the logic to add a new material
    // This might involve an AJAX call to your server to save the material
    // Implement the logic to add a new material using jQuery's $.ajax method
    $.ajax({
        url: '/newMaterial',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(result) {
            if (result.success) {
                feedback.style.display = 'block';
                feedback.style.color = 'green';
                feedback.textContent = 'Material added successfully!';
                form.reset();
            } else {
                feedback.style.display = 'block';
                feedback.style.color = 'red';
                feedback.textContent = 'Failed to add material: ' + result.message;
            }
        },
        error: function(xhr, status, error) {
            feedback.style.display = 'block';
            feedback.style.color = 'red';
            feedback.textContent = 'Error: ' + error;
        }
    });
}

// Function to get material types and populate the dropdown
function getMaterialTypes() {
    $.ajax({
        url: '/getMaterialTypes',
        method: 'GET',
        success: function(data) {
            const typeDropdown = document.getElementById('type');
            typeDropdown.innerHTML = ''; // Clear existing options
            data.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.text = type;
                typeDropdown.append(option);
            });
        },
        error: function(error) {
            console.error('Error loading material types:', error);
        }
    });
}

// Function to filter the material library
function filterFunction() {
    const input = document.getElementById('myInput');
    const filter = input.value.toUpperCase();
    const div = document.getElementById('myDropdown');
    const a = div.getElementsByTagName('a');
    for (let i = 0; i < a.length; i++) {
        const txtValue = a[i].textContent || a[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            a[i].style.display = '';
        } else {
            a[i].style.display = 'none';
        }
    }
}

// Function to handle dropdown menu
function myFunction() {
    document.getElementById('myDropdown').classList.toggle('show');
}

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        const dropdowns = document.getElementsByClassName('dropdown-content');
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// Call getMaterialTypes to populate the dropdown on page load
document.addEventListener('DOMContentLoaded', getMaterialTypes);


