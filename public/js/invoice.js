$(document).ready(function() {
    $('#submitEstimate').on('click', function() {
        var estimateId = $('#estimateId').val();
        
        $.post('/getInvoice', { estimate_id: estimateId }, function(response) {
            // Handle the response here
            console.log(response);
        }).fail(function(error) {
            // Handle the error here
            console.error(error);
        });
    });
});