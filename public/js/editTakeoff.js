
// some global variables
let subject_id = 0;
let material_id = 0;
let takeoff_id = 0;
let laborTotal = 0;
let materialTotal = 0;

let labor_rate = 0;
let labor_markup = 0; // Labor markup as a percentage
let laborTotalAdjusted = 0;
let material_markup = 0; // Material markup as a percentage
let supervisor_markup = 0; // Supervisor markup as a percentage
let travel_extra = 0;
let touchups_cost = 0; // This should not affect gross profit
let misc_material_cost = 0;
let equipment_cost = 0; // Equipment cost, not part of COGS
let tax = 0;
let profit = 0;

let takeoffStatus = 0; // 0 = uploaded, 4 = signed

let isLocked = 0; // 0 = unlocked, 1 = locked

// Returns the total material cost including miscellaneous material
function getMaterialTotal() {
  return materialTotal + misc_material_cost;
}

// Returns the tax on the material total
function getMaterialTax() {
  return getMaterialTotal() * (parseFloat(tax) / 100);
}

// Returns the material total including tax
function getMaterialTaxedMaterialTotal() {
  return getMaterialTotal() + getMaterialTax();
}

// Returns the material markup amount (part of revenue)
function getMaterialMarkup() {
  return materialTotal * (parseFloat(material_markup));
}

// Returns the labor markup amount (part of revenue)
function getLaborMarkup() {
  return (laborTotal) * (parseFloat(labor_markup));
}

// Returns the touchups cost (this is now treated as an operating expense)
function getTouchupsCost() {
  return touchups_cost;
}

// Returns the labor total including travel (excluding touchups_cost and markup)
function getLaborWithTravel() {
  return laborTotal + travel_extra;
}

// Returns the cost of goods sold (COGS), excluding markups and touchups_cost
function getCostOfGoodsSold() {
  return getMaterialTotal() + getLaborWithTravel();
}

// Returns the revenue including markups, profit, and supervisor markup
function getRevenue() {
  const baseCost = getMaterialTotal() + getLaborWithTravel();
  const totalMarkups = getMaterialMarkup() + getLaborMarkup();
  const revenue = (baseCost + totalMarkups) * (1 + parseFloat(profit) / 100) * (1 + parseFloat(supervisor_markup));
  return revenue;
}

// Returns the gross profit (revenue - COGS, excluding touchups_cost)
// Ensures gross profit is never negative
function getGrossProfit() {
  const revenue = getRevenue();
  const cogs = getCostOfGoodsSold();
  const grossProfit = revenue - cogs;
  return Math.max(grossProfit, 0); // Ensures gross profit is never negative
}

// Returns the gross profit margin as a percentage
function getGrossProfitMargin() {
  const grossProfit = getGrossProfit();
  const revenue = getRevenue();
  if (revenue === 0) return 0; // Avoid division by zero
  return (grossProfit / revenue) * 100;
}

// Returns the supervision cost (not part of COGS)
function getSupervisionCost() {
  return (getLaborWithTravel() + getMaterialTaxedMaterialTotal()) * (parseFloat(supervisor_markup));
}

// a dic that will hold the paint order
// materialId, materialName, numberOfGallons
let paintOrder = [];



// function toggleMaterial(materialId, checkbox) {
//   console.log("Material toggled: " + materialId);

//   let isChecked = checkbox.checked ? 1 : 0;

//   $.post("/toggle-material", { material_id: materialId })
//     .done(function () {
//       console.log("Material toggled successfully: " + materialId);
//       loadTakeoffMaterials(takeoff_id);
//     })
//     .fail(function () {
//       console.log("Failed to toggle material: " + materialId);
//     });
// }



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
  const input = document.getElementById("myInput");
  const filter = input.value.toUpperCase();
  const div = document.getElementById("materialLibrary");
  // Get all material blocks (skip the first <a> which is the close button)
  const materialDivs = Array.from(div.querySelectorAll("div[data-name]"));

  materialDivs.forEach(materialDiv => {
    const name = materialDiv.getAttribute("data-name") || "";
    if (name.toUpperCase().indexOf(filter) > -1) {
      materialDiv.style.display = "";
    } else {
      materialDiv.style.display = "none";
    }
  });
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

function changeOwnershipIntent() {
  // show the change ownership modal
  $("#changeOwnershipModal").modal("show");

  const customerDropdown = $("#customerDropdown")
  
  // fetch customers from the server using jQuery
  $.get("/getCustomers", function (response) {
    console.log(response);
    if (response) {
      // populate the customer dropdown
      customerDropdown.empty();
      customerDropdown.append("<option value=''>Select a customer</option>");
      response.forEach((customer) => {
        console.log(customer);
        customerDropdown.append(
          "<option value='" + customer.id + "'>" + customer.givenName + "</option>"
        );
      });
    } else {
      console.error("Failed to fetch customers");
    }
  });
 
}
function closeChangeOwnershipModal() {
  // close the modal
  $("#changeOwnershipModal").modal("hide");
}


function changeOwnership() {
  // get the newname from the input field
  let customerId = $("#customerDropdown").val();
  console.log("Changing ownership to customer: " + customerId);
  $.post("/update-takeoff-ownership", { takeoff_id: takeoff_id, customer_id: customerId })

    .done(function () {
      console.log("Takeoff ownership changed to customer: " + customerId);
      // reload the page
      //location.reload();
      // re post to the server to reload page
      $.post("/editTakeoff", { takeoff_id: takeoff_id })
        .done(function () {
          console.log("Reloaded takeoff");
          // reload the page
          location.reload();
        })
        .fail(function () {
          console.log("Failed to reload takeoff");
        });
    })
    .fail(function () {
      console.log("Failed to change takeoff ownership to customer: " + customerId);
      // show an error message
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify  takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        //console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}


function unsignTakeoffIntent() {
  // show the unsign takeoff modal
  $("#unsignModal").modal("show");
}
function closeUnsignTakeoffModal() {
  // close the modal
  $("#unsignModal").modal("hide");
}
function unsignTakeoff() {
  // get the newname from the input field
  console.log("Unsigning takeoff: " + takeoff_id);
  $.post("/unsign-takeoff-intent", { takeoff_id: takeoff_id })
    .done(function () {
      // hide the modal, show the OTP modal
      $("#unsignModal").modal("hide");
      $("#otpModal").modal("show");
    })
    .fail(function () {
      console.log("Failed to unsign takeoff: " + takeoff_id);
      // show an error message
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        //console.log('clicked');
        // go back one page


      });
    });
}

function verifyOTP(action) {
  // get the newname from the input field
  let otp = $("#otp").val();
  console.log("Verifying OTP: " + otp);
  $.post("/verify-otp", { takeoff_id: takeoff_id, otp: otp })

    .done(function () {
      console.log("OTP verified");
      // hide the modal
      $("#otpModal").modal("hide");

      // Start polling the server every second to check if the OTP has been approved
      const intervalId = setInterval(() => {
        $.get("/check-otp-status", { takeoff_id: takeoff_id })
          .done(function (response) {
            console.log(response);
            if (response.approved) {
              console.log("OTP approved");
              clearInterval(intervalId); // Stop polling
              // reload the page
              location.reload();
            } else {
              Swal.fire({
                title: 'Error',
                text: 'OTP is invalid or expired.',
                icon: 'error',
                showCancelButton: false,
                confirmButtonText: 'OK'
              });
            }
          })
          .fail(function () {
            console.log("Failed to check OTP status");
          });
      }, 5000);
    })
    .fail(function () {
      console.log("Failed to verify OTP: " + otp);
      // show an error message
      Swal.fire({
        title: 'Error',
        text: 'Failed to verify OTP.',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        //console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}



function closeOtpModal() {
  // close the modal
  $("#otpModal").modal("hide");
  // reload the page
  location.reload();
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


  // let scrollPos = $(window).scrollTop(); // Store current scroll position
  
  dropdown.toggle();
  // get the coordinates of the button
  // $(window).scrollTop(scrollPos);


}

function closeDropdown() {
  let dropdown = $("#materialLibrary");

  let scrollPos = $(window).scrollTop(); // Store current scroll position
  dropdown.toggle();
  setTimeout(function () {
    $(window).scrollTop(scrollPos); // Restore scroll position
  }, 200);
}

function add_material(id) {
  console.log("Added material_id " + id + " for subject " + subject_id);
  material_id = id;
  let dropdown = $("#materialLibrary");
  let scrollPos = $(window).scrollTop(); // Store current scroll position
  dropdown.toggle();

  if (material_id != null && subject_id != null) {
    addMaterialSubject();
  }
  setTimeout(function () {
    $(window).scrollTop(scrollPos); // Restore scroll position
  }, 150);

}

// function removeMaterial(subject_id, id) {
//   material_id = id;

//   if (subject_id && id) {
//     $.post("/remove-material-subject", {
//       material_id: material_id,
//       subject_id: subject_id,
//     })
//       .done(function () {
//         console.log(
//           "Material removed: " + material_id + " from subject: " + subject_id
//         );
//         loadTakeoffMaterials(takeoff_id); // Only reload the takeoff materials table
//       })
//       .fail(function () {
//         console.log("Failed to remove material from subject: " + material_id);
//       });
//   }
// }

function removeMaterial(sId, mId) {
  removeMaterialSubject(sId, mId);

  // push onto undo stack
  pushUndo({
    action: "removeMaterialSubject",
    undoData: {
      subjectId: sId,
      materialId: mId
    },
    redoData: {
      subjectId: sId,
      materialId: mId
    }
  });
}
function removeMaterialSubject(sId, mId) {
  $.post("/remove-material-subject", { 
    material_id: mId, 
    subject_id: sId 
  })
    .done(function () {
      console.log("Material removed: " + mId + " from subject: " + sId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to remove material from subject: " + mId);
    });
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
        }, 150);
      })
      .fail(function () {
        console.log("Failed to add material to subject: " + material_id);
      });
  } else {
    console.log("Material or subject not selected");
    alert("Please select both a material and a subject before adding.");
  }
}

// Now rewire your old add/remove to track undo
function addMaterialSubject() {
  console.log("Adding material " + material_id + " to subject " + subject_id);

  if (material_id !== 0 && subject_id !== 0) {
    add_material_subject(subject_id, material_id);

    // Add to undo stack
    pushUndo({
      action: "addMaterialSubject",
      undoData: {
        subjectId: subject_id,
        materialId: material_id
      },
      redoData: {
        subjectId: subject_id,
        materialId: material_id
      }
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
  document.getElementById('laborRateValue').value = labor_rate;
  console.log(laborTotal)

  let labor_adjusted = laborTotal / labor_rate;// 8 hours a day
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
}, 200);

function changeLaborMarkupHelper(value) {
  labor_markup = value / 100;
  $('#laborMarkupValue').val(labor_markup * 100 );
  debounceChangeLaborMarkup(value);
}

const debounceChangeLaborMarkup = debounce(function (value) {
  changeLaborMarkup(value);
}, 200);

function changeLaborMarkup(value) {
  labor_markup = value / 100.0;
  console.log("Changing labor markup to: " + labor_markup);
  $("#laborMarkupValue").val(parseInt(labor_markup * 100) );

  $('#laborTotal').text("Labor Cost: $" + numberWithCommas(laborTotalAdjusted.toFixed(2)));
  $.post("/change-labor-markup", { takeoff_id: takeoff_id, labor_markup: (labor_markup.toFixed(2)) })
    .done(function () {
      console.log("Labor markup updated: " + labor_markup);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to update labor markup: " + labor_markup);

      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });


    });
}

function updateMaterialMarkupHelper(value) {
  material_markup = value;
  $('#materialMarkupValue').text(material_markup );
  debounceChangeMaterialMarkup(value);
}

function changeMaterialMarkup(value) {
  material_markup = value / 100.0;
  console.log("Changing material markup to: " + material_markup);
  $("#materialMarkupValue").val(parseInt(material_markup * 100) );

  //$('#sum').text("Total Cost: $" + numberWithCommas((laborTotalAdjusted + materialTotal).toFixed(2)));
  $.post("/change-material-markup", { takeoff_id: takeoff_id, material_markup: material_markup.toFixed(2) })
    .done(function () {
      console.log("Material markup updated: " + material_markup);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}

const debounceChangeMaterialMarkup = debounce(function (value) {
  changeMaterialMarkup(value);
}, 200);

function updateSupervisorMarkup(value) {
  supervisor_markup = value / 100.0;
  console.log("Changing supervisor markup to: " + supervisor_markup);
  $("#supervisorMarkupValue").val(parseInt(value) );

  $.post("/change-supervisor-markup", { takeoff_id: takeoff_id, supervisor_markup: (supervisor_markup).toFixed(2) })
    .done(function () {
      console.log("Supervisor markup updated: " + supervisor_markup);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}

// helper debounced
function updateSupervisorMarkupHelper(value) {
  supervisor_markup = value;
  $('#supervisorMarkupValue').val(supervisor_markup );
  debounceUpdateSupervisorMarkup(value);
}

const debounceUpdateSupervisorMarkup = debounce(function (value) {

  updateSupervisorMarkup(value);
}, 200);


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
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}

function updateTouchupsCostHelper(value) {
  touchups_cost = value;
  $('#touchupsCostValue').val( touchups_cost);
  debounceUpdateTouchupsCost(value);
}

const debounceUpdateTouchupsCost = debounce(function (value) {
  updateTouchupsCost(value);
}, 200);

function updateTouchupsCost(value) {
  touchups_cost = value;
  console.log("Changing touchups cost to: " + touchups_cost);
  $("#touchupsCost").val(parseFloat(value));
  
  $.post("/change-touchups-cost", { takeoff_id: takeoff_id, touchups_cost: touchups_cost })
    .done(function () {
      console.log("Touchups cost updated: " + touchups_cost);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}

function updateProfit(value) {
  profit = value;
  console.log("Changing profit to: " + profit);
  $("#profit").val(parseFloat(value));
  $.post("/change-profit", { takeoff_id: takeoff_id, profit: profit })
    .done(function () {
      console.log("Profit updated: " + profit);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}


// debounce the profit change
function updateProfitHelper(value) {
  profit = value;
  $('#profitValue').val(profit);
  debounceUpdateProfit(value);
}

const debounceUpdateProfit = debounce(function (value) {
  updateProfit(value);
}, 200);


function updateTaxHelper(value) {
  tax = value;
  $('#taxValue').text(tax + "%");
  debounceUpdateTax(value);
}

const debounceUpdateTax = debounce(function (value) {
  updateTax(value);
} , 200);

function updateTax(value) {
  tax = value;
  console.log("Changing tax to: " + tax);
  $("#tax").val(parseFloat(value));
  $.post("/change-tax", { takeoff_id: takeoff_id, tax: tax })
    .done(function () {
      console.log("Tax updated: " + tax);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}


function updateMiscMaterialCostHelper(value) {
  misc_material_cost = value;
  $('#miscMaterialCostValue').val(misc_material_cost);
  debounceUpdateMiscMaterialCost(value);
}

const debounceUpdateMiscMaterialCost = debounce(function (value) {
  updateMiscMaterialCost(value);
}  , 200);

function updateMiscMaterialCost(value) {
  misc_material_cost = value;
  console.log("Changing misc material cost to: " + misc_material_cost);
  $("#miscMaterialCost").val(parseFloat(value));
  $.post("/change-misc-material-cost", { takeoff_id: takeoff_id, misc_material_cost: misc_material_cost })
    .done(function () {
      console.log("Misc material cost updated: " + misc_material_cost);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}

function updateEquipmentCostHelper(value) {
  equipment_cost = value;
  $('#equipmentCostValue').val(equipment_cost);
  debounceUpdateEquipmentCost(value);
}

const debounceUpdateEquipmentCost = debounce(function (value) {
  updateEquipmentCost(value);
}, 200);

function updateEquipmentCost(value) {
  equipment_cost = parseFloat(value);
  console.log("Changing equipment cost to: " + equipment_cost);
  $("#equipmentCost").val(parseFloat(value));
  $.post("/change-equipment-cost", { takeoff_id: takeoff_id, equipment_cost: equipment_cost })
    .done(function () {
      console.log("Equipment cost updated: " + equipment_cost);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      Swal.fire({
        title: 'Error',
        text: 'Cannot modify takeoff',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'OK'
      }).then((result) => {
        console.log('clicked');
        // go back one page
        //window.history.back();
      });
    });
}





// the big one
function loadTakeoffMaterials(id) {

  let scrollPos = $(window).scrollTop(); // Store current scroll position
  takeoff_id = id;


  console.log("Loading takeoff materials");

  $.post("/loadTakeoffMaterials", { takeoff_id: takeoff_id })
    .done(function (data) {
      console.log(data.takeoff);



  laborTotal = 0;
  materialTotal = 0;

      // set some global variables
      labor_rate = parseFloat(data.takeoff[0].labor_rate);
      labor_markup = parseFloat(data.takeoff[0].labor_markup);
      material_markup = parseFloat(data.takeoff[0].material_markup);
      supervisor_markup = parseFloat(data.takeoff[0].supervisor_markup);
      travel_extra = parseFloat(data.takeoff[0].travel_cost);
      touchups_cost = parseFloat(data.takeoff[0].touchups_cost);
      misc_material_cost = parseFloat(data.takeoff[0].misc_materials_cost);
      profit = parseFloat(data.takeoff[0].profit);
      tax = parseFloat(data.takeoff[0].tax);
      isLocked = parseInt(data.takeoff[0].isLocked);
      paintOrder = [];
      takeoffStatus = parseInt(data.takeoff[0].status);


      // console.log("is locked", isLocked);
      // // set the lock icon
      // if (isLocked == 1) {
      //   $("#lockIcon").removeClass("fa-lock");
      //   $("#lockIcon").addClass("fa-lock-open");
      //   $("#lockIcon").attr("onclick", "unlockTakeoffIntent()");
      //   $("#lockIcon").attr("title", "Unlock Takeoff");
      // } else {
      //   $("#lockIcon").removeClass("fa-lock-open");
      //   $("#lockIcon").addClass("fa-lock");
      //   $("#lockIcon").attr("onclick", "lockTakeoffIntent()");
      //   $("#lockIcon").attr("title", "Lock Takeoff");
      // }


      





      $("#takeoff_materials_table").empty();

      let headerRow = $("<tr></tr>");
      headerRow.append("<th></th>");
      headerRow.append("<th>Applied</th>");
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

        let subjectNameCell = $("<td></td>").text(row.material_name);
        let notes = row.notes;

        if (notes != null && notes.length > 0) {
          // add a notes icon to the cell
          let notesIcon = $("<i class='fa fa-sticky-note'></i>");
          subjectNameCell.append(" ");
          subjectNameCell.append(notesIcon);
        }

        // if the subjectNameCell is clicked, show the notes in an editable modal dialog
        subjectNameCell.on("click", function () {
          // show the notes in an editable modal dialog
          console.log("clicked");
          console.log(notes);
          $("#notesModal").modal("show");
          $("#notesModal").find("#notes").val(notes);
          $("#notesModal").find("#notes").data("row-id", row.id);
          setNotes(row.id, notes);
        });
        
        
       

        newRow.append(subjectNameCell);

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
          }, 200);
        });

        measurementUnitInput.on("change", function () {
          let newMeasurementUnit = $(this).val();
          let rowId = $(this).data("row-id");
          updateMeasurementUnit(rowId, newMeasurementUnit);
          // Wait one sec and then reload the table to reflect changes
          setTimeout(function () {
            loadTakeoffMaterials(takeoff_id);
          }, 200);
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
        laborPrice.attr("style", "width: 80px;");
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

        console.log("item with labor total", laborsum);
        console.log("total labor", laborTotal);


        if (row.applied == 0) {
          newRow.attr("style", "background-color: #f2f2f2; opacity: 0.5;");
        } else {
          laborsum = parseFloat(row.labor_cost) * parseFloat(row.measurement);

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
                "</br><i class='fa fa-trash' onclick='removeMaterial(" +
                row.id +
                ", " +
                material.id +
                ")'></i>"
              );

              materialsCell.append(materialCell);

                // append the coverage of the material as an editable field

                console.log("computing coverage");
                console.log(material.coverage);
                console.log(row.coverage_delta);

                let adjustedCoverage = parseFloat(material.coverage) - parseFloat(row.coverage_delta) || 1; // Default to 1 to avoid division by zero
                let coverageInput = $("<input>")
                .attr("type", "number")
                .attr("value", adjustedCoverage)
                .attr("step", "any")
                .attr("min", "0")
                .addClass("coverage-input")
                .attr("style", "width: 70px;")
                .data("material-id", material.id)
                .on("change", function () {
                  let newCoverage = $(this).val();
                  let materialId = $(this).data("material-id");
                  console.log(row);
                  updateMaterialCoverage(row.id, newCoverage);

                });

                materialsCell.append(" ").append(coverageInput).append(" sqft/gal @ ");


                if (row.coverage_delta > 0) {
                  coverageInput.css("color", "red");
                } else if (row.coverage_delta < 0) {
                  coverageInput.css("color", "green");
                } else {
                  coverageInput.css("color", "black");
                }

            

              // Parse values and handle NaN
              let materialCost = parseFloat(material.cost) || 0;
              let measurement = parseFloat(row.measurement) || 0;

              console.log(
                "Material cost: " +
                materialCost +
                " Measurement: " +
                measurement +
                " Coverage: " +
                adjustedCoverage
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
                  ")'>"
                );
                // set width to 80px
                materialPrice.attr("style", "width: 80px;");
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
                subsum += newCost * Math.ceil(adjustedMeasurement / adjustedCoverage);
                console.log('subsum', subsum);
              }

              if (row.measurement_unit === "ft' in\"") {
                subsum += newCost * Math.ceil(adjustedMeasurement / adjustedCoverage);

              }

              if (row.measurement_unit === "Count") {
                
                subsum += newCost * Math.ceil((adjustedMeasurement) / adjustedCoverage); // not divided by coverage
              }

              // update the paint order

              let paintOrderIndex = paintOrder.findIndex(
                (x) => x.materialId === material.id
              );


              if (paintOrderIndex === -1) {
                paintOrder.push({
                  materialId: material.id,
                  materialName: material.name,
                  materialCost: parseFloat(material.cost) + parseFloat(row.cost_delta),
                  
                  numberOfGallons: Math.ceil(adjustedMeasurement / adjustedCoverage),

                });
              } else {
                paintOrder[paintOrderIndex].numberOfGallons += Math.ceil(
                  adjustedMeasurement / adjustedCoverage
                );
              }



          
          } else {
            console.log("LoadTakeoffMaterials: No materials selected");
          }

          newRow.append(materialsCell);

          // Center the button vertically and horizontally in the table cell
          let addSubjectCell = $("<td></td>").css({
            "text-align": "center",
            "vertical-align": "middle"
          });

          // "Add Material" button
          let addSubject = $("<input>", {
            type: "button",
            id: "add_material_button_" + row.id,
            value: "Add Material",
            click: function () { add_subject(row.id); }
          }).css({
            "margin": "0 auto",
            "display": "block",
            "padding": "5px 10px",
            "background-color": "#007bff",
            "color": "white",
            "border": "none",
            "border-radius": "5px",
            "cursor": "pointer"
          });

          // Append the button to the cell, and the cell to the row
          addSubjectCell.append(addSubject);
          newRow.append(addSubjectCell);

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

      // Calculate labor total including markup
      let laborTotalAdjusted = laborTotal + getLaborMarkup() + touchups_cost + travel_extra;

      // Calculate material total including markup
      let materialCost = (getMaterialTotal() + getMaterialMarkup()) * (1 + tax / 100);

      // Calculate final totals using the existing functions
      let finalTotal = getRevenue() + touchups_cost + equipment_cost + getMaterialTax(); // Revenue already includes markups, profit, and supervisor markup
      let grossProfit = getGrossProfit();
      let grossProfitMargin = getGrossProfitMargin();

      $("#raw-material-cost").text("Raw Material Cost: $" + numberWithCommas(getMaterialTotal().toFixed(2)));
      $("#supervision-cost").text("Supervision Cost: $" + numberWithCommas(getSupervisionCost().toFixed(2)));
      $("cost-of-goods-sold").text("Cost of Goods Sold: $" + numberWithCommas((laborTotalAdjusted + materialCost).toFixed(2)));



      // Update UI with calculated values
      $("#grossProfit").text("Gross Profit: $" + numberWithCommas(grossProfit.toFixed(2)));
      $("#grossProfitMargin").text("Gross Profit Margin: " + grossProfitMargin.toFixed(2) + "%");

      // Update total sum (revenue)
      $("#sum").text("Total Cost: $" + numberWithCommas(finalTotal.toFixed(2)));

      // Update labor total (including markup)
      $("#laborTotal")
        .html(
          "Labor Cost: $" +
            numberWithCommas(laborTotalAdjusted.toFixed(2)) +
            ' <i class="fa fa-info-circle" style="cursor:pointer;color:#007bff;" title="Show labor details"></i>'
        )
        .off("click")
        .on("click", function () {
          showLaborTotalDetails();
        });

      // Update material total (including markup)
      $("#materialTotal").text("Material Cost: $" + numberWithCommas(materialCost.toFixed(2)));

     



      // if the takeoff is locked, disable all inputs and sliders
      if (isLocked == 1 || takeoffStatus >= 3) {
        console.log("Takeoff is locked");
        $("#takeoff_materials_table input").prop("disabled", true);
        $("#takeoff_materials_table select").prop("disabled", true);
        $("#add_material_button").prop("disabled", true);
        $("#add_material_button").css("background-color", "gray");
        $("input[type='range']").prop("disabled", true); // Disable sliders
        // disable the slider's label input type number
        $("input[type='number']").prop("disabled", true); // Disable number inputs
        // disable the delete material link
        $(".fa-trash").css("pointer-events", "none");
        



        if (takeoffStatus >= 3) {
        // show a sweet alert with a custom image
        // delay for 1 second
            if (!Swal.isVisible()) {
            Swal.fire({
              title: 'Takeoff Locked',
              text: 'This takeoff is shared and cannot be modified.',
              icon: 'warning',
              showCancelButton: false,
            //   imageUrl: '/ruhroh.png',
            // imageWidth: 100,
            // imageHeight: 100,
            // imageAlt: 'Custom image',
              confirmButtonText: 'OK',
            }).then((result) => {
              console.log('clicked');
            });
            }
        
      } else if (isLocked == 1) {
        // show a sweet alert with a custom image
        Swal.fire({
          title: 'Takeoff Locked',
          text: 'This takeoff is locked and cannot be modified.',
          icon: 'warning',
          showCancelButton: false,
          confirmButtonText: 'OK',
          // imageUrl: '/ruhroh.png',
          // imageWidth: 100,
          // imageHeight: 100,
          // imageAlt: 'Custom image'
        }).then((result) => {
          console.log('clicked');
          // go back one page
          //window.history.back();
        });
      }
    }


      
      

      renderPaintOrder(paintOrder);
      //now post the new sums to /updateTakeoffTotal
      $.post("/updateTakeoffTotal", {
        takeoff_id: takeoff_id,
        total: finalTotal.toFixed(2),
        laborTotal: laborTotal.toFixed(2),
        materialTotal: materialCost.toFixed(2),
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

function updateMeasurement(rowId, newMeasurement, oldMeasurement) {
  setMeasurement(rowId, newMeasurement);

  // push to undo
  pushUndo({
    action: "updateMeasurement",
    undoData: {
      subjectId: rowId,
      oldMeasurement: oldMeasurement
    },
    redoData: {
      subjectId: rowId,
      newMeasurement: newMeasurement
    }
  });
}

function setMeasurement(rowId, newMeasurement) {
  $.post("/update-measurement", { id: rowId, measurement: newMeasurement })
    .done(function () {
      console.log("Measurement updated for subject: " + rowId);
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to update measurement for subject: " + rowId);
    });
}


// function updateMeasurement(rowId, newMeasurement) {
//   $.post("/update-measurement", { id: rowId, measurement: newMeasurement })
//     .done(function () {
//       console.log("Measurement updated for subject: " + rowId);
//       loadTakeoffMaterials(takeoff_id);
//     })
//     .fail(function () {
//       console.log("Failed to update measurement for subject: " + rowId);
//     });
// }

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

function updateMaterialCoverage(materialId, newCoverage) {
  console.log("Updating material coverage for material: " + materialId);
  $.post("/update-material-coverage", { material_id: materialId, coverage: newCoverage })
    .done(function () {
      console.log("Material coverage updated successfully for material: " + materialId);
      loadTakeoffMaterials(takeoff_id); // Reload the materials to reflect changes
    })
    .fail(function () {
      console.log("Failed to update material coverage for material: " + materialId);
    });


}
/// this function has an error: the id is matched from the first appearance in the page which is not necescarily the correct material. Fix by passing the row id into the function. This new identifier will be unique to each row
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
  }, 200);
}

let currentNoteId = null; 
function setNotes(id, notes) {
  currentNoteId = id;
  $("#notesTextArea").val(notes);
  
}

function saveNotes(id) {
  let notes = $("#notesTextArea").val();
  console.log("Saving notes for material: " + currentNoteId);
  $.post("/save-notes", { id: currentNoteId, notes: notes})
    .done(function () {
      console.log("Notes saved for material: " + currentNoteId);
      $("#notesModal").modal("hide");
      loadTakeoffMaterials(takeoff_id);
    })
    .fail(function () {
      console.log("Failed to save notes for material: " + currentNoteId);
    });
}



function renderPaintOrder(paintOrder) {
  let paintOrderTable = $("#paintOrderTable");
  paintOrderTable.empty();

  // append the headers
  let headerRow = $("<tr></tr>");
  headerRow.append("<th>Material</th>");
  headerRow.append("<th>Gallons</th>");
  paintOrderTable.append(headerRow);
  paintOrder.forEach((row) => {
    let newRow = $("<tr></tr>");
    newRow.append("<td>" + row.materialName + "</td>");
    newRow.append("<td>" + row.numberOfGallons +" gal"+ "</td>");
    newRow.append("<td>$" + (row.numberOfGallons * parseFloat(row.materialCost)).toFixed(2) + "</td>");

    paintOrderTable.append(newRow);
  });
}



function createSubjectIntent() {
  // togle add-subject-form
  $("#add-subject-form").toggle();
  // hide the button
  $("#add-subject-button").hide();

  // scroll the page down 200px
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

let undoStack = [];
  let redoStack = [];

  // Listen for Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z
  window.addEventListener('keydown', function (e) {
    let isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    let metaKeyPressed = isMac ? e.metaKey : e.ctrlKey;

    if (metaKeyPressed && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (metaKeyPressed && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      handleRedo();
    }
  });

  function pushUndo(actionObj) {
    undoStack.push(actionObj);
    redoStack = [];
  }

  function handleUndo() {
    if (!undoStack.length) return;
    let lastAction = undoStack.pop();
    // For redo we push the same action again
    redoStack.push(lastAction);
    revertAction(lastAction);
  }

  function handleRedo() {
    if (!redoStack.length) return;
    let nextAction = redoStack.pop();
    undoStack.push(nextAction);
    reapplyAction(nextAction);
  }

  function revertAction(actionObj) {
    switch (actionObj.action) {
      case 'setMaterial':
        // revert to old value
        setMaterialState(actionObj.undoData.materialId, actionObj.undoData.value);
        break;

      // handle other action types likewise...
    }
  }
  function reapplyAction(actionObj) {
    switch (actionObj.action) {
  
      case "setMaterialApplied":
        // reapply means use the new value
        setMaterialAppliedState(
          actionObj.redoData.materialId,
          actionObj.redoData.applied
        );
        break;
  
      case "setSeparateLineItem":
        setSeparateLineItemState(
          actionObj.redoData.materialId,
          actionObj.redoData.takeoffId,
          actionObj.redoData.separate
        );
        break;
  
      case "updateMeasurement":
        setMeasurement(
          actionObj.redoData.subjectId,
          actionObj.redoData.newMeasurement
        );
        break;
  
      case "updateMeasurementUnit":
        setMeasurementUnit(
          actionObj.redoData.subjectId,
          actionObj.redoData.newUnit
        );
        break;
  
      case "addMaterialSubject":
        // reapply means add again
        addMaterialSubject(actionObj.redoData.subjectId, actionObj.redoData.materialId);
        break;
  
      case "removeMaterialSubject":
        // reapply means remove again
        removeMaterial(actionObj.redoData.subjectId, actionObj.redoData.materialId);
        break;
  
      case "setLaborRate":
        setLaborRate(actionObj.redoData.takeoffId, actionObj.redoData.newValue);
        break;
  
      case "setLaborMarkup":
        setLaborMarkup(actionObj.redoData.takeoffId, actionObj.redoData.newValue);
        break;
  
      case "setMaterialMarkup":
        setMaterialMarkup(actionObj.redoData.takeoffId, actionObj.redoData.newValue);
        break;
  
      // etc.
    }
  }

  // This is the refactored "set" function that updates the server with explicit on/off
  // and we always pass the desired final state.
  function setMaterialState(materialId, value) {
    $.post("/set-material-state", { material_id: materialId, state: value })
      .done(function() {
         console.log("Updated material " + materialId + " to " + value);
         // then refresh UI or call loadTakeoffMaterials
          loadTakeoffMaterials(takeoff_id);
      })
      .fail(function() {
         console.log("Failed to update material " + materialId);
      });
  }

  // This is your "toggle" but now we explicitly do oldValue->newValue
  function toggleMaterial(materialId, checkboxElem) {
    let newValue = checkboxElem.checked ? 1 : 0;
    let oldValue = newValue ? 0 : 1;

    // do the actual set
    setMaterialState(materialId, newValue);

    // on success, push to undo stack
    undoStack.push({
      action: 'setMaterialApplied',
      undoData: { materialId, value: oldValue },
      redoData: { materialId, value: newValue }
    });
    // Clear redo stack
    redoStack = [];
  }

  


// on document ready, get the takeoff id from the hidden input field
$(document).ready(function () {
  takeoff_id = $("#takeoff_id").val();
  console.log("Takeoff ID: " + takeoff_id);

  setTimeout(function () {
    loadTakeoffMaterials(takeoff_id);
  }, 100);
  

  // setTimeout(function () {
  //   updateLaborRate();
  // }, 200);

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
  // }, 2000);
});

function showLaborTotalDetails() {
  Swal.fire({
    title: 'Labor Total Details',
    html: `
      <p>Labor Rate: $${labor_rate.toFixed(2)}</p>
      <p>Labor Markup: ${labor_markup * 100}%</p>
      <p>Touchups Cost: $${touchups_cost.toFixed(2)}</p>
      <p>Travel Extra: $${travel_extra.toFixed(2)}</p>
      <p>Raw Labor Cost: $${(laborTotal + touchups_cost + travel_extra).toFixed(2)}</p>
      <hr>
      <label for="bidInput">Bid Amount: </label>
      <input type="number" id="bidInput" class="swal2-input" placeholder="Enter bid amount" min="0" step="any">
      <div id="bidResult" style="margin-top:10px;"></div>
    `,
    icon: 'info',
    confirmButtonText: 'OK',
    showCancelButton: false,
    didOpen: () => {
      const bidInput = Swal.getPopup().querySelector('#bidInput');
      const bidResult = Swal.getPopup().querySelector('#bidResult');
      bidInput.addEventListener('input', function () {
        const bid = parseFloat(bidInput.value) || 0;
        const laborCost = laborTotal + touchups_cost + travel_extra;
        const diff = laborCost - bid;
        bidResult.innerHTML = `
          <p>Labor Cost - Bid: $${diff.toFixed(2)}</p>
          <p>Gross Profit (with bid): $${(getGrossProfit() + diff).toFixed(2)}</p>
          <p>Gross Profit Margin: ${((getGrossProfit() + diff) / (getRevenue() + diff) * 100).toFixed(2)}%</p>
        `;
      });
    }
  }).then((result) => {
    // add the diff to gross profit
    if (result.isConfirmed) {
      const bidInput = Swal.getPopup().querySelector('#bidInput');
      // Update gross profit with the difference
      const newGrossProfit = getGrossProfit() + diff;
      // Update the gross profit display
      $("#grossProfit").text("Gross Profit: $" + numberWithCommas(newGrossProfit.toFixed(2)));
    }
  });
}