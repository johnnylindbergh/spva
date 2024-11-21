$(document).ready(function() {
    var takeoffId = $('#takeoff_id').val();

    // Fetch payment history data
    $.ajax({
        url: '/retrievePaymentHistory',
        method: 'POST',
        dataType: 'json',
        data: { takeoff_id: takeoffId },
        success: function(payments) {
            var tbody = $('#paymentHistoryTable tbody');
            payments.forEach(function(payment) {
                console.log(payment)
                var row = $('<tr></tr>');
                row.append('<td>' + moment(payment.created_at).format("MM/DD/YYYY") + '</td>');
                row.append('<td>$' + numberWithCommas(parseFloat(payment.amount).toFixed(2)) + '</td>');
                tbody.append(row);
            });
        },
        error: function(xhr, status, error) {
            alert('Error fetching payment history: ' + error);
        }
    });

    // Event handler for Create Invoice button
    $('#createInvoiceBtn').click(function() {
        // Logic to create invoice
        alert('Create Invoice button clicked.');
        // Implement the actual functionality here
    });

    // Event handler for Create Statement button
    $('#createStatementBtn').click(function() {
        // Logic to create statement
        alert('Create Statement button clicked.');
        // Implement the actual functionality here
    });

    // Event handler for Push to QuickBooks button
    $('#pushToQuickbooksBtn').click(function() {
        // Logic to push data to QuickBooks
        alert('Push to QuickBooks button clicked.');
        // Implement the actual functionality here
    });
});


function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}