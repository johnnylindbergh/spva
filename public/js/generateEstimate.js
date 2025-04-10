// const { t } = require("i18next");

const takeoff_data = [];

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

    function updateTakeoffBillingAddress(){
        let address = $("#owner_billing_address").val();
        let takeoff_id = $("#takeoff_id").val();
        console.log("Updating takeoff owner billing address: " + address);
        $.post("/update-takeoff-owner-billing", { takeoff_id: takeoff_id, owner_billing_address: address })
            .done(function() {
            console.log("Takeoff owner billing address updated: " + address);
            })
            .fail(function() {
            console.log("Failed to update takeoff owner billing address: " + address);
            });
    }


// Function to convert markdown-like text to HTML
function formatTextToHTML(text) {
    if (text == null) {
        return "";
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


   // $('#excludes-total').text("$0.00"); 
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


function regenChatGPTResponse() {
    const takeoff_id = $('#takeoff_id').val();
    console.log('Regenerating ChatGPT response for takeoff:', takeoff_id);

    $.post('/regenChatGPTResponse', {takeoff_id: takeoff_id}, function(data) {
        console.log('ChatGPT response regenerated:', data);
        if (data.status== 'success') {
            // reload the page
            // location.reload();
            // set the content of the includesList to the items
            const includesList = $('#proposal-includes');
            includesList.empty(); // Clear any existing content
            includesList.html(formatTextToHTML(data.inclusions));
            // set the content of the exclusionsList to the items
            const exclusionsList = $('#exclusions');
            exclusionsList.empty(); // Clear any existing content
            exclusionsList.html(formatTextToHTML(data.exclusions));
            XSAlert({
                title: 'Success',
                message: 'ChatGPT response has been successfully regenerated.',
                icon: 'success',
            });
        } else {
            XSAlert({
                title: 'Error',
                message: 'Failed to regenerate ChatGPT response.',
                icon: 'error',
            });
        }
    }
    );
}


function populateOptions(takeoff_id) {   
    $.post('/loadOptions', {takeoff_id: takeoff_id}, function(data) {
        data = data.options;

        console.log('Options data:', data);

        if (data.length === 0) {
            console.log('No options found for takeoff:', takeoff_id);
            const table = $('#options-table');
            table.empty(); // Clear the table before populating it with new data
            table.append('<tr><td>No options found.</td></tr>');
        }
        const table = $('#options-table');
        table.empty(); // Clear the table before populating it with new data

        // add headers
        const headerRow = $('<tr>');
        const deleteHeader = $('<th>').text('Delete');
        const descriptionHeader = $('<th>').text('Description');
        const laborCostHeader = $('<th>').text('Labor Cost');
        const materialCostHeader = $('<th>').text('Material Cost');
        const requiredHeader = $('<th>').text('Required');
        headerRow.append(deleteHeader);
        headerRow.append(descriptionHeader);
        headerRow.append(laborCostHeader);
        headerRow.append(materialCostHeader);
        headerRow.append(requiredHeader);
        table.append(headerRow);
        

        for (let i = 0; i < data.length; i++) {
            const newRow = $('<tr>').data('row_id', data[i].id); // Store row_id as data attribute
            const descriptionCell = $('<td contenteditable="false" class="editable">').text(data[i].description);
            const laborCostCell = $('<td contenteditable="false" class="editable">').text(numberWithCommas(data[i].labor_cost));
            const materialCostCell = $('<td contenteditable="false" class="editable">').text(numberWithCommas(data[i].material_cost));

            const requiredCell = $('<td contenteditable="false" class="editable">').text(data[i].required == 1 ? "Yes" : "No");
            // delete cell with a fontawesome trashcan
            const deleteCell = $('<td>').html('<i class="fa fa-trash"></i>');

            deleteCell.on('click', function() {
                deleteOption(data[i].id);
            });

            deleteCell.css('width', '5px');

            laborCostCell.addClass('amount-column'); // Add class to identify amount columns
            materialCostCell.addClass('amount-column'); // Add class to identify



            newRow.append(deleteCell);
            // newRow.append(editCell);
            newRow.append(descriptionCell);
            newRow.append(laborCostCell);
            newRow.append(materialCostCell);
            newRow.append(requiredCell);
            table.append(newRow);

        }
    });
}



   

		
function postToAddOption(event) {
    event.preventDefault(); // Prevent the default form submission behavior
    const takeoff_id = $('#takeoff_id').val();
    const description = $('#description').val();
    let laborCost = $('#laborCost').val();
    let materialCost = $('#materialCost').val();
    let isRequired = $('#isRequired').is(':checked') ? 1 : 0;

    // Clean and validate the cost inputs
    laborCost = laborCost.replace(/[^0-9.]/g, ''); // Remove non-numeric characters
    materialCost = materialCost.replace(/[^0-9.]/g, ''); // Remove non-numeric characters



    if (isNaN(parseFloat(laborCost)) || isNaN(parseFloat(laborCost))) {
        alert('Please enter a valid number for Option Price.');
        return;
    }

    // Prepare the data to send to the server
    const data = {
        description: description,
        material_cost: materialCost, // Consistent naming with backend
        labor_cost: laborCost,
        isRequired:isRequired,
        takeoff_id: takeoff_id,
    };

    // Send the data to the server via a POST request using jQuery
    $.post('/addOption', data)
        .done(function(response) {
            console.log('Row added/updated successfully:', response);
            if (response.new_row_id) { // if the insert was successful,
                // reload the page
                 populateOptions(takeoff_id);  
                 
                 // empty the input fields
                    $('#description').val('');
                    $('#laborCost').val('');
                    $('#materialCost').val('');
                    $('#isRequired').prop('checked', false); // uncheck the checkbox
                
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
        message: 'Are you sure you want to share this estimate with the client? ('+ $('#owner_email_address').val() + ')',
        icon: 'warning',
     }).then((value) => {
        console.log("dialogue output", value);
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
                console.log("twas the email sent?",data);
                if (data == "email sent") {
                    XSAlert({
                        title: 'Email Sent',
                        message: 'The estimate has been sent to your email.',
                        icon: 'success',
                    });
                } else {
                    XSAlert({
                        title: 'Error',
                        message: "The estimate could not be sent. Please update server email credentials.",
                        icon: 'error',
                    });
                }
            });
        }
    });
}

let isTranslating = false;

function toggleTranslateMenu() {
    const translateElement = document.getElementById("google_translate_element");
    translateElement.style.display = translateElement.style.display === "none" ? "block" : "none";
    isTranslating = true; // Set the flag to true when translation starts
    setTimeout(() => {
        isTranslating = false; // Reset the flag after a delay (adjust the delay as needed)
    }, 5000); // Adjust the delay as needed (delay needed so that the translation process has enough time to finish before updating the database with the translated content)
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
            if (isTranslating) {
                console.log('Skipping update during translation');
                return; // Skip the update if translation is happening
            }

            // determine if the element is in the includes or excludes section
            const includes = $('#proposal-includes').html(); // weird naming convention
            const exclusions = $('#exclusions').html();

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


function toggleNumbers() {
    console.log('Toggling visibility of Amount columns...');
    const amountColumns = $('.amount-column');
    if (amountColumns.length === 0) {
        console.error('No elements with class "amount-column" found.');
    } else {
        amountColumns.each(function(index) {
            console.log(`Toggling column ${index}: current display = ${$(this).css('display')}`);
            $(this).css('display', $(this).css('display') === 'none' ? '' : 'none');
        });
    }

    // hide the total, materialTotal, and laborTotal
    const takeoffTotal = $('#takeoffTotal');
    const materialTotal = $('#materialTotal');
    const laborTotal = $('#laborTotal');
    const tax = $('#takeoffTax');

    takeoffTotal.toggle();
    materialTotal.toggle();
    laborTotal.toggle();
    tax.toggle();

    // also remove the amount header
    const amountHeader = $('#amount-header');
    amountHeader.toggle();
    


}
function toggleTranslateMenu() {
    const translateElement = document.getElementById("google_translate_element");
    translateElement.style.display = translateElement.style.display === "none" ? "block" : "none";
}

function deleteOption(id){
    console.log("deleting option with id: ", id);
    let takeoff_id = $('#takeoff_id').val();
    $.post('/deleteOption', {option_id: id, takeoff_id: takeoff_id}, function(data) {
        console.log(data);
        populateOptions($('#takeoff_id').val());
    })
    .fail(function(error) {
        console.error('Error deleting option:', error);
        XSAlert({
            title: 'Error',
            message: 'Failed to remove the option of a signed estimate.',
            icon: 'error',
        });
    });
}


function makeAlFriendly(takeoff_id) {
    // make the inclusions total editable and restyle to be bigger
    const inclusionsTotal = $('#includes-total');
    inclusionsTotal.attr('contenteditable', 'true');
    inclusionsTotal.addClass('editable');
    inclusionsTotal.css('font-size', '24px');
    inclusionsTotal.css('font-weight', 'bold');
    inclusionsTotal.css('color', '#000000');
    inclusionsTotal.css('background-color', '#ffffff');

    // add an onclick listener to the inclusions total that posts the includes_total to the server

    inclusionsTotal.on('focusout', function() {
        let newTotal = inclusionsTotal.text();

        // srip the dollar sign and commas
         newTotal = newTotal.replace(/[^0-9.]/g, ''); // Remove non-numeric characters
        console.log('New inclusions total:', newTotal);
        $.post('/updateTakeoffTotal', { takeoff_id: takeoff_id, total: newTotal, materialTotal: 0, laborTotal: 0 })
            .done(function(response) {
                console.log('Inclusions total updated successfully:', response);

                // also change the takeoffTotal 
                let takeoffTotal = $('#takeoffTotal');

                takeoffTotal.text("$"+numberWithCommas(newTotal.toFixed(2)));
            })
            .fail(function(error) {
                console.error('Error updating inclusions total:', error);
            });
    });
}


   

// Example to dynamically populate content on page load
$(document).ready(function() {
    // Populate the "Proposal Includes" section with dynamic data
    // post takeoff_id to getEstimateData to set includesItems and exclusionsItems
    
    var takeoff_id = parseInt($('#takeoff_id').val());
    var isAlTakeoff = false;
    var inclusions_presets;

    $.post('/getEstimateData', {takeoff_id: takeoff_id}, function(data) {
        console.log(data)
        tax = data.takeoff[0].takeoff_tax; // consider that the tax percentage will be zero if the server returns zero.  
        estimate_id = data.estimate[0].id;  
        populateProposalIncludes(data.estimate[0].inclusions);
        populateExclusions(data.estimate[0].exclusions);
        populateOptions(takeoff_id);
        console.log(data.takeoff[0].takeoff_total);
        isAlTakeoff = parseInt(data.takeoff[0].isAlTakeoff) == 1;
        inclusions_presets = data.inclusions_presets;
        console.log(isAlTakeoff);
        console.log(inclusions_presets);
        $('#includes-total').text("$"+numberWithCommas(data.takeoff[0].takeoff_total));
        $('#materialTotal').text("Material   : $"+numberWithCommas(data.takeoff[0].material_total));
        $('#laborTotal').text("Labor   : $"+numberWithCommas(data.takeoff[0].labor_total));
        $('#takeoffTax').text("Tax: %"+numberWithCommas(data.takeoff[0].takeoff_tax));
        
        
        // add commas to the total
        $('#takeoffTotal').text("$"+numberWithCommas(parseFloat(data.takeoff[0].takeoff_total).toFixed(2)));


        if (isAlTakeoff) {
            console.log("isAlTakeoff");
            makeAlFriendly(takeoff_id);
            const inclusionsDropdown = $('#inclusions-presets-dropdown');
            inclusionsDropdown.show();
            console.log("inclusions_presets", inclusions_presets);
            // Add options to the dropdown
            inclusions_presets.forEach(preset => {
                console.log(preset);
                const option = $('<option></option>').val(preset.preset).text(preset.name);
                inclusionsDropdown.append(option);
            });
    
            // On change, update the inclusions section
            inclusionsDropdown.on('change', function() {
                const selectedKey = $(this).val();
                console.log("selectedKey", selectedKey);

                $('#proposal-includes').html(formatTextToHTML(selectedKey));
                // update the inclusions in the database
                $.post('/update-content', { id: estimate_id, includes: selectedKey, excludes: $('#exclusions').html()})
                    .done(function(response) {
                        console.log('Content updated successfully:', response);
                    })
                    .fail(function(error) {
                        console.error('Error updating content:', error);
                    });

            });
        }
 
    });




    // if isAlTakeoff, then populate the inclusions_presets dropdown with the keys of the inclusions_presets object
    // then when the user selects an option, populate the inclusions with the value of the selected key
   


    $(document).keydown(function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
            document.querySelector('.navbar').style.display = 'none';
            document.querySelector('.bottom-navbar').style.display = 'none';
        }
    });


    // Add listeners to toggle number 

    $('.toggle-btn').click(toggleNumbers);
    addEditableListeners();

});
