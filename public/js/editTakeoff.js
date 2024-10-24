let subject_id = 0;
let material_id = 0;
let takeoff_id = 0;

function toggleMaterial(materialId, checkbox) {
  console.log("Material toggled: " + materialId);

  let isChecked = checkbox.checked ? 1 : 0;
  
  $.post("/toggle-material", { material_id: materialId})
    .done(function() {
      console.log("Material toggled successfully: " + materialId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
      console.log("Failed to toggle material: " + materialId);
    });
}



function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
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
    .done(function() {
      console.log("Takeoff name updated: " + name);
    })
    .fail(function() {
      console.log("Failed to update takeoff name: " + name);
    });
}


function updateTakeoffOwnerName() {
  // get the newname from the input field
  let name = $("#takeoff_owner_name").val();
  console.log("Updating takeoff owner name: " + name);
  $.post("/update-takeoff-owner-name", { takeoff_id: takeoff_id, owner: name })
    .done(function() {
      console.log("Takeoff owner name updated: " + name);
    })
    .fail(function() {
      console.log("Failed to update takeoff owner name: " + name);
    });
}

function updateTakeoffBillingAddress() {
  // get the newname from the input field
  let address = $("#owner_billing_address").val();
  console.log("Updating takeoff owner name: " + name);
  $.post("/update-takeoff-owner-billing", { takeoff_id: takeoff_id, owner_billing_address: address })
    .done(function() {
      console.log("Takeoff owner name updated: " + name);
    })
    .fail(function() {
      console.log("Failed to update takeoff owner name: " + name);
    });
}


function add_subject(id, material_name) {
  subject_id = id;
  console.log("Adding material for subject: " + material_name);
  $("#selected_subject").text("Selected subject: " + material_name);
  document.getElementById("myDropdown").classList.toggle("show");
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

  if (subject_id && id){
      $.post("/remove-material-subject", { material_id: material_id, subject_id: subject_id })
        .done(function() {
        console.log("Material removed: " + material_id + " from subject: " + subject_id);
        loadTakeoffMaterials(takeoff_id); // Only reload the takeoff materials table
      })
      .fail(function() {
        console.log("Failed to remove material from subject: " + material_id);
      });
  }

}

function add_material_subject() {
  console.log("Adding material " + material_id + " to subject " + subject_id);

  if (material_id !== 0 && subject_id !== 0) {
    $.post("/add-material-subject", { material_id: material_id, subject_id: subject_id })
      .done(function() {
        console.log("Material added to subject: " + material_id + " " + subject_id);
        // wait 0.5 seconds and then call loadTakeoffMaterials
        setTimeout(function() {
          loadTakeoffMaterials(takeoff_id);
        }, 500);

      })
      .fail(function() {
        console.log("Failed to add material to subject: " + material_id);
      });
  } else {
    console.log("Material or subject not selected");
    alert("Please select both a material and a subject before adding.");
  }
}

function loadTakeoffMaterials(id) {
  takeoff_id = id;
  console.log("Loading takeoff materials");

  $.post("/loadTakeoffMaterials", { takeoff_id: takeoff_id })
    .done(function (data) {
      console.log("Takeoff materials loaded");
      $("#takeoff_materials_table").empty();
      let sum = 0;

      data.subjects.forEach((row) => {
        console.log(row);
        let newRow = $("<tr></tr>");

        // Checkbox for toggling material
        let checkbox = $("<input type='checkbox' onclick='toggleMaterial(" + row.id + ", this)'>");
        if (row.applied == 1) {
          checkbox.attr("checked", "checked");
        }
        newRow.append($("<td></td>").append(checkbox));

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
          updateMeasurement(rowId, newMeasurement);
          // Reload the table to reflect changes
          loadTakeoffMaterials(takeoff_id);
        });

        measurementUnitInput.on("change", function () {
          let newMeasurementUnit = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurementUnit(rowId, newMeasurementUnit);
          // Reload the table to reflect changes
          loadTakeoffMaterials(takeoff_id);
        });

        // Labor price input
        let laborPrice = $("<input type='number' id='labor_price_" + row.id + "' value='" + row.labor_cost + "' step='any' min='0' onchange='laborPriceChange(" + row.id + ")'>");
        let laborCell = $("<td style='width:200px; float:left;'>Labor Cost $</td>").append(laborPrice);
        newRow.append(laborCell);

        // Materials and cost calculation
        let materialsCell = $("<td></td>");
        let subsum = 0;

        if (row.applied != 0) {
          if (row.selected_materials && row.selected_materials.length > 0) {
            row.selected_materials.forEach((material) => {
              materialsCell.append("<i style='display:inline-block; padding:5px;'>" + material.name + " </i> ");
              let materialCell = $("<i class='fa fa-trash' onclick='removeMaterial(" + row.id + ", " + material.id + ")'>");
              materialsCell.append(materialCell);

              // Parse values and handle NaN
              let materialCost = parseFloat(material.cost) || 0;
              let measurement = parseFloat(row.measurement) || 0;
              let coverage = parseFloat(row.coverage) || 1; // Default to 1 to avoid division by zero
              let newCost = materialCost;

              // Adjust cost for primary, secondary, and tertiary materials
              if (material.id == row.material_id) {
                let primaryCostDelta = parseFloat(row.primary_cost_delta) || 0;
                newCost += primaryCostDelta;

                // Material price input
                let materialPrice = $("<input type='number' id='material_price_" + material.id + "' value='" + newCost.toFixed(2) + "' step='any' min='0' onchange='priceChange(" + material.id + ")'><br>");
                materialPrice.addClass("material-price-input");
                materialPrice.append("<input type='hidden' id='raw_material_price_" + material.id + "' value='" + material.cost + "'>");
                materialsCell.append(materialPrice);
              } else if (material.id == row.secondary_material_id) {
                let secondaryCostDelta = parseFloat(row.secondary_cost_delta) || 0;
                newCost += secondaryCostDelta;

                let materialPrice = $("<input type='number' id='material_price_" + material.id + "' value='" + newCost.toFixed(2) + "' step='any' min='0' onchange='priceChange(" + material.id + ")'><br>");
                materialPrice.addClass("material-price-input");
                materialPrice.append("<input type='hidden' id='raw_material_price_" + material.id + "' value='" + material.cost + "'>");
                materialsCell.append(materialPrice);
              } else if (material.id == row.tertiary_material_id) {
                let tertiaryCostDelta = parseFloat(row.tertiary_cost_delta) || 0;
                newCost += tertiaryCostDelta;

                let materialPrice = $("<input type='number' id='material_price_" + material.id + "' value='" + newCost.toFixed(2) + "' step='any' min='0' onchange='priceChange(" + material.id + ")'><br>");
                materialPrice.addClass("material-price-input");
                materialPrice.append("<input type='hidden' id='raw_material_price_" + material.id + "' value='" + material.cost + "'>");
                materialsCell.append(materialPrice);
              }

              // Divide measurement by coverage and add to subsum
              let adjustedMeasurement = measurement / coverage;
              if (isNaN(adjustedMeasurement) || !isFinite(adjustedMeasurement)) {
                adjustedMeasurement = 0;
              }

              subsum += newCost * adjustedMeasurement;

              if (row.labor_cost > 0) {
                subsum += parseFloat(row.labor_cost) * adjustedMeasurement;
              }
            });
          }

          newRow.append(materialsCell);

          // "Add Material" button
          let addSubject = $("<input type='button' onclick='add_subject(" + row.id + ")'>");
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
      $("#sum").text("Total Cost: $" + sum.toFixed(2));
    })
    .fail(function () {
      console.log("Failed to load takeoff materials");
    });
}



function updateMeasurement(rowId, newMeasurement) {
  $.post("/update-measurement", { id: rowId, measurement: newMeasurement })
    .done(function() {
      console.log("Measurement updated for subject: " + rowId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
      console.log("Failed to update measurement for subject: " + rowId);
    });
}

function updateMeasurementUnit(rowId, newUnit) {
  console.log("Updating measurement unit for subject: " + rowId + " to: " + newUnit);
  
  $.post("/update-measurement-unit", { id: rowId, unit: newUnit })
    .done(function() {
      console.log("Measurement unit updated successfully for subject: " + rowId);
      loadTakeoffMaterials(takeoff_id); // Reload the materials to reflect changes
    })
    .fail(function() {
      console.log("Failed to update measurement unit for subject: " + rowId);
     // alert("Failed to update the measurement unit. Please try again.");
    });
}

function laborPriceChange(id) {
  newPrice = $("#labor_price_"+id).val();
  

  $.post("/change-labor-price", { subject: id, price: newPrice })
    .done(function() {
      console.log("Price updated for material: " + id);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
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

  console.log("New price: " + newPrice);

  $.post("/change-material-price", { material_id: id, delta: delta })
    .done(function() {
      console.log("Price updated for material: " + id);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function() {
      console.log("Failed to update price for material: " + id);
    });
  

}



