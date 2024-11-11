
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

var optionsTouched = false;

function populateOptions(takeoff_id) {   

    var optionsTotal = 0;

    $.post('/loadOptions', {takeoff_id: takeoff_id}, function(data) {
        
        var mutable = data.mutable;
                // if muteable is false, disable the signature form and hide it and add a div that says it has been signed
        if (!mutable) {
            $('.signature').toggle();
            $('.signature-success').toggle();
            $('#options-table').find('input').prop('disabled', true);
        }
        data = data.options;
        const table = $('#options-table');
        table.empty(); // Clear any existing content
        for (let i = 0; i < data.length; i++) {
            // Create a new row and set row_id as a data attribute
            const newRow = $('<tr>').attr('data-row-id', data[i].id);
            const descriptionCell = $('<td>').text(data[i].description);
            const amountCell = $('<td id= "amount">').text(data[i].cost);
            
            // Create a radio button cell
            const radioCell = $('<td >');
            // make the width 60px
            radioCell.css('width', '105px');
            const includeRadio = $('<input>').attr('type', 'radio').attr('name', 'option-' + data[i].id).attr('value', 'include');
            const excludeRadio = $('<input>').attr('type', 'radio').attr('name', 'option-' + data[i].id).attr('value', 'exclude');
            
            // Set the radio button state based on the data
            if (data[i].applied) {
                includeRadio.prop('checked', true);
                optionsTotal += parseFloat(data[i].cost.replace('$',''));
            } else {
                excludeRadio.prop('checked', true);
            }
            
            // Add change event listener to the radio buttons
            includeRadio.on('change', function() {
                if ($(this).is(':checked')) {
                    $.post('updateOptionsSelection', {
                        takeoff_id: takeoff_id,
                        option_id: data[i].id,
                        applied: true // mark as applied server side will toggle the value
                    }, function(response) {
                        console.log('Radio button updated:', response);
                        updateTotals();
                        optionsTouched = true;
                        //populateOptions(takeoff_id);
                        //window.location.reload();
                    });
                }
            });
            
            excludeRadio.on('change', function() {
                if ($(this).is(':checked')) {
                    $.post('updateOptionsSelection', {
                        takeoff_id: takeoff_id,
                        option_id: data[i].id,
                        applied: false
                    }, function(response) {
                        console.log('Radio button updated:', response);
                       
                        optionsTouched = true;
                        populateOptions(takeoff_id);

                        //window.location.reload();
                    });
                }
            });

            // if the options are not mutable, disable the radio buttons
            if (!mutable) {
                includeRadio.prop('disabled', true);
                excludeRadio.prop('disabled', true);
            }
            
            radioCell.append(includeRadio).append(' Yes ').append(excludeRadio).append(' No ');
            newRow.append(descriptionCell);
            newRow.append(amountCell);
            newRow.append(radioCell); // Append the radio button cell to the row
            table.append(newRow);

            // Trigger post to server when editing is finished (focusout)
            descriptionCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
            });
            amountCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
            });
        }

        $('#options-total').text("Options: $" + optionsTotal.toFixed(2));

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
    $('#subtotal').text("Subtotal: $" + subtotal.toFixed(2));
    $('#total').text("Total: $" + total.toFixed(2));

    // Optional: Log to console for debugging purposes
    console.log("Subtotal:", subtotal);
    console.log("Options Total:", optionsTotal);
    console.log("Total:", total);
}

// Example usage: Call this function whenever data




function handleSignatureChange() {
    // get the number of options
    const options = $('#options-table tr').length;

    if (!optionsTouched && options > 0) {
        alert("Please select options before signing");
        return;
    }

    const signatureInput = $('#signature').val();
    const dateInput = $('input[type="date"]').val();


    if (signatureInput === '') {
        alert('Please provide a signature');
        return;
    }   

    //console.log('Signature Updated:', signatureInput);
    
    // Prepare the data to send to the server
    const data = {
        takeoff_id: parseInt($('#takeoff_id').val()),
        signature: signatureInput,
        date: dateInput
    };

    // Send the data to the server via a POST request using jQuery
    $.post('/update-signature', data)
        .done(function(response) {
            console.log('Success:', response);
            if (response) {
                // show the signature success message
                $('.signature-success').toggle();
                // hide the signature form
                $('.signature').toggle();
                // make the options table read only
                $('#options-table').find('input').prop('disabled', true);
 

            }
        })
        .fail(function(error) {
            console.error('Error:', error);
        });
}



function createPaymentIntent() {
    // Prepare the data to send to the server

    // get takeoff_id from the hidden input field
   
       const takeoff_id = parseInt($('#takeoff_id').val());
    
    const data = {
        takeoff_id: takeoff_id
    };

    // Send the data to the server via a POST request using jQuery

    // form the post url
    const url = '/checkout/' + takeoff_id;
    $.post(url, data)
        .done(function(response) {
            console.log('Success:', response);
            if (response) {
                // Redirect to the checkout page
                window.location.href = '/checkout/'+takeoff_id;
            }
        })
        .fail(function(error) {
            console.error('Error:', error);
        });
}   





// Example to dynamically populate content on page load
$(document).ready(function() {
     $(".loader").toggle(); // hide it initially
     $(".signature-success").toggle(); // hide it initially
    // Populate the "Proposal Includes" section with dynamic data
    const includesItems = ['Preparation of surfaces', 'Primer application', 'Final paint coat'];
    // post takeoff_id to getEstimateData to set includesItems and exclusionsItems
    
    $.post('/getEstimateData', {takeoff_id: parseInt($('#takeoff_id').val())}, function(data) {
        console.log(data)

        populateProposalIncludes(data.estimate[0].inclusions);
        populateExclusions(data.estimate[0].exclusions);
        populateOptions(parseInt($('#takeoff_id').val()));
        console.log(data.takeoff[0].total);

        $('#includes-total').text("$"+data.takeoff[0].total);
        $('#subtotal').text("$"+data.takeoff[0].total);


      
        

        //call update totals every few seconds
        //setInterval(updateTotals, 5000);
        
    });
});
