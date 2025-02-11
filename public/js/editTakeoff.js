// some global variables
let subject_id = 0;
let material_id = 0;
let takeoff_id = 0;
let laborTotal = 0;
let materialTotal = 0;

let labor_rate = 0;
let labor_markup = 0;
let laborTotalAdjusted = 0;
let material_markup = 0;
let supervisor_markup = 0;
let travel_extra = 0;



function toggleMaterial(materialId, checkbox) {
  console.log("Material toggled: " + materialId);

  let isChecked = checkbox.checked ? 1 : 0;

  $.post("/toggle-material", { material_id: materialId })
    .done(function () {
      console.log("Material toggled successfully: " + materialId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to toggle material: " + materialId);
    });
}

function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

function separateLineItem(materialId, checkbox) {
  console.log("Material separate line item toggled: " + materialId);

  let isChecked = checkbox.checked ? 1 : 0;

  $.post("/separate-line-item", { material_id: materialId, takeoff_id: takeoff_id })
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

function updateTakeoffInvoiceEmailAddress() {
  // get the newname from the input field
  let email = $("#invoice_email_address").val();
  console.log("Updating takeoff owner email address: " + email);
  $.post("/update-takeoff-invoice-email", {
    takeoff_id: takeoff_id,
    owner_invoice_email_address: email,
  })
    .done(function () {
      console.log("Takeoff owner email address updated: " + email);
    })
    .fail(function () {
      console.log("Failed to update takeoff owner email address: " + email);
    });
}

function add_subject(id) {
  subject_id = id;
  // scroll to top of page
  //window.scrollTo(0, 0);
  console.log("Adding material for subject: " + id);
  // $("#selected_subject").text("Selected subject: " + material_name);
  // move the dropdown to the position of the button that was clicked the row id is the subject id
  let button = $("#add_material_button_" + id);
  let dropdown = $("#materialLibrary");
  dropdown.toggle();
  // get the coordinates of the button


}

function add_material(id) {
  console.log("Added material_id " + id + " for subject " + subject_id);
  material_id = id;
  let dropdown = $("#materialLibrary");
  dropdown.toggle();

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

function deletePlans() {
  console.log("Deleting plans");
  $.post("/deletePlans", { takeoff_id: takeoff_id })
    .done(function () {
      console.log("Plans deleted");
      // reload the page
      location.reload();
    })
    .fail(function () {
      console.log("Failed to delete plans");
    });
}

function updateLaborRate() {
  document.getElementById('laborRateValue').innerText = "$" + labor_rate + "/hr";
  console.log(laborTotal)

  let labor_adjusted = laborTotal / labor_rate;
  $('#laborAdjusted').text((labor_adjusted / 8.0).toFixed(2) + " work days (8hrs/day)");
  console.log(labor_adjusted)
}

function changeLaborRateHelper(value) {
  labor_rate = value;
  updateLaborRate();
  debounceChangeLaborRate();
}

// Removed duplicate declaration of debounceChangeLaborRate

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}



function changeLaborRate() {
  console.log("Changing labor rate to: " + labor_rate);
  $.post("/change-labor-rate", { takeoff_id: takeoff_id, labor_rate: labor_rate })
    .done(function () {
      console.log("Labor rate updated: " + labor_rate);
      //loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to update labor rate: " + labor_rate);
    });
}

const debounceChangeLaborRate = debounce(function () {
  changeLaborRate();
}, 500);

function changeLaborMarkupHelper(value) {
  labor_markup = value / 100;
  $('#laborMarkupValue').text(parseInt(labor_markup * 100) + "%");
  debounceChangeLaborMarkup(value);
}

const debounceChangeLaborMarkup = debounce(function (value) {
  changeLaborMarkup(value);
}, 500);

function changeLaborMarkup(value) {
  labor_markup = value / 100.0;
  console.log("Changing labor markup to: " + labor_markup);
  $("#laborMarkupValue").text(parseInt(labor_markup * 100) + "%");

  laborTotalAdjusted = laborTotal * (1.0 + labor_markup);
  $('#laborTotal').text("Labor Cost: $" + numberWithCommas(laborTotalAdjusted.toFixed(2)));
  //$('#sum').text("Total Cost: $" + numberWithCommas((laborTotalAdjusted + materialTotal).toFixed(2)));
  $.post("/change-labor-markup", { takeoff_id: takeoff_id, labor_markup: labor_markup })
    .done(function () {
      console.log("Labor markup updated: " + labor_markup);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to update labor markup: " + labor_markup);

      XSAlert({
        title: 'Error',
        message: 'Cannot modify signed takeoff',
        icon: 'error',
        hideCancelButton: true
      }).then((result) => {

        console.log('clicked');
        // go back one page
        //window.history.back();
        console.log("i gonna edit it anyway")
      });


    });
}

function updateMaterialMarkupHelper(value) {
  material_markup = value;
  $('#materialMarkupValue').text(material_markup + "%");
  debounceChangeMaterialMarkup(value);
}

function changeMaterialMarkup(value) {
  material_markup = value / 100.0;
  console.log("Changing material markup to: " + material_markup);
  $("#materialMarkupValue").text(parseInt(material_markup * 100) + "%");

  materialTotal = materialTotal * (1.0 + material_markup);
  $('#materialTotal').text("Material Cost: $" + numberWithCommas(materialTotal.toFixed(2)));
  //$('#sum').text("Total Cost: $" + numberWithCommas((laborTotalAdjusted + materialTotal).toFixed(2)));
  $.post("/change-material-markup", { takeoff_id: takeoff_id, material_markup: material_markup })
    .done(function () {
      console.log("Material markup updated: " + material_markup);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      XSAlert({
        title: 'Error',
        message: 'Cannot modify signed takeoff',
        icon: 'error',
        hideCancelButton: true
      }).then((result) => {

        console.log('clicked');
        // go back one page
        //window.history.back();
        console.log("i gonna edit it anyway")
      });
    });
}

const debounceChangeMaterialMarkup = debounce(function (value) {
  changeMaterialMarkup(value);
}, 500);

function updateSupervisorMarkup(value) {
  supervisor_markup = value / 100.0;
  console.log("Changing supervisor markup to: " + supervisor_markup);
  $("#supervisorMarkupValue").text(parseInt(value) + "%");

  $.post("/change-supervisor-markup", { takeoff_id: takeoff_id, supervisor_markup: supervisor_markup })
    .done(function () {
      console.log("Supervisor markup updated: " + supervisor_markup);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      XSAlert({
        title: 'Error',
        message: 'Cannot modify signed takeoff',
        icon: 'error',
        hideCancelButton: true
      }).then((result) => {

        console.log('clicked');
        // go back one page
        //window.history.back();
        console.log("i gonna edit it anyway")
      });
    });
}

// helper debounced
function updateSupervisorMarkupHelper(value) {
  supervisor_markup = value;
  $('#supervisorMarkupValue').text(supervisor_markup + "%");
  debounceUpdateSupervisorMarkup(value);
}

const debounceUpdateSupervisorMarkup = debounce(function (value) {

  updateSupervisorMarkup(value);
}, 500);


function updateTravelExtra(value) {
  travel_extra = value;
  console.log("Changing travel extra markup to: " + travel_extra);
  $("#travelExtra").val(parseFloat(value));

  $.post("/change-travel-cost", { takeoff_id: takeoff_id, travel_extra: travel_extra })
    .done(function () {
      console.log("Travel extra markup updated: " + travel_extra);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      XSAlert({
        title: 'Error',
        message: 'Cannot modify signed takeoff',
        icon: 'error',
        hideCancelButton: true
      }).then((result) => {

        console.log('clicked');
        // go back one page
        //window.history.back();
        console.log("i gonna edit it anyway")
      });
    });
}



// the big one
function loadTakeoffMaterials(id) {
  takeoff_id = id;

  laborTotal = 0;
  materialTotal = 0;

  console.log("Loading takeoff materials");

  $.post("/loadTakeoffMaterials", { takeoff_id: takeoff_id })
    .done(function (data) {
      console.log(data.takeoff);

      // set some global variables
      labor_rate = parseFloat(data.takeoff[0].labor_rate);
      labor_markup = parseFloat(data.takeoff[0].labor_markup);
      material_markup = parseFloat(data.takeoff[0].material_markup);
      supervisor_markup = parseFloat(data.takeoff[0].supervisor_markup);
      travel_extra = parseFloat(data.takeoff[0].travel_cost);





      $("#takeoff_materials_table").empty();

      let headerRow = $("<tr></tr>");
      headerRow.append("<th></th>");
      headerRow.append("<th>Applied</th>");
      headerRow.append("<th>Separate <br> Line item</th>");
      headerRow.append("<th>Name</th>");
      headerRow.append("<th>Measurement</th>");
      headerRow.append("<th>Labor Cost</th>");
      headerRow.append("<th>Materials</th>");
      headerRow.append("<th></th>");
      headerRow.append("<th>Subtotal</th>");
      headerRow.append("<th>Labor Cost</th>");
      $("#takeoff_materials_table").append(headerRow);



      data.subjects.forEach((row) => {
        console.log(row);
        let newRow = $("<tr></tr>");

        let colorIndicator = $("<span class='fa fa-circle'></span>");
        colorIndicator.css("color", row.color);
        newRow.append($("<td></td>").append(colorIndicator));

        console.log(row.color);
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
        // let separateLineCheckbox = $(
        //   "<input type='checkbox' onclick='separateLineItem(" +
        //     row.id +
        //     ", this)'>"
        // );
        // if (row.separate_line_item == 1) {
        //   separateLineCheckbox.attr("checked", "checked");
        // }
        // newRow.append($("<td></td>").append(separateLineCheckbox));

        // Material name
        newRow.append("<td >" + row.material_name + "</td>");

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

        if (row.measurement_unit === "ft' in\"") {
          // add an alert icon to the cell
          let alertIcon = $("<i class='fa fa-exclamation-triangle'><i style = 'font-size:9px;'>measurement is in linear ft</i>");
          measurementCell.append(alertIcon);
        }



        newRow.append(measurementCell);

        // Event handlers for measurement changes
        measurementInput.on("change", function () {
          let newMeasurement = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurement(rowId, newMeasurement);
          // Wait one sec and then reload the table to reflect changes
          setTimeout(function () {
            loadTakeoffMaterials(takeoff_id);
          }, 500);
        });

        measurementUnitInput.on("change", function () {
          let newMeasurementUnit = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurementUnit(rowId, newMeasurementUnit);
          // Wait one sec and then reload the table to reflect changes
          setTimeout(function () {
            loadTakeoffMaterials(takeoff_id);
          }, 500);
        });

        // Labor price input
        let laborPrice = $(
          "<input type='number' class='laborInput' id='labor_price_" +
          row.id +
          "' value='" +
          row.labor_cost +
          "' step='any' min='0' onchange='laborPriceChange(" +
          row.id +
          ")'>"
        );
        laborPrice.attr("style", "width: 50px;");
        let laborCell = $("<td></td>");
        // make the labor cell width smaller
        laborCell.attr("style", "width: 10px;");
        laborCell.append(laborPrice);
        newRow.append(laborCell);

        // Materials and cost calculation
        let materialsCell = $("<td></td>");
        // make the width of the materials cell bigger
        materialsCell.attr("style", "min-width: 300px;");
        let subsum = 0;
        let laborsum = 0;

        laborsum = parseFloat(row.labor_cost) * parseFloat(row.measurement);
        console.log("item with labor total", laborsum);
        console.log("total labor", laborTotal);
        if (row.applied == 0) {
          newRow.attr("style", "background-color: #f2f2f2; opacity: 0.5;");
        } else {

          laborTotal += laborsum;

          
          console.log(row.selected_materials);
          if (row.selected_materials && row.selected_materials.length > 0) {
            let material = row.selected_materials[0];
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

              // Parse values and handle NaN
              let materialCost = parseFloat(material.cost) || 0;
              let measurement = parseFloat(row.measurement) || 0;
              let coverage = parseFloat(material.coverage) || 1; // Default to 1 to avoid division by zero
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
              
                let primaryCostDelta = parseFloat(row.cost_delta) || 0;
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
              

              let adjustedMeasurement = measurement;
              if (
                isNaN(adjustedMeasurement) ||
                !isFinite(adjustedMeasurement)
              ) {
                adjustedMeasurement = 0;
              }




              if (row.measurement_unit === "sf") {
                subsum += newCost * Math.ceil(adjustedMeasurement / coverage);
              }

              if (row.measurement_unit === "ft' in\"") {
                subsum += newCost * Math.ceil(adjustedMeasurement / coverage);

              }

              if (row.measurement_unit === "Count") {
                var sfPerCount = 60;
                subsum += newCost * Math.ceil((adjustedMeasurement * sfPerCount) / coverage); // not divided by coverage
              }



          
          } else {
            console.log("No materials applied or selected_materials are nnull for some reason");
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
          materialTotal += subsum;

        }

        // Append subsum to the row
        newRow.append("<td>$" + subsum.toFixed(2) + "</td>");
        newRow.append("<td>$" + laborsum.toFixed(2) + "</td>");

        $("#takeoff_materials_table").append(newRow);
      });

      // if labor_markup is not 0 then adjust the labor total
      if (labor_markup != 0) {
        laborTotalAdjusted = laborTotal * (1 + labor_markup);
      }

      if (material_markup != 0) {
        materialTotal = materialTotal * (1 + material_markup);
      }



      let adjustedTotal = laborTotalAdjusted + materialTotal;


      if (supervisor_markup != 0) {
        adjustedTotal = adjustedTotal * (1 + supervisor_markup);
      }

      if (travel_extra != 0 && travel_extra != null) {
        adjustedTotal = adjustedTotal + travel_extra;
      }

      // Update total sum
      $("#sum").text("Total Cost: $" + numberWithCommas((adjustedTotal).toFixed(2)));

      // Update labor total
      if (laborTotalAdjusted) {
        $("#laborTotal").text("Labor Cost: $" + numberWithCommas(laborTotalAdjusted.toFixed(2)));
        // make it red 
        $("#laborTotal").css("color", "red");
      } else {
        $("#laborTotal").text("Labor Cost: $" + numberWithCommas(laborTotal.toFixed(2)));

      }

      $("#materialTotal").text("Material Cost: $" + numberWithCommas(materialTotal.toFixed(2)));

      //now post the new sums to /updateTakeoffTotal
      $.post("/updateTakeoffTotal", {
        takeoff_id: takeoff_id,
        total: (adjustedTotal).toFixed(2),
        laborTotal: (laborTotalAdjusted.toFixed(2) || laborTotal.toFixed(2)),
        materialTotal: materialTotal.toFixed(2),
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
  $.post("/update-measurement", { id: rowId, measurement: newMeasurement })
    .done(function () {
      console.log("Measurement updated for subject: " + rowId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to update measurement for subject: " + rowId);
    });
}

function updateMeasurementUnit(rowId, newUnit) {
  console.log(
    "Updating measurement unit for subject: " + rowId + " to: " + newUnit
  );

  $.post("/update-measurement-unit", { id: rowId, unit: newUnit })
    .done(function () {
      console.log(
        "Measurement unit updated successfully for subject: " + rowId
      );
      loadTakeoffMaterials(takeoff_id); // Reload the materials to reflect changes
    })
    .fail(function () {
      console.log("Failed to update measurement unit for subject: " + rowId);
      // alert("Failed to update the measurement unit. Please try again.");
    });
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

  $.post("/change-labor-price", { subject: id, price: newPrice })
    .done(function () {
      console.log("Price updated for material: " + id);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to update price for material: " + id);
    });
}

function priceChange(id) {
  //this function doesent actually change the price of the material, it changes the price delta
  //so just get the newPrice and subtract it from the original price

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

  $.post("/change-material-price", { material_id: id, delta: delta.toFixed(2), takeoff_id: takeoff_id })
    .done(function (response) {
      console.log("Price updated for material: " + id);
    })
    .fail(function () {
      console.log("Failed to update price for material: " + id);
    });

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
  //window.scrollBy(0, 100);

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

  setTimeout(function () {
    loadTakeoffMaterials(takeoff_id);
  }, 300);


  // setTimeout(function () {
  //   updateLaborRate();
  // }, 500);

  // setTimeout(function () { // initiates the status check
  //   changeLaborMarkupHelper(labor_markup*100);
  // }, 600);

  // setTimeout(function () {
  //   updateMaterialMarkupHelper(material_markup*100);
  // }, 700);

  // setTimeout(function () {
  //   updateSupervisorMarkup(supervisor_markup*100);
  // }, 800);

  // setTimeout(function () {
  //   updateTravelExtra(travel_extra);
  // }, 900);


  // setInterval(function () {
  //   loadTakeoffMaterials(takeoff_id);
  // }, 5000);
});