

function updateTakeoffOwnerEmailAddress(){
    let email = $("#owner_email_address").val();
    let takeoff_id = $("#takeoff_id").val();
    console.log("Updating takeoff owner email address: " + email);
    $.post("/update-takeoff-owner-email", { takeoff_id: takeoff_id, owner_email_address: email })
      .done(function() {
        console.log("Takeoff owner email address updated: " + email);
      })
      .fail(function() {
        console.log("Failed to update takeoff owner email address: " + email);
      });
  }

  function updateTakeoffInvoiceEmailAddress(){
    let email = $("#invoice_email_address").val();
    let takeoff_id = $("#takeoff_id").val();
    console.log("Updating takeoff owner email address: " + email);
    $.post("/update-takeoff-invoice-email", { takeoff_id: takeoff_id, invoice_email_address: email })
      .done(function() {
        console.log("Takeoff invoice email address updated: " + email);
      })
      .fail(function() {
        console.log("Failed to update takeoff invoive email address: " + email);
      });
  }

// Function to convert markdown-like text to HTML
function formatTextToHTML(text) {
    if (text == null) {
        return "Chat GPT ERROR: No text provided";
    }
    return text
        .replace(/### (.+)/g, '<h3>$1</h3>')        // Replace ### with <h3> for headings
        .replace(/## (.+)/g, '<h2>$1</h2>')        // Replace ## with <h2> for subheadings
        .replace(/# (.+)/g, '<h1>$1</h1>')         // Replace # with <h1> for main headings
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Replace **text** with <strong>text</strong>
        .replace(/\*(.+?)\*/g, '<em>$1</em>')      // Replace *text* with <em>text</em>
        .replace(/- (.+)/g, '<li>$1</li>')         // Replace - text with list items
        .replace(/\n\n/g, '</p><p>')              // Replace double newlines with paragraph separation
        .replace(/\n/g, '<br>')                   // Replace single newline with <br> for minor breaks
        .replace(/^(.+?)$/gm, '<p>$1</p>');       // Wrap all remaining lines in <p>
}

// Function to populate the "Proposal Includes" section
function populateProposalIncludes(items) {
    const includesList = $('#proposal-includes');
    includesList.empty(); // Clear any existing content

    // set the content of the includesList to the items
    // items is a string 
    includesList.html(formatTextToHTML(items));
   // $('#includes-total').text(calculateTotal(items.length, 50)); // Example calculation
}

// Function to populate the "Exclusions & Assumptions" section
function populateExclusions(exclusions) {
    const exclusionsList = $('#exclusions');
    exclusionsList.empty(); // Clear any existing content

    exclusionsList.html(formatTextToHTML(exclusions));


    $('#excludes-total').text("$0.00"); 
}





// function handleSignatureChange() {
//     const signatureInput = $('#signature').val();
//     const dateInput = $('input[type="date"]').val();

//     console.log('Signature Updated:', signatureInput);
    
//     // Prepare the data to send to the server
//     const data = {
//         signature: signatureInput,
//         date: dateInput
//     };

//     // Send the data to the server via a POST request using jQuery
//     $.post('/update-signature', data)
//         .done(function(response) {
//             console.log('Success:', response);
//         })
//         .fail(function(error) {
//             console.error('Error:', error);
//         });
// }

function populateOptions(takeoff_id) {   
    $.post('/loadOptions', {takeoff_id: takeoff_id}, function(data) {
        data = data.options;
        const table = $('#estimate-table');
        for (let i = 0; i < data.length; i++) {
            const newRow = $('<tr>').data('row_id', data[i].id); // Store row_id as data attribute
            const descriptionCell = $('<td contenteditable="true" class="editable">').text(data[i].description);
            const amountCell = $('<td contenteditable="true" class="editable">').text(numberWithCommas(data[i].cost));
            newRow.append(descriptionCell);
            newRow.append(amountCell);
            table.append(newRow);

            // Trigger post to server when editing is finished (focusout)
            descriptionCell.on('focusout', function() {
               // postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.data('row_id'));
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
       // postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
        // if amount is not 0.00, postToAddOption
        var amount = amountCell.text();
        if (amount != "0.00" && descriptionCell.text() != '') {
            // remove the row
            newRow.remove();
        }

        if (amount != "0.00") {
            postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
        } else {
           
        }
    });
    amountCell.on('focusout', function() {
        if (descriptionCell.text() == '') { // Don't allow empty descriptions
            descriptionCell.text('WRITE DESCRIPTION HERE');
        } else {
            postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));

        }

    });

    // Initial post when row is added
   // postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
}

function postToAddOption(description, amount, takeoff_id, row_id) {

    // Prepare the data to send to the server
    amount = amount.replace(/[^0-9.-]+/g, '');
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

function shareClient(){
    const takeoff_id = $('#takeoff_id').val();
    console.log(takeoff_id);
    XSAlert({
        title: 'Email Confirmation',
        message: 'Are you sure you want to share this estimate with the client?',
        icon: 'warning',
     }).then((value) => {
        console.log("dialogue output",value);
        if(value == "ok"){

            $.post('/shareClient', {takeoff_id: takeoff_id}, function(data) {
                console.log("twas the email sent?",data);
                if (data == "email sent") {
                    XSAlert({
                        title: 'Email Sent',
                        message: 'The estimate has been sent to the client.',
                        icon: 'success',
                    });
                } else {
                    XSAlert({
                        title: 'Error',
                        message: "The estimate could not be sent. Please set an owner email.",
                        icon: 'error',
                    });
                }
            });

        }
    });
}

function shareSelf(){
    const takeoff_id = $('#takeoff_id').val();
    console.log(takeoff_id);
    XSAlert({
        title: 'Email Confirmation',
        message: 'Are you sure you want to share this estimate with Sun Painting?',
        icon: 'success',
     }).then((value) => {
        console.log("dialogue output",value);
        if(value == "ok"){

            $.post('/shareSelf', {takeoff_id: takeoff_id}, function(data) {
                console.log(data);
            });

        }
    });
}

let estimate_id;
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
        element.on('focusout', function() {
            // determine if the element is in the includes or excludes section
            const includes = $('#proposal-includes').text(); // weird naming convention
            const exclusions = $('#exclusions').text();
            
            

            // Send POST request with the new content
            var takeoff_id = $('#takeoff_id').val(); // not super safe, but just for example
            console.log('Updating content for takeoff:', takeoff_id);
            $.post('/update-content', { id: estimate_id, includes: includes, exclusions: exclusions})
                .done(function(response) {
                    console.log('Content updated successfully:', response);
                })
                .fail(function(error) {
                    console.error('Error updating content:', error);
                });
        });
    });
}
numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Example to dynamically populate content on page load
$(document).ready(function() {
    // Populate the "Proposal Includes" section with dynamic data
    // post takeoff_id to getEstimateData to set includesItems and exclusionsItems
    
    var takeoff_id = $('#takeoff_id').val();
    $.post('/getEstimateData', {takeoff_id: takeoff_id}, function(data) {
        console.log(data)
        tax = data.takeoff[0].tax; // consider that the tax percentage will be zero if the server returns zero.  
        estimate_id = data.estimate[0].id;  
        populateProposalIncludes(data.estimate[0].inclusions);
        populateExclusions(data.estimate[0].exclusions);
        populateOptions(parseInt(takeoff_id));
        console.log(data.takeoff[0].total);

        $('#includes-total').text("$"+numberWithCommas(data.takeoff[0].total));
 
    });



    

    // Add event listeners for editable fields
    addEditableListeners();
});
