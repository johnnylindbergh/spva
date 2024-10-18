// Function to populate the "Proposal Includes" section
function populateProposalIncludes(items) {
    const includesList = $('#includes-list');
    includesList.empty(); // Clear any existing content

    items.forEach(item => {
        const li = $('<li>').text(item);
        includesList.append(li);
    });

    // Set the total value dynamically
    $('#includes-total').text(calculateTotal(items.length, 100)); // Example calculation
}

// Function to populate the "Exclusions & Assumptions" section
function populateExclusions(exclusions) {
    const exclusionsList = $('#exclusions-list');
    exclusionsList.empty(); // Clear any existing content

    exclusions.forEach(exclusion => {
        const li = $('<li>').text(exclusion);
        exclusionsList.append(li);
    });

    // Set the total value dynamically
    $('#excludes-total').text(calculateTotal(exclusions.length, 50)); // Example calculation
}

// Simple function to calculate totals (for demonstration purposes)
function calculateTotal(quantity, pricePerItem) {
    return '$' + (quantity * pricePerItem).toFixed(2);
}

// Function to handle the signature input change and POST data to the server
function handleSignatureChange() {
    const signatureInput = $('#signature').val();
    const dateInput = $('input[type="date"]').val();

    console.log('Signature Updated:', signatureInput);
    
    // Prepare the data to send to the server
    const data = {
        signature: signatureInput,
        date: dateInput
    };

    // Send the data to the server via a POST request using jQuery
    $.post('/update-signature', data)
        .done(function(response) {
            console.log('Success:', response);
        })
        .fail(function(error) {
            console.error('Error:', error);
        });
}

// Function to add a new editable row to the estimate table and POST data to the server
function addOption() {
    const table = $('#estimate-table');
    
    // Create a new row with editable cells
    const newRow = $('<tr>');
    const descriptionCell = $('<td contenteditable="true" class="editable">').text('Enter description here...');
    const amountCell = $('<td contenteditable="true" class="editable">').text('0.00');

    newRow.append(descriptionCell);
    newRow.append(amountCell);
    table.append(newRow);

    // Trigger post to server when content is changed
    descriptionCell.on('input', function() {
        postToAddOption(descriptionCell.text(), amountCell.text());
    });
    amountCell.on('input', function() {
        postToAddOption(descriptionCell.text(), amountCell.text());
    });

    // Initial post when row is added
    postToAddOption(descriptionCell.text(), amountCell.text());
}

// Example function to handle new row data and POST it to the server
function postToAddOption(description, amount) {
    const data = {
        description: description,
        amount: amount
    };

    // Send the data to the server via a POST request using jQuery
    $.post('/add-row', data)
        .done(function(response) {
            console.log('Row added successfully:', response);
        })
        .fail(function(error) {
            console.error('Error adding row:', error);
        });
}

// Function to add onclick and oninput listeners to all editable elements
function addEditableListeners() {
    // Add listeners to all elements with the class "editable"
    $('.editable').each(function() {
        const element = $(this);
        
        // On click, log and focus the element
        element.on('click', function() {
            console.log('Element clicked:', element.text());
            element.focus();
        });

        // On input, send POST request to server when content changes
        element.on('input', function() {
            const content = element.text();
            const elementId = element.attr('id');
            console.log('Content changed:', content);

            // Send POST request with the new content
            $.post('/update-content', { id: elementId, content: content })
                .done(function(response) {
                    console.log('Content updated successfully:', response);
                })
                .fail(function(error) {
                    console.error('Error updating content:', error);
                });
        });
    });
}

// Example to dynamically populate content on page load
$(document).ready(function() {
    // Populate the "Proposal Includes" section with dynamic data
    const includesItems = ['Preparation of surfaces', 'Primer application', 'Final paint coat'];
    populateProposalIncludes(includesItems);

    // Populate the "Exclusions & Assumptions" section with dynamic data
    const exclusionsItems = ['Lead paint abatement', 'Mold remediation'];
    populateExclusions(exclusionsItems);

    // Add event listeners for editable fields
    addEditableListeners();
});
