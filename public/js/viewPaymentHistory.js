


function populatePaymentHistoryTable(takeoff_id) {
    fetch('/retrievePaymentHistory', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ takeoff_id: takeoff_id })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        const table = document.getElementById('paymentHistoryTable');
        table.innerHTML = ''; // Clear existing rows

        let payments = data.payments;
        let takeoff = data.takeoff;
        let invoices = data.invoices;
        let totalPaid = 0;
        let totalDue = 0;
        payments.forEach(payment => {
            const row = table.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            cell1.textContent = payment.date;
            cell2.textContent = payment.amount;
            cell3.textContent = payment.create_at;
        });

        // Update the total paid and total due
        const totalPaidElement = document.getElementById('totalPaid');
        const totalDueElement = document.getElementById('totalDue');
        totalPaidElement.textContent = numberWithCommas(totalPaid);
        totalDueElement.textContent = numberWithCommas(totalDue);
        
        // populate the invoice table
        const invoiceTable = document.getElementById('invoiceTable');
        invoiceTable.innerHTML = ''; // Clear existing rows
        invoices.forEach(invoice => {
            const row = invoiceTable.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            cell1.textContent = invoice.invoice_number;
            cell2.textContent = invoice.total;
            cell3.textContent = invoice.view_count;
        });

        // Update the total paid and total due

        totalPaidElement.textContent = numberWithCommas(totalPaid);
        totalDueElement.textContent = numberWithCommas(totalDue);

        
    })
    .catch(error => console.error('Error:', error));
}

$(document).ready(function () {
    var takeoff_id = $("#takeoff_id").val();
    populatePaymentHistoryTable(takeoff_id);
});


function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}