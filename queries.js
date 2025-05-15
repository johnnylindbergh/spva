module.exports = {
  getTakeoff: `
    SELECT applied_materials.id AS id,
      applied_materials.material_id AS material_id,
      applied_materials.applied AS applied,
      applied_materials.separate_line_item AS separate_line_item,
      applied_materials.name AS material_name,
      applied_materials.notes AS notes,
      applied_materials.cost_delta AS cost_delta,
      applied_materials.coverage_delta as coverage_delta,
      applied_materials.labor_cost AS labor_cost,
      applied_materials.measurement AS measurement,
      applied_materials.notes AS notes,
      applied_materials.measurement_unit AS measurement_unit,
      applied_materials.color AS color,
      materials.name AS material_name_from_materials
    FROM
      applied_materials
    LEFT JOIN
      materials ON applied_materials.material_id = materials.id
    WHERE
      applied_materials.takeoff_id = ?
    ORDER BY applied_materials.name ASC;
      `,

      getCustomerTakeoff: `SELECT 
    takeoffs.id AS takeoff_id,
    takeoffs.name AS takeoff_name,
    takeoffs.isArchived AS takeoff_isArchived,
    takeoffs.creator_id,
    takeoffs.file_path_of_plans,
    takeoffs.estimate_id,
    takeoffs.isAlTakeoff AS isAlTakeoff,
    takeoffs.isLocked AS isLocked,
    takeoffs.status AS takeoff_status,
    takeoffs.hash AS takeoff_hash,
    takeoffs.view_count AS takeoff_view_count,
    takeoffs.total AS takeoff_total,
    takeoffs.material_cost AS material_total,
    takeoffs.labor_cost AS labor_total,
    takeoffs.material_markup AS material_markup,
    takeoffs.touchups_cost AS touchups_cost,
    takeoffs.profit as profit,
    takeoffs.labor_markup AS labor_markup,
    takeoffs.supervisor_markup AS supervisor_markup,
    takeoffs.travel_cost AS travel_cost,
    takeoffs.signed_at AS takeoff_signed_at,
    takeoffs.tax AS takeoff_tax,
    takeoffs.payment_method AS takeoff_payment_method,
    takeoffs.duration_hours AS takeoff_duration_hours,
    takeoffs.start_date AS takeoff_start_date,
    takeoffs.end_date AS takeoff_end_date,
    takeoffs.created_at AS takeoff_created_at,
    takeoffs.updated_at AS takeoff_updated_at,
    users.name AS takeoff_last_updated_by,
    takeoffs.customer_id AS takeoff_customer_id,
    customers.id AS customer_id,
    customers.taxable AS customer_taxable,
    customers.givenName AS customer_givenName,
    customers.billing_address AS customer_billing_address,
    customers.CompanyName AS customer_CompanyName,
    customers.isArchived AS customer_isArchived,
    customers.phone AS customer_phone,
    customers.primary_email_address AS customer_primary_email_address,
    customers.invoice_email_address AS customer_invoice_email_address,
    customers.created_at AS customer_created_at,
    customers.updated_at AS customer_updated_at

FROM 
    takeoffs
JOIN 
    customers ON takeoffs.customer_id = customers.id
LEFT JOIN
    users ON takeoffs.last_updated_by = users.id
WHERE 
    takeoffs.id = ? LIMIT 1;`,

    getCustomerTakeoffByHash: `SELECT 
    takeoffs.id AS takeoff_id,
    takeoffs.name AS takeoff_name,
    takeoffs.isArchived AS takeoff_isArchived,
    takeoffs.creator_id,
    takeoffs.file_path_of_plans,
    takeoffs.estimate_id,
    takeoffs.status AS takeoff_status,
    takeoffs.signed_at AS takeoff_signed_at,
    takeoffs.hash AS takeoff_hash,
    takeoffs.view_count AS takeoff_view_count,
    takeoffs.total AS takeoff_total,
    takeoffs.tax AS takeoff_tax,
    takeoffs.material_cost AS material_total,
    takeoffs.labor_cost AS labor_total,
    takeoffs.material_markup AS material_markup,
    takeoffs.labor_markup AS labor_markup,
    takeoffs.supervisor_markup AS supervisor_markup,
    takeoffs.travel_cost AS travel_cost,
    takeoffs.touchups_cost AS touchups_cost,
    takeoffs.profit as profit,
    takeoffs.payment_method AS takeoff_payment_method,
    takeoffs.duration_hours AS takeoff_duration_hours,
    takeoffs.start_date AS takeoff_start_date,
    takeoffs.end_date AS takeoff_end_date,
    takeoffs.created_at AS takeoff_created_at,
    takeoffs.updated_at AS takeoff_updated_at,
    takeoffs.last_updated_by AS takeoff_last_updated_by,
    takeoffs.customer_id AS takeoff_customer_id,
    customers.id AS customer_id,
    customers.taxable AS customer_taxable,
    customers.givenName AS customer_givenName,
    customers.billing_address AS customer_billing_address,
    customers.CompanyName AS customer_CompanyName,
    customers.isArchived AS customer_isArchived,
    customers.phone AS customer_phone,
    customers.primary_email_address AS customer_primary_email_address,
    customers.invoice_email_address AS customer_invoice_email_address,
    customers.created_at AS customer_created_at,
    customers.updated_at AS customer_updated_at,
    users.name AS creator_name,
    users.email AS creator_email
FROM 
    takeoffs
JOIN 
    customers ON takeoffs.customer_id = customers.id
JOIN
    users ON takeoffs.creator_id = users.id
WHERE 
    takeoffs.hash = ? LIMIT 1;`,


    getTakeoffByCustomerID: `SELECT
    takeoffs.id AS takeoff_id,
    takeoffs.name AS takeoff_name,
    takeoffs.isArchived AS takeoff_isArchived,
    takeoffs.creator_id,
    takeoffs.file_path_of_plans,
    takeoffs.estimate_id,
    takeoffs.status AS takeoff_status,
    takeoffs.hash AS takeoff_hash,
    takeoffs.view_count AS takeoff_view_count,
    takeoffs.total AS takeoff_total,
    takeoffs.material_cost AS material_total,
    takeoffs.labor_cost AS labor_total,
    takeoffs.material_markup AS material_markup,
    takeoffs.touchups_cost AS touchups_cost,
    takeoffs.profit as profit,
    takeoffs.labor_markup AS labor_markup,
    takeoffs.supervisor_markup AS supervisor_markup,
    takeoffs.travel_cost AS travel_cost,
    takeoffs.signed_at AS takeoff_signed_at,
    takeoffs.tax AS takeoff_tax,
    takeoffs.payment_method AS takeoff_payment_method,
    takeoffs.duration_hours AS takeoff_duration_hours,
    takeoffs.start_date AS takeoff_start_date,
    takeoffs.end_date AS takeoff_end_date,
    takeoffs.created_at AS takeoff_created_at,
    takeoffs.updated_at AS takeoff_updated_at,
    takeoffs.last_updated_by AS takeoff_last_updated_by,
    takeoffs.customer_id AS takeoff_customer_id,
    customers.id AS customer_id,
    customers.taxable AS customer_taxable,
    customers.givenName AS customer_givenName,
    customers.billing_address AS customer_billing_address,
    customers.CompanyName AS customer_CompanyName,
    customers.isArchived AS customer_isArchived,
    customers.phone AS customer_phone,
    customers.primary_email_address AS customer_primary_email_address,
    customers.invoice_email_address AS customer_invoice_email_address,
    customers.created_at AS customer_created_at,
    customers.updated_at AS customer_updated_at
FROM
    takeoffs
JOIN
    customers ON takeoffs.customer_id = customers.id 
WHERE
    customers.id = ?;`,

fullJoin: `SELECT * FROM subcontractor_forms 
            JOIN 
                forms 
            ON 
                subcontractor_forms.form_id = forms.id 
            JOIN 
                form_items ON form_items.form_id = forms.id 
            JOIN 
                form_item_days ON form_item_days.form_item_id = form_items.id   
            WHERE 
                subcontractor_forms.user_id = ?`,

getinvoiceById:  `SELECT 
    invoices.id AS invoice_id,
    invoices.total AS invoiceTotal,
    invoices.payment_confirmation_email_sent,
    takeoffs.name AS takeoffName, 
    takeoffs.customer_id AS customer_id, 
    takeoffs.payment_method AS payment_method, 
    takeoffs.id AS takeoff_id, 
    invoices.hash AS invoice_hash 
FROM invoices 
JOIN takeoffs ON takeoffs.id = invoices.takeoff_id 
WHERE invoices.id = ?;`

}




// module.exports = {
//   getTakeoff: `SELECT 
//   t.id AS takeoff_id,
//   t.name AS takeoff_name,
  
//   m1.id AS primary_material_id,
//   m1.name AS primary_material_name,
//   'material_id' AS primary_material_type,
//   am.primary_cost_delta,

//   m2.id AS secondary_material_id,
//   m2.name AS secondary_material_name,
//   'secondary_material_id' AS secondary_material_type,
//   am.secondary_cost_delta,

//   m3.id AS tertiary_material_id,
//   m3.name AS tertiary_material_name,
//   'tertiary_material_id' AS tertiary_material_type,
//   am.tertiary_cost_delta,

//   m4.id AS quartary_material_id,
//   m4.name AS quartary_material_name,
//   'quartary_material_id' AS quartary_material_type,
//   am.quartary_cost_delta

// FROM takeoffs AS t
// LEFT JOIN applied_materials AS am ON t.id = am.takeoff_id
// LEFT JOIN materials AS m1 ON am.material_id = m1.id
// LEFT JOIN materials AS m2 ON am.secondary_material_id = m2.id
// LEFT JOIN materials AS m3 ON am.tertiary_material_id = m3.id
// LEFT JOIN materials AS m4 ON am.quartary_material_id = m4.id
// WHERE t.id = ?;`
// }


