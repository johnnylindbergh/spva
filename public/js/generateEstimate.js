const takeoff_data = [];

// Rich text editor instances (declared globally)
let proposalIncludesEditor, exclusionsEditor, optionDescriptionEditor;

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
    console.log("Updating takeoff invoice email address: " + email);
    $.post("/update-takeoff-invoice-email", { takeoff_id: takeoff_id, invoice_email_address: email })
      .done(function() {
        console.log("Takeoff invoice email address updated: " + email);
      })
      .fail(function() {
        console.log("Failed to update takeoff invoice email address: " + email);
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
    if (proposalIncludesEditor) {
        const htmlContent = formatTextToHTML(items);
        proposalIncludesEditor.root.innerHTML = htmlContent;
        // Update hidden input
        $('#proposal-includes-content').val(htmlContent);
    }
}

// Function to populate the "Exclusions & Assumptions" section
function populateExclusions(exclusions) {
    if (exclusionsEditor) {
        const htmlContent = formatTextToHTML(exclusions);
        exclusionsEditor.root.innerHTML = htmlContent;
        // Update hidden input
        $('#exclusions-content').val(htmlContent);
    }
}

function regenChatGPTResponse() {
    const takeoff_id = $('#takeoff_id').val();
    console.log('Regenerating ChatGPT response for takeoff:', takeoff_id);

    $.post('/regenChatGPTResponse', {takeoff_id: takeoff_id}, function(data) {
        console.log('ChatGPT response regenerated:', data);
        if (data.status == 'success') {
            // Update the rich text editors with new content
            populateProposalIncludes(data.inclusions);
            populateExclusions(data.exclusions);
            
            Swal.fire({
                title: 'Success',
                text: 'ChatGPT response has been successfully regenerated.',
                icon: 'success',
            });
        } else {
            Swal.fire({
                title: 'Error',
                text: 'Failed to regenerate ChatGPT response.',
                icon: 'error',
            });
        }
    });
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
            return;
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

        let requiredTotal = 0;
        let optionalTotal = 0;

        for (let i = 0; i < data.length; i++) {
            const newRow = $('<tr>').data('row_id', data[i].id); // Store row_id as data attribute
            const descriptionCell = $('<td contenteditable="false" class="editable">').html(data[i].description);
            const laborCostCell = $('<td contenteditable="false" class="editable">').text(numberWithCommas(data[i].labor_cost));
            const materialCostCell = $('<td contenteditable="false" class="editable">').text(numberWithCommas(data[i].material_cost));

            const requiredCell = $('<td contenteditable="false" class="editable">').text(data[i].required == 1 ? "Yes" : "No");
            // delete cell with a fontawesome trashcan
            const deleteCell = $('<td>').html('<i class="fa fa-trash"></i>');

            if (data[i].required == 1) {
                requiredTotal += parseFloat(data[i].labor_cost) + parseFloat(data[i].material_cost);
            } else {
                optionalTotal += parseFloat(data[i].labor_cost) + parseFloat(data[i].material_cost);
            }

            deleteCell.on('click', function() {
                deleteOption(data[i].id);
            });

            deleteCell.css('width', '5px');

            laborCostCell.addClass('amount-column'); // Add class to identify amount columns
            materialCostCell.addClass('amount-column'); // Add class to identify

            newRow.append(deleteCell);
            newRow.append(descriptionCell);
            newRow.append(laborCostCell);
            newRow.append(materialCostCell);
            newRow.append(requiredCell);
            table.append(newRow);
        }

        requiredTotal = parseFloat(requiredTotal);
        optionalTotal = parseFloat(optionalTotal);
    
        console.log('Required Total:', requiredTotal);
        console.log('Optional Total:', optionalTotal);
    
        $('#requiredTotal').text("Required Total: $"+numberWithCommas(requiredTotal.toFixed(2)));

        let takeoffTotal = parseFloat($('#takeoffTotal').text().replace(/[^0-9.-]+/g,""));
        takeoffTotal += requiredTotal;
        $('#takeoffTotal').text("$"+numberWithCommas(takeoffTotal.toFixed(2)));
    });
}

function postToAddOption(event) {
    event.preventDefault(); // Prevent the default form submission behavior
    console.log("Adding option...");
    const takeoff_id = $('#takeoff_id').val();
    // Get description from rich text editor
    let description = optionDescriptionEditor ? optionDescriptionEditor.root.innerHTML : $('#description').val();
    let laborCost = $('#laborCost').val();
    let materialCost = $('#materialCost').val();
    let isRequired = $('#isRequired').is(':checked') ? 1 : 0;

    // Clean and validate the cost inputs
    laborCost = laborCost.replace(/[^0-9.]/g, ''); // Remove non-numeric characters
    materialCost = materialCost.replace(/[^0-9.]/g, ''); // Remove non-numeric characters

    // clean the input from the rich text editor
    description = description.replace(/<[^>]*>/g, ''); // Remove HTML tags
    description = description.trim(); // Trim whitespace
    description = description.replace(/&nbsp;/g, ''); // Remove non-breaking spaces
    
    if (description === '') {
        alert('Please enter a valid description.');
        return;
    }
   

    if (isNaN(parseFloat(laborCost)) || isNaN(parseFloat(materialCost))) {
        alert('Please enter valid numbers for costs.');
        return;
    }

    // Prepare the data to send to the server
    const data = {
        description: description,
        material_cost: materialCost, // Consistent naming with backend
        labor_cost: laborCost,
        isRequired: isRequired,
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
                if (optionDescriptionEditor) {
                    optionDescriptionEditor.setText('');
                }
                $('#laborCost').val('');
                $('#materialCost').val('');
                $('#isRequired').prop('checked', false); // uncheck the checkbox
            }
        })
        .fail(function(error) {
            console.error('Error adding/updating row:', error);
        });
}

function confirmSendAutoDeposit() {
    // Close the modal dialog
    $('#auto-initial-deposit-dialog').modal('hide');
    // Get the checkbox value
    const sendAutoDeposit = $('#send-auto-deposit').is(':checked');
    console.log("Send Auto Deposit:", sendAutoDeposit);

    // Show the email confirmation modal dialog
    $('#email-confirmation-dialog').modal('show');

    // When the confirmation button in the modal is clicked
    $('#confirm-email-send').off('click').on('click', function () {
        $('#email-confirmation-dialog').modal('hide'); // Close the confirmation dialog
        const takeoff_id = $('#takeoff_id').val();
        $.post('/shareClient', { takeoff_id: takeoff_id, sendAutoDeposit: sendAutoDeposit }, function (data) {
            console.log("twas the email sent?", data);
            if (data == "email sent") {
                $('#success-dialog').modal('show'); // Show success modal
            } else {
                $('#error-dialog').modal('show'); // Show error modal
            }
        });
    });
}

function closeAutoInitialDepositDialog() {
    // Hide the modal dialog
    $('#auto-initial-deposit-dialog').modal('hide');
    // Reset the checkbox state
}

function shareClient() {
    const takeoff_id = $('#takeoff_id').val();
    console.log(takeoff_id);

    // Show the modal dialog
    $('#auto-initial-deposit-dialog').modal('show');

    // When the modal is confirmed
    $('#confirm-auto-deposit').click(function () {
        const sendAutoDeposit = $('#send-auto-deposit').is(':checked'); // Get the checkbox value
        console.log("Send Auto Deposit:", sendAutoDeposit);

        // Close the modal dialog
        $('#auto-initial-deposit-dialog').modal('hide');
    });
}

function shareSelf(){
    const takeoff_id = $('#takeoff_id').val();
    console.log(takeoff_id);
    Swal.fire({
        title: 'Email Confirmation',
        text: 'Are you sure you want to share this estimate with Sun Painting?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
    }).then((result) => {
        if (result.isConfirmed) {
            $.post('/shareSelf', { takeoff_id: takeoff_id }, function(data) {
                console.log("Was the email sent?", data);
                if (data === "email sent") {
                    Swal.fire({
                        title: 'Email Sent',
                        text: 'The estimate has been sent to your email.',
                        icon: 'success',
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'The estimate could not be sent. Please update server email credentials.',
                        icon: 'error',
                    });
                }
            });
        }
    });
}

function confirmEmailSend(){
    // Close the modal dialog
    $('#email-confirmation-dialog').modal('hide');
    // Get the checkbox value
    const sendAutoDeposit = $('#send-auto-deposit').is(':checked');
    console.log("Send Auto Deposit:", sendAutoDeposit);

    const takeoff_id = $('#takeoff_id').val();

    // post to the server
    $.post('/shareClient', { takeoff_id: takeoff_id, sendAutoDeposit: sendAutoDeposit }, function (data) {
        console.log("twas the email sent?", data);
        if (data == "email sent") {
            Swal.fire({
                title: 'Email Sent',
                text: 'The estimate has been sent to your email.',
                icon: 'success',
            });
        } else {
            Swal.fire({
                title: 'Error',
                text: 'The estimate could not be sent. Please update server email credentials.',
                icon: 'error',
            });
        }
    });
}

let isTranslating = false;

function toggleTranslateMenu() {
    const translateElement = document.getElementById("google_translate_element");
    if (translateElement) {
        translateElement.style.display = translateElement.style.display === "none" ? "block" : "none";
        isTranslating = true; // Set the flag to true when translation starts
        setTimeout(() => {
            isTranslating = false; // Reset the flag after a delay
        }, 5000);
    }
}

let estimate_id;

// Function to handle content changes in rich text editors
function handleContentChange() {
    if (isTranslating) {
        console.log('Skipping update during translation');
        return;
    }

    // Get content from rich text editors
    const includes = proposalIncludesEditor ? proposalIncludesEditor.root.innerHTML : '';
    const exclusions = exclusionsEditor ? exclusionsEditor.root.innerHTML : '';

    //format the content to be sent
    let formattedIncludes = includes.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags and trim
    let formattedExclusions = exclusions.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags and trim

   //clean the content, remove leading/trailing whitespace and non-breaking spaces
     formattedIncludes = formattedIncludes.replace(/&nbsp;/g, ''); // Remove non-breaking spaces
     formattedIncludes = formattedExclusions.replace(/&nbsp;/g, ''); // Remove non-breaking spaces


     // remove the leading/trailing <p><br></p>
    // formattedIncludes = formattedIncludes.replace(/<p><br><\/p>/g, ''); // Remove empty paragraphs
    // formattedExclusions = formattedExclusions.replace(/<p><br><\/p>/g, ''); // Remove empty paragraphs
    // // Send POST request with the new content

    // remove any leading/trailing whitespace
    var takeoff_id = $('#takeoff_id').val();
    console.log('Updating content for takeoff:', takeoff_id);
    $.post('/update-content', { id: estimate_id, includes: formattedIncludes, exclusions: formattedExclusions})
        .done(function(response) {
            console.log('Content updated successfully:', response);
        })
        .fail(function(error) {
            console.error('Error updating content:', error);
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
        element.on('focusout', function() {
            handleContentChange();
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

function deleteOption(id){
    console.log("deleting option with id: ", id);
    let takeoff_id = $('#takeoff_id').val();
    $.post('/deleteOption', {option_id: id, takeoff_id: takeoff_id}, function(data) {
        console.log(data);
        populateOptions($('#takeoff_id').val());
    })
    .fail(function(error) {
        console.error('Error deleting option:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to remove the option of a signed estimate.',
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

        // strip the dollar sign and commas
        newTotal = newTotal.replace(/[^0-9.]/g, ''); // Remove non-numeric characters
        console.log('New inclusions total:', newTotal);
        $.post('/updateTakeoffTotal', { takeoff_id: takeoff_id, total: newTotal, materialTotal: 0, laborTotal: 0 })
            .done(function(response) {
                console.log('Inclusions total updated successfully:', response);

                // also change the takeoffTotal 
                let takeoffTotal = $('#takeoffTotal');
                takeoffTotal.text("$"+numberWithCommas(parseFloat(newTotal).toFixed(2)));
            })
            .fail(function(error) {
                console.error('Error updating inclusions total:', error);
            });
    });
}

// Initialize rich text editors
function initializeRichTextEditors() {
    // Initialize Proposal Includes Editor
    proposalIncludesEditor = new Quill('#proposal-includes-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link'],
                ['clean']
            ]
        },
        placeholder: 'Enter proposal inclusions...'
    });

    // Initialize Exclusions Editor
    exclusionsEditor = new Quill('#exclusions-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link'],
                ['clean']
            ]
        },
        placeholder: 'Enter exclusions...'
    });

    // Initialize Option Description Editor
    optionDescriptionEditor = new Quill('#option-description-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        },
        placeholder: 'Enter option description...'
    });

    // Sync editor content with hidden inputs and handle changes
    proposalIncludesEditor.on('text-change', function() {
        document.getElementById('proposal-includes-content').value = proposalIncludesEditor.root.innerHTML;
        // Debounce the content update to avoid too many server calls
        clearTimeout(proposalIncludesEditor.updateTimeout);
        proposalIncludesEditor.updateTimeout = setTimeout(handleContentChange, 1000);
    });

    exclusionsEditor.on('text-change', function() {
        document.getElementById('exclusions-content').value = exclusionsEditor.root.innerHTML;
        // Debounce the content update
        clearTimeout(exclusionsEditor.updateTimeout);
        exclusionsEditor.updateTimeout = setTimeout(handleContentChange, 1000);
    });

    optionDescriptionEditor.on('text-change', function() {
        document.getElementById('description').value = optionDescriptionEditor.root.innerHTML;
    });
}

// Example to dynamically populate content on page load
$(document).ready(function() {
    // Initialize rich text editors first
    initializeRichTextEditors();
    
    // Populate the "Proposal Includes" section with dynamic data
    var takeoff_id = parseInt($('#takeoff_id').val());
    var isAlTakeoff = false;
    var inclusions_presets;
    var isLocked = false;
    var takeoff_status;

    $.post('/getEstimateData', {takeoff_id: takeoff_id}, function(data) {
        console.log(data)
        tax = data.takeoff[0].takeoff_tax;
        estimate_id = data.estimate[0].id;  
        isLocked = data.takeoff[0].isLocked;
        takeoff_status = data.takeoff[0].takeoff_status;
        console.log("isLocked", isLocked);
        
        // Populate rich text editors with data
        populateProposalIncludes(data.estimate[0].inclusions);
        populateExclusions(data.estimate[0].exclusions);
        populateOptions(takeoff_id) || 0;

        if (isLocked == 1 || takeoff_status >= 3) {
            // Disable the rich text editors
            if (proposalIncludesEditor) proposalIncludesEditor.disable();
            if (exclusionsEditor) exclusionsEditor.disable();
            if (optionDescriptionEditor) optionDescriptionEditor.disable();
            
            // Disable other inputs
            $('#laborCost').attr('disabled', true);
            $('#materialCost').attr('disabled', true);
            $('#isRequired').attr('disabled', true);
            $('.editable').css('pointer-events', 'none');
            $('.editable').css('background-color', '#f0f0f0');
        }

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
        let takeoffTotal = parseFloat(data.takeoff[0].takeoff_total);
        $('#takeoffTotal').text("$"+numberWithCommas(takeoffTotal.toFixed(2)));

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

                if (proposalIncludesEditor) {
                    const htmlContent = formatTextToHTML(selectedKey);
                    proposalIncludesEditor.root.innerHTML = htmlContent;
                    $('#proposal-includes-content').val(htmlContent);
                }
                
                // update the inclusions in the database
                const includes = proposalIncludesEditor ? proposalIncludesEditor.root.innerHTML : selectedKey;
                const exclusions = exclusionsEditor ? exclusionsEditor.root.innerHTML : '';
                
                $.post('/update-content', { id: estimate_id, includes: includes, exclusions: exclusions})
                    .done(function(response) {
                        console.log('Content updated successfully:', response);
                    })
                    .fail(function(error) {
                        console.error('Error updating content:', error);
                    });
            });
        }
    });

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