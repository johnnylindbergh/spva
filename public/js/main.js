// const { name } = require("ejs");

$(document).ready(function () {

  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function createStatusIndicator(statusCode, dateCreated) {
    const statuses = [
      { code: 0, label: "Takeoff Created" },
      { code: 1, label: "Takeoff Uploaded" },
      { code: 2, label: "Estimate Generated" },
      { code: 3, label: "Estimate Published" },
      { code: 4, label: "Estimate Approved" },
      { code: 5, label: "Invoiced" },
    ];

    const status = statuses.find((s) => s.code === statusCode);
    if (!status) {
      console.error("Invalid status code:", statusCode);
      return;
    }

    const indicator = document.createElement("div");
    // indicator.classList.add("status-indicator");
    // radius: 50%;
 
    // padding: 5px;
    indicator.style.padding = "10px";
    indicator.style.display = "inline-block";
    indicator.style.color = "white";
    indicator.textContent = status.label;
    indicator.style.backgroundColor = getColor(dateCreated);
    return indicator;

  }

  function getColor(dateCreated) {
    const now = moment();
    const created = moment(dateCreated);
    const duration = moment.duration(now.diff(created));
    const days = duration.asDays();

    console.log("Days since creation:", days);

    const maxDays = 30;
    const percentage = Math.min(days / maxDays, 1); // Clamp percentage between 0 and 1

    const gradientStops = [
        { day: 0, color: { r: 76, g: 175, b: 80 } },  //rgba(76, 175, 79, 0.36) - vibrant green
        { day: 10, color: { r: 173, g: 204, b: 78 } }, // Slightly yellow-green
        { day: 20, color: { r: 255, g: 193, b: 7 } },  //rgba(255, 193, 7, 0.4) - bright yellow
        { day: 30, color: { r: 255, g: 13, b: 13 } },  //rgba(255, 13, 13, 0.4) - red
    ];

    // Interpolate between stops
    function interpolateColor(start, end, factor) {
        return {
            r: Math.round(start.r + (end.r - start.r) * factor),
            g: Math.round(start.g + (end.g - start.g) * factor),
            b: Math.round(start.b + (end.b - start.b) * factor),
        };
    }

    let color;
    for (let i = 0; i < gradientStops.length - 1; i++) {
        const startStop = gradientStops[i];
        const endStop = gradientStops[i + 1];

        if (days >= startStop.day && days <= endStop.day) {
            const range = endStop.day - startStop.day;
            const factor = (days - startStop.day) / range;
            color = interpolateColor(startStop.color, endStop.color, factor);
            break;
        }
    }

    if (!color) {
        // Default to the last color stop if days exceed maxDays
        const lastStop = gradientStops[gradientStops.length - 1];
        color = lastStop.color;
    }

    const rgbColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    console.log("Computed color:", rgbColor);
    return rgbColor;
}

  function viewPaymentHistory(id) {
    // Send a POST request to viewPaymentHistory with takeoff_id
    $.post("/viewPaymentHistory", { takeoff_id: id }, function (data) {
      // Handle successful response (e.g., display data or navigate)
      console.log("Payment history loaded:", data);
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error("Error viewing payment history:", textStatus, errorThrown);
    });
  }

  function getTakeoffs() {
    console.log("Retrieving takeoffs...");
    // Clear the table
    $("#takeoffs_table").empty();

    // add headers
    let headers = $("<tr>");
    headers.append($("<th>").text("Name"));
    headers.append($("<th>").text("Client"));
    headers.append($("<th>").text(" "));
    headers.append($("<th>").text(" "));
    headers.append($("<th>").text("Status"));
    headers.append($("<th>").text("Total Due"));
    headers.append($("<th>").text("Signed Total"));
    // headers.append($("<th>").text("Total"));

    $("#takeoffs_table").append(headers);
  
    // Fetch takeoff data from the server
    $.get("/getTakeoffs", function (data) {
      console.log(data);
  
      data.forEach(function (takeoff) {
        let row = $("<tr>");
        
        let nameCell  = $("<td>").text(takeoff.name);
        nameCell.css("width", "160px");


        // show the date when you hoever over the name
        nameCell.attr("title", moment(takeoff.takeoff_created_at).format("YYYY-MM-DD HH:mm:ss"));


        row.append(nameCell);

        let clientCell = $("<td>").text(takeoff.givenName);
        clientCell.css("width", "160px");
        row.append(clientCell);
        
  
        // Create the 'Edit' form
        let editForm = $("<form>", {
          action: "/editTakeoff", // Edit URL
          method: "POST",        // POST request
        });
        editForm.append(
          $("<input>", { type: "hidden", name: "takeoff_id", value: takeoff.id }),
          $("<input>", { type: "submit", value: "Edit" })
        );
        row.append($("<td>").append(editForm));
  
        // Format and display the creation date
    

  
        // Create the 'View' form, similar to 'Edit'
        let viewForm = $("<form>", {
          action: "/viewPaymentHistory", // View URL
          method: "POST",                // POST request
        });
        viewForm.append(
          $("<input>", { type: "hidden", name: "takeoff_id", value: takeoff.id }),
          $("<input>", { type: "submit", value: "View" }) // Submit button
        );
        row.append($("<td>").append(viewForm));
  
        // Add the progress bar
        let status = createStatusIndicator(takeoff.status, takeoff.takeoff_created_at);
        let tdProgress = $("<td>");
        if (takeoff.status === 4) {
          tdProgress.addClass("hoverable").attr(
            "title",
            `Estimate Signed: ${new Date(takeoff.signed_at).toLocaleString("en-US")}`
          );
        } else if (takeoff.status > 3) {
         
        }
        tdProgress.append(status);
        row.append(tdProgress);

        // add amout due
        row.append($("<td>").text("$"+ numberWithCommas(parseFloat(takeoff.total_due).toFixed(2))));
        if (takeoff.signed_total == null) {
          takeoff.signed_total = 0;
        }
        
        row.append($("<td>").text("$"+ numberWithCommas(parseFloat(takeoff.signed_total).toFixed(2))));
        // row.append($("<td>").text("$"+ numberWithCommas(parseFloat(takeoff.total).toFixed(2))));
  
        // Append the row to the table
        $("#takeoffs_table").append(row);
      });
    }).fail(function (jqXHR, textStatus, errorThrown) {
      console.error("Error retrieving takeoffs:", textStatus, errorThrown);
    });
  }
  
  

  // Initialize the takeoffs table
  getTakeoffs();
});
