
// Function to populate the "Proposal Includes" section
function populateProposalIncludes(items) {
    const includesList = $('#includes-list');
    includesList.empty(); // Clear any existing content

    // set the content of the includesList to the items
    // items is a string 
    includesList.text(items);
   // $('#includes-total').text(calculateTotal(items.length, 50)); // Example calculation
}

// Function to populate the "Exclusions & Assumptions" section
function populateExclusions(exclusions) {
    const exclusionsList = $('#exclusions-list');
    exclusionsList.empty(); // Clear any existing content

    exclusionsList.text(exclusions);


    $('#excludes-total').text("$0.00"); 
}

function populateOptions(takeoff_id) {   
    $.post('/loadOptions', {takeoff_id: takeoff_id}, function(data) {
        console.log(data);
        const table = $('#estimate-table');
        for (let i = 0; i < data.length; i++) {
            // Create a new row and set row_id as a data attribute
            const newRow = $('<tr>').attr('data-row-id', data[i].id);
            const descriptionCell = $('<td contenteditable="true" class="editable">').text(data[i].description);
            const amountCell = $('<td contenteditable="true" class="editable">').text(data[i].cost);
            newRow.append(descriptionCell);
            newRow.append(amountCell);
            table.append(newRow);

            // Trigger post to server when editing is finished (focusout)
            descriptionCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
            });
            amountCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
            });
        }
    });
}



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

function populateOptions(takeoff_id) {   
    $.post('/loadOptions', {takeoff_id: takeoff_id}, function(data) {
        console.log(data);
        const table = $('#estimate-table');
        for (let i = 0; i < data.length; i++) {
            const newRow = $('<tr>').data('row_id', data[i].id); // Store row_id as data attribute
            const descriptionCell = $('<td contenteditable="true" class="editable">').text(data[i].description);
            const amountCell = $('<td contenteditable="true" class="editable">').text(data[i].cost);
            newRow.append(descriptionCell);
            newRow.append(amountCell);
            table.append(newRow);

            // Trigger post to server when editing is finished (focusout)
            descriptionCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.data('row_id'));
            });
            amountCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.data('row_id'));
            });
        }
    });
}

function addOption(takeoff_id) {
    if (takeoff_id == null) {
        takeoff_id = parseInt($('#takeoff_id').val());
    }

    console.log("Adding option to takeoff ", takeoff_id);

    const table = $('#estimate-table');
    const newRow = $('<tr>').attr('data-row-id', null); // New rows initially have no row_id
    const descriptionCell = $('<td contenteditable="true" class="editable">').text('');
    const amountCell = $('<td contenteditable="true" class="editable">').text('0.00');
    newRow.append(descriptionCell);
    newRow.append(amountCell);
    table.append(newRow);

    // Trigger post to server when editing is finished (focusout)
    descriptionCell.on('focusout', function() {
        postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
    });
    amountCell.on('focusout', function() {
        postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
    });

    // Initial post when row is added
    postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
}

function postToAddOption(description, amount, takeoff_id, row_id) {
    const data = {
        option: description,
        cost_delta: amount,
        takeoff_id: takeoff_id,
        row_id: row_id // Include row_id in the data
    };

    // Send the data to the server via a POST request using jQuery
    $.post('/add-row', data)
        .done(function(response) {
            console.log('Row added/updated successfully:', response);

            // Update the row_id if it was a new row and server provided an ID
            if (!row_id && response.new_row_id) {
                $('[data-row-id="null"]').attr('data-row-id', response.new_row_id);
            }
        })
        .fail(function(error) {
            console.error('Error adding/updating row:', error);
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
            var takeoff_id = $('#takeoff_id').val(); // not super safe, but just for example
            console.log(takeoff_id);
            $.post('/update-content', { id: takeoff_id, content: content })
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
    // post takeoff_id to getEstimateData to set includesItems and exclusionsItems
    
    $.post('/getEstimateData', {takeoff_id: 1}, function(data) {
        console.log(data)

        populateProposalIncludes(data.estimate[0].inclusions);
        populateExclusions(data.estimate[0].exclusions);
        populateOptions(parseInt($('#takeoff_id').val()));
        console.log(data.takeoff[0].total);
        $('#includes-total').text("$"+data.takeoff[0].total);
 
    });



    

    // Add event listeners for editable fields
    addEditableListeners();
});
