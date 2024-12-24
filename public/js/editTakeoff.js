let subject_id = 0;
let material_id = 0;
let takeoff_id = 0;

// the takeoff object
let takeoff;

function toggleMaterial(materialId, checkbox) {
  console.log("Material toggled: " + materialId);

  let isChecked = checkbox.checked ? 1 : 0;

  // Comment out the server call:
  // $.post("/toggle-material", { material_id: materialId })
  //   .done(...)
  //   .fail(...);

  // Update the local takeoff object (assuming each "subject" has an .id and .applied):
  if (takeoff && takeoff.subjects) {
    let subject = takeoff.subjects.find(s => s.id === materialId);
    if (subject) {
      subject.applied = isChecked;
      console.log("Material toggled locally: ", subject);
    }
  }
}

function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

function separateLineItem(materialId, checkbox) {
  console.log("Material separate line item toggled: " + materialId);

  let isChecked = checkbox.checked ? 1 : 0;

  $.post("/separate-line-item", { material_id: materialId })  
    .done(function () {
      console.log("Material separate line item toggled successfully: " + materialId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to toggle material separate line item: " + materialId);
    });
}



function filterFunction() {
  let input, filter, div, a, i, txtValue;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  div = document.getElementById("myDropdown");
  a = div.getElementsByTagName("a");
  for (i = 0; i < a.length; i++) {
    txtValue = a[i].textContent || a[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = "";
    } else {
      a[i].style.display = "none";
    }
  }
}

function updateTakeoffName() {
  // get the newname from the input field
  let name = $("#takeoff_name").val();
  console.log("Updating takeoff name: " + name);
  $.post("/update-takeoff-name", { takeoff_id: takeoff_id, name: name })
    .done(function () {
      console.log("Takeoff name updated: " + name);
    })
    .fail(function () {
      console.log("Failed to update takeoff name: " + name);
    });
}

function updateTakeoffOwnerName() {
  // get the newname from the input field
  let name = $("#takeoff_owner_name").val();
  console.log("Updating takeoff owner name: " + name);
  $.post("/update-takeoff-owner-name", { takeoff_id: takeoff_id, owner: name })
    .done(function () {
      console.log("Takeoff owner name updated: " + name);
    })
    .fail(function () {
      console.log("Failed to update takeoff owner name: " + name);
    });
}

function updateTakeoffBillingAddress() {
  // get the newname from the input field
  let address = $("#owner_billing_address").val();
  console.log("Updating takeoff owner name: " + name);
  $.post("/update-takeoff-owner-billing", {
    takeoff_id: takeoff_id,
    owner_billing_address: address,
  })
    .done(function () {
      console.log("Takeoff owner name updated: " + name);
    })
    .fail(function () {
      console.log("Failed to update takeoff owner name: " + name);
    });
}

function add_subject(id, material_name) {
  subject_id = id;
  console.log("Adding material for subject: " + material_name);
  // $("#selected_subject").text("Selected subject: " + material_name);
  document.getElementById("myDropdown").classList.toggle("show");
  // move the dropdown to the position of the button that was clicked the row id is the subject id
  let button = $("#add_material_button_" + id);
  let dropdown = $("#myDropdown");
  // get the coordinates of the button
  let offset = button.offset();

  console.log("Offset: " + offset);
  dropdown.css("left", offset.left + 220 + "px");
  dropdown.css("top", offset.top - 180 + "px");
}

function add_material(id) {
  console.log("Added material_id " + id + " for subject " + subject_id);
  material_id = id;
  document.getElementById("myDropdown").classList.toggle("show");

  if (material_id != null && subject_id != null) {
    add_material_subject();
  }
}

function removeMaterial(subject_id, id) {
  material_id = id;

  if (subject_id && id) {
    $.post("/remove-material-subject", {
      material_id: material_id,
      subject_id: subject_id,
    })
      .done(function () {
        console.log(
          "Material removed: " + material_id + " from subject: " + subject_id
        );
        loadTakeoffMaterials(takeoff_id); // Only reload the takeoff materials table
      })
      .fail(function () {
        console.log("Failed to remove material from subject: " + material_id);
      });
  }
}

function add_material_subject() {
  console.log("Adding material " + material_id + " to subject " + subject_id);

  if (material_id !== 0 && subject_id !== 0) {
    $.post("/add-material-subject", {
      material_id: material_id,
      subject_id: subject_id,
    })
      .done(function () {
        console.log(
          "Material added to subject: " + material_id + " " + subject_id
        );
        // wait 0.5 seconds and then call loadTakeoffMaterials
        setTimeout(function () {
          loadTakeoffMaterials(takeoff_id);
        }, 500);
      })
      .fail(function () {
        console.log("Failed to add material to subject: " + material_id);
      });
  } else {
    console.log("Material or subject not selected");
    alert("Please select both a material and a subject before adding.");
  }
}
// just load the data into the global variable

function loadTakeoffMaterials(id) {
  takeoff_id = id;
  console.log("Loading takeoff materials");
  takeoff = $.post("/loadTakeoffMaterials", { takeoff_id: takeoff_id });
}

// the big one
// deprecated
function loadTakeoffMaterials(id) {
  takeoff_id = id;
  console.log("Loading takeoff materials");

  $.post("/loadTakeoffMaterials", { takeoff_id: takeoff_id })
    .done(function (data) {
      console.log("Takeoff materials loaded");
      $("#takeoff_materials_table").empty();

      let headerRow = $("<tr></tr>");
      headerRow.append("<th>Applied</th>");
      headerRow.append("<th>Separate <br> Line item</th>");
      headerRow.append("<th>Name</th>");
      headerRow.append("<th>Measurement</th>");
      headerRow.append("<th>Labor Cost</th>");
      headerRow.append("<th>Materials</th>");
      headerRow.append("<th>Subtotal</th>");
      $("#takeoff_materials_table").append(headerRow);

      let sum = 0;

      data.subjects.forEach((row) => {
        console.log(row);
        let newRow = $("<tr></tr>");

        // Checkbox for toggling material
        let checkbox = $(
          "<input type='checkbox' onclick='toggleMaterial(" +
            row.id +
            ", this)'>"
        );
        if (row.applied == 1) {
          checkbox.attr("checked", "checked");
        }
        newRow.append($("<td></td>").append(checkbox));

        // Checkbox for makeing material a separate line item
        let separateLineCheckbox = $(
          "<input type='checkbox' onclick='separateLineItem(" +
            row.id +
            ", this)'>"
        );
        if (row.separate_line_item == 1) {
          separateLineCheckbox.attr("checked", "checked");
        }
        newRow.append($("<td></td>").append(separateLineCheckbox));

        // Material name
        newRow.append("<td style='width:15px;'>" + row.material_name + "</td>");

        // Measurement input
        let measurementInput = $("<input>")
          .attr("type", "number")
          .attr("value", row.measurement)
          .attr("min", "0")
          .attr("style", "width: 100px;")
          .attr("step", "any")
          .data("row-id", row.id)
          .addClass("measurement-input");

        // Measurement unit selector
        let measurementUnits = ["Count", "sf", "ft' in\""];
        let measurementUnitInput = $("<select>")
          .data("row-id", row.id)
          .addClass("measurement-unit-input");

        measurementUnits.forEach(function (unit) {
          let option = $("<option>").attr("value", unit).text(unit);
          if (unit === row.measurement_unit) {
            option.attr("selected", "selected");
          }
          measurementUnitInput.append(option);
        });

        let measurementCell = $("<td></td>")
          .append(measurementInput)
          .append(" ")
          .append(measurementUnitInput);

        newRow.append(measurementCell);

        // Event handlers for measurement changes
        measurementInput.on("change", function () {
          let newMeasurement = $(this).val();
          let rowId = $(this).data("row-id");
          updateLocalMeasurement(rowId, newMeasurement);
        });

        measurementUnitInput.on("change", function () {
          let newMeasurementUnit = $(this).val();
          let rowId = $(this).data("row-id");
          updateLocalMeasurementUnit(rowId, newMeasurementUnit);
        });

        // Labor price input
        let laborPrice = $(
          "<input type='number' class='laborInput' id='labor_price_" +
            row.id +
            "' value='" +
            row.labor_cost +
            "' step='any' min='0' onchange='updateLocalLaborPrice(" +
            row.id +
            ")'>"
        );
        laborPrice.attr("style", "width: 100px;");
        let laborCell = $("<td></td>");
        laborCell.attr("style", "width: 10px;");
        laborCell.append(laborPrice);
        newRow.append(laborCell);

        // Materials and cost calculation
        let materialsCell = $("<td></td>");
        materialsCell.attr("style", "min-width: 300px;");
        let subsum = 0;
        let laborsum = 0;

        if (row.applied != 0) {
          if (row.selected_materials && row.selected_materials.length > 0) {
            row.selected_materials.forEach((material) => {
              materialsCell.append(
                "<i style='display:inline-block; padding:5px;'>" +
                  material.name +
                  " </i> "
              );
              let materialCell = $(
                "<i class='fa fa-trash' onclick='removeMaterial(" +
                  row.id +
                  ", " +
                  material.id +
                  ")'>"
              );
              materialsCell.append(materialCell);

              let materialCost = parseFloat(material.cost) || 0;
              let measurement = parseFloat(row.measurement) || 0;
              let coverage = parseFloat(material.coverage) || 1;
              console.log(
                "Material cost: " +
                  materialCost +
                  " Measurement: " +
                  measurement +
                  " Coverage: " +
                  coverage
              );
              let newCost = materialCost;

              // Adjust cost for primary, secondary, and tertiary materials
              if (material.id == row.material_id) {
                let primaryCostDelta = parseFloat(row.primary_cost_delta) || 0;
                // if the cost delta is positive color the input red and if negative color it green
                newCost += primaryCostDelta;
                // if the cost delta is positive color the input red and if negative color it green
                let materialPrice = $(
                  "<input type='number' id='material_price_" +
                    material.id +
                    "' value='" +
                    newCost.toFixed(2) +
                    "' step='any' min='0' onchange='priceChange(" +
                    material.id +
                    ")'><br>"
                );
                materialPrice.addClass("material-price-input");
                materialPrice.append(
                  "<input type='hidden' id='raw_material_price_" +
                    material.id +
                    "' value='" +
                    material.cost +
                    "'>"
                );

                let delta = newCost - material.cost;
                if (delta > 0) {
                  materialPrice.css("color", "red");
                } else if (delta < 0) {
                  materialPrice.css("color", "green");
                }

                materialsCell.append(materialPrice);
              } else if (material.id == row.secondary_material_id) {
                let secondaryCostDelta =
                  parseFloat(row.secondary_cost_delta) || 0;
                newCost += secondaryCostDelta;

                let materialPrice = $(
                  "<input type='number' id='material_price_" +
                    material.id +
                    "' value='" +
                    newCost.toFixed(2) +
                    "' step='any' min='0' onchange='priceChange(" +
                    material.id +
                    ")'><br>"
                );
                materialPrice.addClass("material-price-input");
                materialPrice.append(
                  "<input type='hidden' id='raw_material_price_" +
                    material.id +
                    "' value='" +
                    material.cost +
                    "'>"
                );
                materialsCell.append(materialPrice);
              } else if (material.id == row.tertiary_material_id) {
                let tertiaryCostDelta =
                  parseFloat(row.tertiary_cost_delta) || 0;
                newCost += tertiaryCostDelta;

                let materialPrice = $(
                  "<input type='number' id='material_price_" +
                    material.id +
                    "' value='" +
                    newCost.toFixed(2) +
                    "' step='any' min='0' onchange='priceChange(" +
                    material.id +
                    ")'><br>"
                );
                materialPrice.addClass("material-price-input");
                materialPrice.append(
                  "<input type='hidden' id='raw_material_price_" +
                    material.id +
                    "' value='" +
                    material.cost +
                    "'>"
                );
                materialsCell.append(materialPrice);
              }

              let adjustedMeasurement = measurement;
              if (
                isNaN(adjustedMeasurement) ||
                !isFinite(adjustedMeasurement)
              ) {
                adjustedMeasurement = 0;
              }

              // calculate labor cost 
              laborsum += adjustedMeasurement * row.labor_cost;


              if (row.measurement_unit === "sf") {
                subsum += newCost * Math.ceil(adjustedMeasurement/coverage);
              } 

              if (row.measurement_unit === "ft' in\"") {
                subsum += newCost * Math.ceil(adjustedMeasurement/coverage);
              }

              if (row.measurement_unit === "Count") {
                var sfPerCount = 60;
                subsum += newCost * Math.ceil((adjustedMeasurement*sfPerCount)/coverage) ; // not divided by coverage
              }




            //   // use ceiling to round up to the nearest whole number
            //   subsum += newCost * Math.ceil(adjustedMeasurement / material.coverage);



            //   // Calculate labor cost


            //   if (row.labor_cost > 0) {
              
          

            //       if (row.measurement_unit === "sf") {
            //         laborsum += adjustedMeasurement * row.labor_cost;
            //       }

            //       if (row.measurement_unit === "ft' in\"") {
            //         laborsum += adjustedMeasurement * row.labor_cost;
            //       }

            //       if (row.measurement_unit === "Count") {
            //         laborsum += adjustedMeasurement * row.labor_cost;
            //       }
            // }


               subsum = subsum + laborsum;

            });
          }

          newRow.append(materialsCell);

          // "Add Material" button
          let addSubject = $(
            "<input type='button' onclick='add_subject(" + row.id + ")'>"
          );
          // add an id to the button so we can style it
          addSubject.attr("id", "add_material_button_" + row.id);
          addSubject.attr("value", "Add Material");
          newRow.append(addSubject);

          // Check for NaN in subsum before adding to sum
          if (isNaN(subsum) || !isFinite(subsum)) {
            console.log("subsum is NaN or Infinite");
            subsum = 0; // Reset subsum to 0 if invalid
          }
          sum += subsum;
        } else {
          newRow.append("<td>No Materials Applied</td>");
          newRow.attr("style", "background-color: #f2f2f2; opacity: 0.5;");
        }

        // Append subsum to the row
        newRow.append("<td>$" + subsum.toFixed(2) + "</td>");

        $("#takeoff_materials_table").append(newRow);
      });

      // Update total sum
      $("#sum").text("Total Cost: $" + numberWithCommas(sum.toFixed(2)));

      //now post the new sum to /updateTakeoffTotal
      $.post("/updateTakeoffTotal", {
        takeoff_id: takeoff_id,
        total: sum.toFixed(2),
      })
        .done(function () {
          console.log("Total updated for takeoff: " + takeoff_id);
        })
        .fail(function () {
          console.log("Failed to update total for takeoff: " + takeoff_id);
        });
    })
    .fail(function () {
      console.log("Failed to load takeoff materials");
    });
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function updateMeasurement(rowId, newMeasurement) {
  if (takeoff && takeoff.subjects) {
    let subject = takeoff.subjects.find(s => s.id === rowId);
    if (subject) {
      subject.measurement = newMeasurement;
      console.log("Measurement updated locally for subject: " + rowId);
    }
  }
}

function updateMeasurementUnit(rowId, newUnit) {
  if (takeoff && takeoff.subjects) {
    let subject = takeoff.subjects.find(s => s.id === rowId);
    if (subject) {
      subject.measurement_unit = newUnit;
      console.log("Measurement unit updated locally for subject: " + rowId);
    }
  }
}

function updateTakeoffOwnerEmailAddress() {
  let email = $("#owner_email_address").val();
  console.log("Updating takeoff owner email address: " + email);
  $.post("/update-takeoff-owner-email", {
    takeoff_id: takeoff_id,
    owner_email_address: email,
  })
    .done(function () {
      console.log("Takeoff owner email address updated: " + email);
    })
    .fail(function () {
      console.log("Failed to update takeoff owner email address: " + email);
    });
}

function laborPriceChange(id) {
  newPrice = $("#labor_price_" + id).val();

  if (takeoff && takeoff.subjects) {
    let subject = takeoff.subjects.find(s => s.id === id);
    if (subject) {
      subject.labor_cost = newPrice;
      console.log("Labor price updated locally for subject: " + id);
    }
  }

}

function priceChange(id) {
  console.log("Price change for material " + id);

  let newPrice = $("#material_price_" + id).val();
  let rawPrice = $("#raw_material_price_" + id).val();

  let delta = newPrice - rawPrice;
  // color the input red if the delta is positive and green if negative
  if (delta > 0) {
    $("#material_price_" + id).css("color", "red");
  } else if (delta < 0) {
    $("#material_price_" + id).css("color", "green");
  } else {
    $("#material_price_" + id).css("color", "black");
  }

  console.log("New price: " + newPrice);

  // Update the local takeoff object
  if (takeoff && takeoff.subjects) {
    takeoff.subjects.forEach(subject => {
      if (subject.selected_materials) {
        let material = subject.selected_materials.find(m => m.id === id);
        if (material) {
          material.cost = newPrice;
          console.log("Material price updated locally: ", material);
        }
      }
    });
  }

  // wait 0.5 seconds and then call loadTakeoffMaterials
  setTimeout(function () {
    loadTakeoffMaterials(takeoff_id);
  }, 500);
}


function createSubjectIntent() {
  // togle add-subject-form
  $("#add-subject-form").toggle();
  // hide the button
  $("#add-subject-button").hide();

    // scroll the page down 500px
    window.scrollBy(0, 100);

  let name = $("#new_subject_name").val();
  console.log("Creating new subject: " + name);

}

function createSubject(event) {
  // Prevent default form submission
  event.preventDefault();

  // Get form values
  let name = $("#subject_name").val();
  let measurement = $("#measurement").val();
  let labor_cost = $("#labor_cost").val();
  let measurement_unit = $("#measurement_unit").val();
  let takeoff_id = $("#takeoff_id").val();

  // Validate inputs
  if (!name || !measurement || !labor_cost || !takeoff_id) {
    alert("Please fill in all fields.");
    return false;
  }

  if (isNaN(measurement) || isNaN(labor_cost)) {
    alert("Measurement and labor cost must be numbers.");
    return false;
  }

  // Send data via AJAX
  console.log("Creating new subject: " + name);
  $.post("/create-subject", {
    subject_name: name,
    takeoff_id: takeoff_id,
    measurement: measurement,
    labor_cost: labor_cost,
    measurement_unit: measurement_unit
  })
    .done(function () {
      alert("Subject created successfully!");
      loadTakeoffMaterials(takeoff_id); // Reload necessary data without redirecting
    })
    .fail(function () {
      alert("Failed to create the subject. Please try again.");
    });

  return false; // Prevent any further default behavior
}


// on document ready, get the takeoff id from the hidden input field
$(document).ready(function () {
  takeoff_id = $("#takeoff_id").val();
  console.log("Takeoff ID: " + takeoff_id);
  loadTakeoffMaterials(takeoff_id); // better

  // call load takeoff materials every 5 seconds
  // setInterval(function () {
  //   loadTakeoffMaterials(takeoff_id);
  // }, 5000);
});
