module.exports = {
            getTakeoff: `SELECT
  applied_materials.id AS id,
  applied_materials.material_id AS material_id,
  primary_materials.name AS primary_material_name,
  applied_materials.applied AS applied,
  applied_materials.separate_line_item AS separate_line_item,
  applied_materials.name AS material_name,
  applied_materials.secondary_material_id AS secondary_material_id,
  secondary_materials.name AS secondary_material_name,
  applied_materials.tertiary_material_id AS tertiary_material_id,
  tertiary_materials.name AS tertiary_material_name,
  applied_materials.quartary_material_id AS quartary_material_id,
  quartary_materials.name AS quartary_material_name,
  applied_materials.primary_cost_delta AS primary_cost_delta,
  applied_materials.labor_cost AS labor_cost,
  applied_materials.secondary_cost_delta AS secondary_cost_delta,
  applied_materials.tertiary_cost_delta AS tertiary_cost_delta,
  applied_materials.quartary_cost_delta AS quartary_cost_delta,
  applied_materials.measurement AS measurement,
  applied_materials.measurement_unit AS measurement_unit
FROM
  applied_materials
LEFT JOIN
  materials AS primary_materials ON applied_materials.material_id = primary_materials.id
LEFT JOIN
  materials AS secondary_materials ON applied_materials.secondary_material_id = secondary_materials.id
LEFT JOIN
  materials AS tertiary_materials ON applied_materials.tertiary_material_id = tertiary_materials.id
LEFT JOIN
  materials AS quartary_materials ON applied_materials.quartary_material_id = quartary_materials.id
WHERE
  applied_materials.takeoff_id = ?;
`
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


