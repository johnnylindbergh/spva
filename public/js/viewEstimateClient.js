
// global vars
var subtotal = 0;
var tax = 0;
var taxRate = 0;
var total = 0;
var materialTax = 0;
var includesTotal = 0;
var excludesTotal = 0;
var optionsTotal = 0;

var termsScrolled = false;

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
   // $('#excludes-total').text("$0.00"); 
}

var optionsTouched = false;

function populateOptions(takeoff_id) {   
    // Use the global optionsTotal variable
    optionsTotal = 0;

    $.post('/loadOptions', {takeoff_id: takeoff_id}, function(response) {
        
        var mutable = response.mutable;
        if (!mutable) {
            $('.signature').toggle();
            $('.signature-success').toggle();
            $('#options-table').find('input').prop('disabled', true);
        }


        console.log(response);
        let data = response.options;

        materialTax = parseFloat(response.optionsMaterialTax);
        $('#materialTax').text("Tax: $" + materialTax.toFixed(2));
        const table = $('#options-table');
        table.empty(); // Clear any existing content
        for (let i = 0; i < data.length; i++) {
            const newRow = $('<tr>').attr('data-row-id', data[i].id);
            const descriptionCell = $('<td>').text(data[i].description);
            const amountCell = $('<td id= "amount">').text("$"+data[i].total_cost);
            const isRequired = data[i].required;
            
            const radioCell = $('<td >');
            radioCell.css('width', '145px');
            const yesRadio = $('<input>').attr('type', 'radio').attr('name', 'option-' + data[i].id).attr('value', 'yes');
            const noRadio = $('<input>').attr('type', 'radio').attr('name', 'option-' + data[i].id).attr('value', 'no');
            
            if (data[i].applied) {
                yesRadio.prop('checked', true);
                optionsTotal += parseFloat(data[i].total_cost.replace('$',''));
            } else {
                noRadio.prop('checked', true);
            }
            
            yesRadio.on('change', function() {
                if ($(this).is(':checked')) {
                    $.post('/updateOptionsSelection', {
                        takeoff_id: takeoff_id,
                        option_id: data[i].id,
                        applied: true
                    }, function(response) {
                        console.log('Radio button updated:', response);
                        populateOptions(takeoff_id);
                        optionsTouched = true;
                    });
                }
            });

            noRadio.on('change', function() {
                if ($(this).is(':checked')) {
                    $.post('/updateOptionsSelection', {
                        takeoff_id: takeoff_id,
                        option_id: data[i].id,
                        applied: false
                    }, function(response) {
                        console.log('Radio button updated:', response);
                        populateOptions(takeoff_id);
                        optionsTouched = true;
                    });
                }
            });

            if (!mutable || isRequired) {
                yesRadio.prop('disabled', true);
                noRadio.prop('disabled', true);
            }
            
            radioCell.append(yesRadio).append(' Yes ').append(noRadio).append(' No ');
            newRow.append(descriptionCell);
            newRow.append(amountCell);
            newRow.append(radioCell);
            table.append(newRow);

            descriptionCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
            });
            amountCell.on('focusout', function() {
                postToAddOption(descriptionCell.text(), amountCell.text(), takeoff_id, newRow.attr('data-row-id'));
            });
        }

        $('#options-total').text("Options: $" + optionsTotal.toFixed(2));
        $('materialTax').text("Tax: $" + materialTax.toFixed(2));

        updateTotals();
    });
}

function changeStartDate() {

    var changeStartDate = $('#startDate').val();
    var takeoff_id = parseInt($('#takeoff_id').val());

    if (changeStartDate === '' || changeStartDate === null) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please provide a start date!'
        });
        return;
    }
    var currentDate = new Date();
    var sixDaysFromNow = new Date();
    sixDaysFromNow.setDate(currentDate.getDate() + 7);
    var selectedDate = new Date(changeStartDate);
    if (selectedDate < sixDaysFromNow) {

        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Start date must be at least six days from the current date.'
        });
        return;
    }


    $.post('/changeStartDate', {takeoff_id: takeoff_id, startDate: changeStartDate}, function(data) {
        console.log(data);
    }).fail(function(error) {
        console.log("Start date must be six days in the future.");
        
        console.error('Error:', error);
    });
}

function updateTotals() {


    // Now calculate total using global variables
    // Assuming total = subtotal + optionsTotal + tax
    total = subtotal + optionsTotal;

    

    // $('#subtotal').text("Subtotal: $" + numberWithCommas(subtotal.toFixed(2))); this never changes
    $('#tax').text("Tax: $" + numberWithCommas(materialTax.toFixed(2)));
    $('#total').text("Total: $" + numberWithCommas((total).toFixed(2)));
    $(('#materialTax')).text("Tax: $" + numberWithCommas(materialTax.toFixed(2)));
    $('#options-total').text("Options: $" + numberWithCommas(optionsTotal.toFixed(2)));

    console.log("Subtotal:", subtotal);
    console.log("Options Total:", optionsTotal);
}

function handleSignatureChange() {
    const options = $('#options-table tr').length;

    if (!optionsTouched && options > 0) {
        // do nothing if you must
    }

    console.log("termsScrolled:", termsScrolled);

    if (!termsScrolled) {
        Swal.fire({
            title: 'Please read the terms and conditions',
            icon: 'warning',
        });
        return;
    }
        
    

    const signatureInput = $('#signature').val();
    const dateInput = $('#signedDate').val();
    const prefferedStartDate = $('#startDate').val();

    if(prefferedStartDate === '' || prefferedStartDate === null) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please provide a start date.'
        });
        return;
    }

    if (signatureInput === '') {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please provide a signature.'
        });

        return;
    }   

    if (dateInput === '') {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please provide date of signature.'   
        });
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

                if (response.initialPaymentRequest == true) {

                    $('#initial-payment-alert').toggle();
                    
                } else {
            
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Signature updated successfully!'
                    });
                }
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

        subtotal = parseFloat(data.takeoff[0].takeoff_total);

        if (data.takeoff[0].customer_taxable) {
            taxRate = (parseFloat(data.takeoff[0].takeoff_tax)/100.0); // should be zero if not taxable
            materialTax = parseFloat(data.materialTax);
            console.log("Material Tax: ", materialTax);
        } else {
            tax = 0; // nop
        }


        
        $('#tax').text("Tax: $"+numberWithCommas(materialTax.toFixed(2)));

        var taxedTotal = subtotal + tax;
        $('#total').text("Total: $"+numberWithCommas(taxedTotal.toFixed(2)));

        updateTotals();

        // if the data.takeoff[0].status >=4, toggle the $("#initial-payment-alert").toggle();
        if (data.takeoff[0].takeoff_status == 4) {
            $("#initial-payment-alert").toggle();
        }

    });

    // add on change listener to id="phone"
    $('#customerPhone').on('change', function() {
        var phone = $('#phone').val();
        var takeoff_id = parseInt($('#takeoff_id').val());
        $.post('/updateCustomerPhone', {takeoff_id: takeoff_id, phone: phone}, function(data) {
            console.log(data);
        });
    });



    const alert = $('#initial-payment-alert');


    // get the terms and conditions from the database
    $.post('/getTerms', function(response) {
        const termsContainer = $('<div>').css({
            'max-height': '400px',
            'overflow-y': 'auto',
            'border': '1px solid #ccc',
            'padding': '10px',
            'margin-top': '10px'
        }).attr('id', 'terms-container');


        console.log(response);
        termsContainer.html(formatTextToHTML(response));
        $('#terms').html(termsContainer);


        termsContainer.on('scroll', function() {
            if (this.scrollTop + this.clientHeight >= (this.scrollHeight-40)) {
                termsScrolled = true;
                console.log('Terms fully scrolled:', termsScrolled);
            }
        });
    });

   // addEditableListeners();
});