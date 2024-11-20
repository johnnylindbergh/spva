
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
        data.forEach(payment => {
            const row = table.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            cell1.textContent = payment.date;
            cell2.textContent = payment.amount;
            cell3.textContent = payment.create_at;
        });
    })
    .catch(error => console.error('Error:', error));
}

$(document).ready(function () {
    var takeoff_id = $("#takeoff_id").val();
    populatePaymentHistoryTable(takeoff_id);
});