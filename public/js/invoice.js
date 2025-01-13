
function createPaymentIntentInvoice(method) {
    if (method && ['card','us_bank_account'].includes(method)) {
        const takeoff_id = parseInt($('#takeoff_id').val());
        const invoice_id = $('#invoice_id').val();

        if (invoice_id === '' || invoice_id === null) {
            alert('Please provide an invoice ID');
            return;
        }
        

        const data = { takeoff_id: takeoff_id, invoice_id: invoice_id, method: method };

        const url = '/payInvoice/' + invoice_id;

        $.post(url, data)
            .done(function(response) {
                console.log('Success:', response);
                if (response) {
                    window.location.href = '/payInvoice/' + invoice_id;
                }
            })
            .fail(function(error) {
                console.error('Error:', error);
            });
    }
}

$(document).ready(function() {
    $('#submitEstimate').on('click', function() {
        var estimateId = $('#estimateId').val();
        
        $.post('/create-invoice', { estimate_id: estimateId }, function(response) {
            // Handle the response here
            console.log(response);
        }).fail(function(error) {
            // Handle the error here
            console.error(error);
        });
    });
});

