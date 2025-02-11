


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
        const headerCell0 = headerRow.insertCell(0);
        const headerCell1 = headerRow.insertCell(1);
        const headerCell2 = headerRow.insertCell(2);
        const headerCell3 = headerRow.insertCell(3);
        const headerCell4 = headerRow.insertCell(4);
        const headerCell5 = headerRow.insertCell(5);

        headerCell0.textContent = 'Name';
        headerCell1.textContent = 'Number';
        headerCell2.textContent = 'Total';
        headerCell3.textContent = 'Status';
        headerCell4.textContent = 'View Count';
        headerCell5.textContent = ' '; 
        
        invoices.forEach(invoice => {
            const row = invoiceTable.insertRow();
            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);
            const cell2 = row.insertCell(2);
            const cell3 = row.insertCell(3);
            const cell4 = row.insertCell(4);
            const cell5 = row.insertCell(5);
            // show name 
            cell0.textContent = invoice.invoice_name;
            // show invoice number
            cell1.innerHTML = `Invoice #${invoice.invoice_number}`;
            cell1.style.fontWeight = 'bold';
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
            cell5.innerHTML = `<a style="text-decoration: none;" href="/viewInvoice/?invoice_id=${invoice.id}">View</a>`;

        });

        // populate the change orders table 
        const changeOrderTable = document.getElementById('changeOrderTable');
        changeOrderTable.innerHTML = ''; // Clear existing rows
        // add the headers
        const changeOrderHeaderRow = changeOrderTable.insertRow();
        const changeOrderHeaderCell0 = changeOrderHeaderRow.insertCell(0);
        const changeOrderHeaderCell1 = changeOrderHeaderRow.insertCell(1);
        const changeOrderHeaderCell2 = changeOrderHeaderRow.insertCell(2);
        const changeOrderHeaderCell3 = changeOrderHeaderRow.insertCell(3);

        changeOrderHeaderCell0.textContent = 'Name';
        changeOrderHeaderCell1.textContent = 'Total';
        changeOrderHeaderCell2.textContent = 'Status';
        changeOrderHeaderCell3.textContent = 'View Count';

        let changeOrders = data.change_orders;

        changeOrders.forEach(changeOrder => {
            const row = changeOrderTable.insertRow();
            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);
            const cell2 = row.insertCell(2);
            const cell3 = row.insertCell(3);

            cell0.textContent = changeOrder.change_order_name;
            cell1.textContent = "$"+ changeOrder.total;
            if (changeOrder.status == 0) {
                // add a yellow ! icon
                cell2.innerHTML = 'unpaid <i style="color:orange;" class="fa-solid fa-triangle-exclamation"></i>';
            }
            else if (changeOrder.status == 1) {
               // green circle check icon
                cell2.innerHTML = `Paid <i style="color:green;" class="fas fa-check-circle"></i>`;

            } else if (changeOrder.status == 2) {
                cell2.textContent = 'Due';
                // add red exclamation icon
                cell2.innerHTML = `Due <i style="color:red;" class="fas fa-circle-exclamation"></i>`;
            }

            totalDue += parseFloat(changeOrder.total);

            // allign cell2 to the right
            cell2.style.textAlign = 'right';
            cell3.textContent = changeOrder.view_count;  
        }
        );
        
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