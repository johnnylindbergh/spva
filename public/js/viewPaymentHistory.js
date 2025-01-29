


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

        //use data.takeoff to populate the takeoff details
        const takeoff_name = document.getElementById('jobName');
        takeoff_name.textContent = data.takeoff.takeoff_name;

        const table = document.getElementById('paymentHistoryTable');
        table.innerHTML = ''; // Clear existing rows

        let payments = data.payments;
        let takeoff = data.takeoff;
        let invoices = data.invoices;
        let totalPaid = 0;
        let totalDue = 0;
        // add the header row
        payments.forEach(payment => {
            const row = table.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            cell1.textContent = payment.created_at;
            cell2.textContent = "$"+ payment.amount;
            totalPaid += parseFloat(payment.amount);
        });

        // // Update the total paid and total due
        // const totalPaidElement = document.getElementById('totalPaid');
        // const totalDueElement = document.getElementById('totalDue');
        // totalPaidElement.textContent = numberWithCommas(totalPaid);
        // totalDueElement.textContent = numberWithCommas(totalDue);
        
        // populate the invoice table
        const invoiceTable = document.getElementById('invoiceTable');
        invoiceTable.innerHTML = ''; // Clear existing rows
        // add the headers 
        const headerRow = invoiceTable.insertRow();
        const headerCell1 = headerRow.insertCell(0);
        const headerCell2 = headerRow.insertCell(1);
        const headerCell3 = headerRow.insertCell(2);
        const headerCell4 = headerRow.insertCell(3);
        const headerCell5 = headerRow.insertCell(4);
        headerCell1.textContent = 'Invoice Number';
        headerCell2.textContent = 'Total';
        headerCell3.textContent = 'Status';
        headerCell4.textContent = 'View Count';
        headerCell5.textContent = 'View';
        
        invoices.forEach(invoice => {
            const row = invoiceTable.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            const cell4 = row.insertCell(3);
            const cell5 = row.insertCell(4);
            cell1.textContent = invoice.invoice_number;
            cell2.textContent = "$"+ invoice.total;
            
            if (invoice.status == 0) {
                // add a yellow ! icon
                cell3.innerHTML = 'unpaid <i style="color:orange;" class="fa-solid fa-triangle-exclamation"></i>';
            }
            else if (invoice.status == 1) {
               // green circle check icon
                cell3.innerHTML = `Paid <i style="color:green;" class="fas fa-check-circle"></i>`;

            } else if (invoice.status == 2) {
                cell3.textContent = 'Due';
                // add red exclamation icon
                cell3.innerHTML = `Due <i style="color:red;" class="fas fa-circle-exclamation"></i>`;
            }

            totalDue += parseFloat(invoice.total);

            // allign cell3 to the right
            cell3.style.textAlign = 'right';
            cell4.textContent = invoice.view_count;  
            cell5.innerHTML = `<a href="/viewInvoice/?invoice_id=${invoice.id}?takeoff_id=${takeoff_id}">View</a>`;

        });

        // Update the total paid and total due

       
        const totalPaidElement = document.getElementById('totalPaid');
        const totalDueElement = document.getElementById('totalDue');

        totalPaidElement.textContent = "Paid: $"+numberWithCommas(totalPaid.toFixed(2));
        totalDueElement.textContent = "Due: $"+numberWithCommas(totalDue.toFixed(2));

        
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