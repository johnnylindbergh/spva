$(document).ready(function () {
  function createProgressBar(statusCode, dateCreated) {
    const statuses = [
      { code: 1, label: "Takeoff Uploaded" },
      { code: 2, label: "Estimate Generated" },
      { code: 3, label: "Estimate Published" },
      { code: 4, label: "Estimate Approved" },
    ];

    // Find the index of the current status
    let currentIndex = statuses.findIndex((s) => s.code === statusCode);
    if (currentIndex === -1) {
      currentIndex = 0; // Default to the first status if not found
    }

    // Create the progress bar container
    const progressBar = $("<div>").addClass("progress-bar");

    // Create each segment of the progress bar
    statuses.forEach((stage, index) => {
      const segment = $("<div>").addClass("progress-segment");
      segment.text(stage.label);

      if (index <= currentIndex) {
        segment.addClass("completed");
      }

    // Apply gradient color to "Estimate Published"
    if (stage.code === 3) {
      if (dateCreated) {
        const color = getColor(dateCreated);
        console.log("Computed color:", color);
        segment.attr("style", `background-color: ${color}; color: white !important`);
      } else {
        console.warn("'dateCreated' is not provided for 'Estimate Published'");
      }
    }

      progressBar.append(segment);
    });

    return progressBar;
  }

  function getColor(dateCreated) {
    const now = moment();
    const created = moment(dateCreated);
    const duration = moment.duration(now.diff(created));
    const days = duration.asDays();

    console.log("Days since creation:", days);

    const maxDays = 30;
    const percentage = Math.min(days / maxDays, 1); // Clamp percentage between 0 and 1

    // Refined gradient stops to avoid "mud green"
    const gradientStops = [
        { day: 0, color: { r: 76, g: 175, b: 80 } },  // #4CAF50 - vibrant green
        { day: 10, color: { r: 173, g: 204, b: 78 } }, // Slightly yellow-green
        { day: 20, color: { r: 255, g: 193, b: 7 } },  // #FFC107 - bright yellow
        { day: 30, color: { r: 255, g: 87, b: 34 } },  // #FF5722 - vibrant red-orange
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
  
    // Fetch takeoff data from the server
    $.get("/getTakeoffs", function (data) {
      console.log(data);
  
      data.forEach(function (takeoff) {
        let row = $("<tr>");
        row.append(`<td>${takeoff.name}</td>`);
  
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
        // let createdAt = new Date(takeoff.created_at).toLocaleString("en-US", {
        //   month: "long",
        //   day: "numeric",
        //   year: "numeric",
        //   hour: "numeric",
        //   minute: "numeric",
        // });
        // row.append(`<td>${createdAt}</td>`);
        let createdAt = moment(takeoff.date_created).format("MMMM Do YYYY, h:mm:ss a");
        row.append(`<td>${createdAt}</td>`);
  
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
        let progressBar = createProgressBar(takeoff.status, takeoff.date_created);
        let tdProgress = $("<td>");
        if (takeoff.status === 4) {
          tdProgress.addClass("hoverable").attr(
            "title",
            `Estimate Signed: ${new Date(takeoff.signed_at).toLocaleString("en-US")}`
          );
        } else if (takeoff.status > 3) {
          progressBar.addClass("hoverable").attr(
            "title",
            `View Count: ${takeoff.view_count}`
          );
        }
        tdProgress.append(progressBar);
        row.append(tdProgress);
  
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
