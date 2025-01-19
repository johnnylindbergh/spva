// global vars
var tax = 0;
var total = 0;
var includesTotal = 0;
var excludesTotal = 0;
var optionsTotal = 0;

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
        .replace(/\n\n/g, '</p><p>')               // Replace double newlines with paragraph separation
        .replace(/\n/g, '<br>')                    // Replace single newline with <br> for minor breaks
        .replace(/^(.+?)$/gm, '<p>$1</p>');        // Wrap all remaining lines in <p>
}


// Function to populate the "Proposal Includes" section
function populateProposalIncludes(items) {
    const includesList = $('#includes-list');
    includesList.empty(); // Clear any existing content

    includesList.html(formatTextToHTML(items));
}

// Function to populate the "Exclusions & Assumptions" section
function populateExclusions(exclusions) {
    const exclusionsList = $('#exclusions-list');
    exclusionsList.empty(); // Clear any existing content

    exclusionsList.html(formatTextToHTML(exclusions));
    $('#excludes-total').text("$0.00"); 
}

var optionsTouched = false;

function populateOptions(takeoff_id) {   
    // Use the global optionsTotal variable
    optionsTotal = 0;

    $.post('/loadOptions', {takeoff_id: takeoff_id}, function(data) {
        
        var mutable = data.mutable;
        if (!mutable) {
            $('.signature').toggle();
            $('.signature-success').toggle();
            $('#options-table').find('input').prop('disabled', true);
        }

        data = data.options;
        const table = $('#options-table');
        table.empty(); // Clear any existing content
        for (let i = 0; i < data.length; i++) {
            const newRow = $('<tr>').attr('data-row-id', data[i].id);
            const descriptionCell = $('<td>').text(data[i].description);
            const amountCell = $('<td id= "amount">').text(data[i].cost);
            
            const checkboxCell = $('<td >');
            checkboxCell.css('width', '105px');
            const includeCheckbox = $('<input>').attr('type', 'checkbox').attr('name', 'option-' + data[i].id).attr('value', 'include');
            
            if (data[i].applied) {
                includeCheckbox.prop('checked', true);
                optionsTotal += parseFloat(data[i].cost.replace('$',''));
            }
            
            includeCheckbox.on('change', function() {
                const state = $(this).is(':checked');

                $.post('/updateOptionsSelection', {
                    takeoff_id: takeoff_id,
                    option_id: data[i].id,
                    applied: state
                }, function(response) {
                    console.log('Checkbox updated:', response);
                    populateOptions(takeoff_id);
                    optionsTouched = true;
                });
        
            });

            if (!mutable) {
                includeCheckbox.prop('disabled', true);
            }
            
            checkboxCell.append(includeCheckbox).append(' Yes ');
            newRow.append(descriptionCell);
            newRow.append(amountCell);
            newRow.append(checkboxCell);
            table.append(newRow);

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
    const subtotalText = $('#subtotal').text().replace(/[^0-9.-]+/g, '');
    const subtotal = parseFloat(subtotalText) || 0;

    const optionsTotalText = $('#options-total').text().replace(/[^0-9.-]+/g, '');
    optionsTotal = parseFloat(optionsTotalText) || 0;

    // Now calculate total using global variables
    // Assuming total = subtotal + optionsTotal + tax
    total = subtotal + optionsTotal + tax;

    $('#subtotal').text("Subtotal: $" + numberWithCommas(subtotal.toFixed(2)));
    $('#tax').text("Tax: $" + numberWithCommas(tax.toFixed(2)));
    $('#total').text("Total: $" + numberWithCommas(total.toFixed(2)));

    console.log("Subtotal:", subtotal);
    console.log("Options Total:", optionsTotal);
    console.log("Total:", total);
}

function handleSignatureChange() {
    const options = $('#options-table tr').length;

    if (!optionsTouched && options > 0) {
        // do nothing if you must
    }

    const signatureInput = $('#signature').val();
    const dateInput = $('#signedDate').val();

    if (signatureInput === '') {
        alert('Please provide a signature');
        return;
    }   

    if (dateInput === '') {
        alert('Please provide a date');
        return;
    }

    const data = {
        takeoff_id: parseInt($('#takeoff_id').val()),
        signature: signatureInput,
        date: dateInput,
        total: total
    };

    $.post('/update-signature', data)
        .done(function(response) {
            console.log('Success:', response);
            if (response) {
                $('.signature-success').toggle();
                $('.signature').toggle();
                $('#options-table').find('input').prop('disabled', true);

                $('#initial-payment-alert').toggle();
            }
        })
        .fail(function(error) {
            console.error('Error:', error);
        });
}

function createPaymentIntent(method) {
    // if the method is defined and is one of ['card','ACH']
    if (method && ['card','us_bank_account'].includes(method)) { 
        
        const takeoff_id = parseInt($('#takeoff_id').val());
        
        const data = { takeoff_id: takeoff_id, method: method };
        const url = '/checkMeout/' + takeoff_id;

        $.post(url, data)
            .done(function(response) {
                console.log('Success:', response);
                if (response) {
                    window.location.href = '/checkMeout/' + takeoff_id;
                }
            })
            .fail(function(error) {
                console.error('Error:', error);
            });
    
        }
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// On document ready
$(document).ready(function() {
    $(".loader").toggle();
    $(".signature-success").toggle();

    $.post('/getEstimateData', {takeoff_id: parseInt($('#takeoff_id').val())}, function(data) {
        console.log(data)

        populateProposalIncludes(data.estimate[0].inclusions);
        populateExclusions(data.estimate[0].exclusions);
        populateOptions(parseInt($('#takeoff_id').val()));

        $('#includes-total').text("$"+numberWithCommas(data.takeoff[0].takeoff_total));
        $('#subtotal').text("Subtotal $"+numberWithCommas(data.takeoff[0].takeoff_total));

        var subtotal = parseFloat(data.takeoff.total);
        if (data.takeoff[0].customer_taxable) {
            tax = (parseFloat(data.takeoff[0].takeoff_tax)/100)*subtotal; // should be zero if not taxable
        } else {
            tax = 0; // nop
        }
        
        $('#tax').text("Tax: $"+numberWithCommas(tax.toFixed(2)));

        var taxedTotal = subtotal + tax;
        $('#total').text("Total: $"+numberWithCommas(taxedTotal.toFixed(2)));

        updateTotals();

        // if the data.takeoff[0].status >=4, toggle the $("#initial-payment-alert").toggle();
        if (data.takeoff[0].status == 4) {
            $("#initial-payment-alert").toggle();
        }

    });



    const alert = $('#initial-payment-alert');

   // addEditableListeners();
});