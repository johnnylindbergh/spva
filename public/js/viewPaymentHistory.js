


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
        let estimate = data.estimate;
        let options = data.options;
        let totalPaid = 0;
        let signed_total = estimate ? parseFloat(estimate.signed_total) || 0 : 0;
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
            const changeOrderHeaderCell4 = changeOrderHeaderRow.insertCell(4);

            changeOrderHeaderCell0.textContent = 'Name';
            changeOrderHeaderCell1.textContent = 'Number';
            changeOrderHeaderCell2.textContent = 'Total';
            changeOrderHeaderCell3.textContent = 'Status';
            changeOrderHeaderCell4.textContent = ' ';

            let changeOrders = data.change_orders;

            changeOrders.forEach(changeOrder => {
                const row = changeOrderTable.insertRow();
                const cell0 = row.insertCell(0);
                const cell1 = row.insertCell(1);
                const cell2 = row.insertCell(2);
                const cell3 = row.insertCell(3);
                const cell4 = row.insertCell(4);

                cell0.textContent = changeOrder.name;
                cell1.textContent = "CO-"+ changeOrder.co_number;
                if (changeOrder.status == 0) {
                // add a yellow ! icon
                cell3.innerHTML = 'not approved <i style="color:orange;" class="fa-solid fa-triangle-exclamation"></i>';
                }
                else if (changeOrder.status == 1) {
                   // green circle check icon
                cell3.innerHTML = `Approved <i style="color:green;" class="fas fa-check-circle"></i>`;

                } else if (changeOrder.status == 2) {
                //cell3.textContent = 'Due';
                // add red exclamation icon
                cell3.innerHTML = `Approved by Creator <i style="color:orange;" class="fa-solid fa-triangle-exclamation"></i>`;
                }

                totalDue += parseFloat(changeOrder.change_order_total);
                cell2.textContent = "$"+ changeOrder.change_order_total;
                cell4.innerHTML = `<a style="text-decoration: none;" href="/viewChangeOrder/?changeOrderId=${changeOrder.id}">View</a>`;   });   // populate the options table
        const optionsTable = document.getElementById('optionsTable');
        optionsTable.innerHTML = ''; // Clear existing rows
        // add the headers
        const optionsHeaderRow = optionsTable.insertRow();
        const optionsHeaderCell0 = optionsHeaderRow.insertCell(0);

        optionsHeaderCell0.textContent = 'Name';

        const optionsHeaderCell1 = optionsHeaderRow.insertCell(1);
        optionsHeaderCell1.textContent = 'Material Cost';

        const optionsHeaderCell2 = optionsHeaderRow.insertCell(2);
        optionsHeaderCell2.textContent = 'Labor Cost';

        const optionsHeaderCell3 = optionsHeaderRow.insertCell(3);
        optionsHeaderCell3.textContent = 'Total';

        const optionsHeaderCell4 = optionsHeaderRow.insertCell(4);
        optionsHeaderCell4.textContent = 'Status';

        
        options.forEach(option => {
            const row = optionsTable.insertRow();
            const cell0 = row.insertCell(0);
            console.log(option);
            cell0.textContent = option.description;

            // if (option.applied == 1) {
            //     cell0.style.fontWeight = 'bold';
            // }
            const cell1 = row.insertCell(1);
            cell1.textContent = "$"+ option.material_cost;

            const cell2 = row.insertCell(2);
            cell2.textContent = "$"+ option.labor_cost;

            const cell3 = row.insertCell(3);
            cell3.textContent = "$"+ (parseFloat(option.labor_cost) + parseFloat(option.material_cost)).toFixed(2);

            const cell4 = row.insertCell(4);
            if (option.applied == 0) {
                // add a yellow ! icon
                cell4.innerHTML = ' <i style="color:brown;" class="fa-solid fa-xmark"></i>';
            }
            else if (option.applied == 1) {
               // green circle check icon
                cell4.innerHTML = `<i style="color:green;" class="fas fa-check-circle"></i>`;

            } else if (option.Status == 2) {
                // add red exclamation icon
                cell4.innerHTML = ` <i style="color:red;" class="fas fa-circle-exclamation"></i>`;
            }
 
            
        }
        );
        
        // Update the total paid and total due

       
        const totalPaidElement = document.getElementById('totalPaid');
        const totalDueElement = document.getElementById('totalDue');
        const totalRemainingElement = document.getElementById('totalRemaining');
        console.log("estimate total",estimate.signed_total);
        totalPaidElement.textContent = "Paid: $"+numberWithCommas(totalPaid.toFixed(2));
        
        totalDueElement.textContent = "Due: $"+numberWithCommas(signed_total.toFixed(2));
        totalRemainingElement.textContent = "Remaining: $"+numberWithCommas((signed_total - totalPaid).toFixed(2));

        const estimateInfo = document.getElementById('estimateInfo');
        // show the estimate info
        // if the estimate is signed, show a check mark, and "Estimate signed at {date}"
        // otherwise show "Estimate not signed"'
        //console.log(takeoff);

        if (takeoff.takeoff_status >= 4) {
            estimateInfo.innerHTML = `<i style="color:green;" class="fas fa-check-circle"></i> Estimate signed at ${estimate.signed_at}`;
            // add option to view estimate
            estimateInfo.innerHTML += ` <a style="text-decoration: none;" href="/viewEstimate/?takeoff_id=${takeoff.takeoff_id}">View Estimate</a>`;

        } else {
            estimateInfo.innerHTML = `Estimate not Signed <form action="/editTakeoff" method="POST" style="display:inline;">
                        <input type="hidden" name="takeoff_id" value="${takeoff.takeoff_id}">
                        <input type="submit" value="Edit" style="color:blue;background:none;border:none;color:blue;text-decoration:none;cursor:pointer;">
                        </form>`;   
            }

        
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