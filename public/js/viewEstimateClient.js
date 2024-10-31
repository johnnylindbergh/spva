
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

    var optionsTotal = 0;

    $.post('/loadOptions', {takeoff_id: takeoff_id}, function(data) {
        console.log(data);
        const table = $('#estimate-table');
        for (let i = 0; i < data.length; i++) {
            // Create a new row and set row_id as a data attribute
            const newRow = $('<tr>').attr('data-row-id', data[i].id);
            const descriptionCell = $('<td>').text(data[i].description);
            const amountCell = $('<td id= "amount">').text(data[i].cost);
            //data[i].applied should be used to set the state of the checkBoxCell
            
            // Create a checkbox cell
            const checkboxCell = $('<td>');
            const checkbox = $('<input>').attr('type', 'checkbox').attr('data-takeoff-id', takeoff_id);
            checkbox.prop('checked', data[i].applied);  // Set the checkbox state based on the data
            console.log(data[i].applied )
            if (data[i].cost && data[i].applied) {
                console.log("adding to total", data[i].cost);
                optionsTotal += parseFloat(data[i].cost.replace('$',''));
                console.log(optionsTotal)
            }
            
            // Add change event listener to the checkbox
            checkbox.on('change', function() {
                const isChecked = $(this).is(':checked');
                // Post to server when checkbox state changes

                $.post('updateOptionsSelection', {
                    takeoff_id: takeoff_id,
                    option_id: data[i].id,
                    applied: isChecked
                }, function(response) {
                    console.log('Checkbox updated:', response);
                     updateTotals();
                     window.location.reload();
                });
            });
            
            checkboxCell.append(checkbox);
            newRow.append(descriptionCell);
            newRow.append(amountCell);
            newRow.append(checkboxCell); // Append the checkbox cell to the row
            table.append(newRow);

            // Trigger post to server when editing is finished (focusout)
            descriptionCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
            });
            amountCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
            });
        }

            $('#options-total').text("$" + optionsTotal.toFixed(2));

        updateTotals();
    });


 
}

function updateTotals() {
    // Parse the subtotal and options-total values, ensuring to remove non-numeric characters
    const subtotalText = $('#subtotal').text().replace(/[^0-9.-]+/g, '');
    const subtotal = parseFloat(subtotalText) || 0;

    const optionsTotalText = $('#options-total').text().replace(/[^0-9.-]+/g, '');
    const optionsTotal = parseFloat(optionsTotalText) || 0;

    // Calculate the total as the sum of subtotal and options total
    const total = subtotal + optionsTotal;

    // Update the text content of subtotal, options-total, and total
    $('#subtotal').text("$" + subtotal.toFixed(2));
    $('#total').text("$" + total.toFixed(2));

    // Optional: Log to console for debugging purposes
    console.log("Subtotal:", subtotal);
    console.log("Options Total:", optionsTotal);
    console.log("Total:", total);
}

// Example usage: Call this function whenever data




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







// Example to dynamically populate content on page load
$(document).ready(function() {
    // Populate the "Proposal Includes" section with dynamic data
    const includesItems = ['Preparation of surfaces', 'Primer application', 'Final paint coat'];
    // post takeoff_id to getEstimateData to set includesItems and exclusionsItems
    
    $.post('/getEstimateData', {takeoff_id: parseInt($('#takeoff_id').val())}, function(data) {
        console.log(data)

        populateProposalIncludes(data.estimate[0].inclusions);
        populateExclusions(data.estimate[0].exclusions);
        populateOptions(parseInt($('#takeoff_id').val()));
        console.log(data.takeoff[0].total);
        $('#subtotal').text("$"+data.takeoff[0].total);

        updateEstimateTotal(parseFloat(data.takeoff[0].total));

        
    });
});
