document.addEventListener('DOMContentLoaded', main);

function main() {
    populatePaymentHistoryTable();
}

function populatePaymentHistoryTable() {
    fetch('/retrievePaymentHistory', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        const table = document.getElementById('paymentHistoryTable');
        data.forEach(payment => {
            const row = table.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            cell1.textContent = payment.date;
            cell2.textContent = payment.amount;
            cell3.textContent = payment.status;
        });
    })
    .catch(error => console.error('Error:', error));
}

$(document).ready(function () {
    populatePaymentHistoryTable();
});