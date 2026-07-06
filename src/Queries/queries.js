const findBackorderComponents = `
SELECT
    c.prod_order_number,
    oh.source_location_id,

    i.item_id,
    i.item_desc,
    i.extended_desc,

    c.qty_requested,
    c.qty_allocated,
    c.disposition

FROM prod_order_line_component c
JOIN prod_order_hdr oh
    ON c.prod_order_number = oh.prod_order_number
JOIN inv_mast i
    ON c.inv_mast_uid = i.inv_mast_uid

WHERE c.prod_order_number = @prodOrderNumber
  AND c.qty_allocated < c.qty_requested
  AND (c.disposition = 'B')

ORDER BY i.item_id;
`;

const findInventoryBulk = `
SELECT
    i.item_id,
    i.item_desc,

    l.location_id,
    l.order_quantity,

    l.qty_on_hand,
    l.qty_allocated,
    l.qty_backordered,
    l.qty_in_transit,

    (l.qty_on_hand - l.qty_allocated) AS qty_available

FROM inv_mast i
JOIN inv_loc l
    ON i.inv_mast_uid = l.inv_mast_uid

WHERE i.inv_mast_uid IN (
    SELECT c.inv_mast_uid
    FROM prod_order_line_component c
    WHERE c.prod_order_number = @prodOrderNumber
      AND c.qty_allocated < c.qty_requested
      AND c.disposition = 'B'
)
AND (l.qty_on_hand - l.qty_allocated) > 0

ORDER BY l.location_id;
`;

const findTransfersBulk = `
SELECT
    i.item_id,
    h.transfer_no,
    h.from_location_id,
    h.to_location_id,
    h.shipping_date,
    h.planned_recpt_date,
    l.qty_to_transfer,
    l.qty_transferred,
    l.qty_received

FROM inv_mast i
JOIN transfer_line l
    ON i.inv_mast_uid = l.inv_mast_uid
JOIN transfer_hdr h
    ON l.transfer_no = h.transfer_no

WHERE i.inv_mast_uid IN (
    SELECT c.inv_mast_uid
    FROM prod_order_line_component c
    WHERE c.prod_order_number = @prodOrderNumber
      AND c.qty_allocated < c.qty_requested
      AND c.disposition = 'B'
)
AND h.complete_flag = 'N'
AND h.to_location_id = @toLocationId

ORDER BY h.planned_recpt_date;
`;

const findPOsBulk = `
SELECT
    i.item_id,
    h.po_no,
    h.location_id,
    l.date_due,
    l.qty_ordered,
    l.qty_received,
    (l.qty_ordered - l.qty_received) as qty_remaining

FROM inv_mast i
JOIN po_line l
    ON i.inv_mast_uid = l.inv_mast_uid
JOIN po_hdr h
    ON h.po_no = l.po_no

WHERE i.inv_mast_uid IN (
    SELECT c.inv_mast_uid
    FROM prod_order_line_component c
    WHERE c.prod_order_number = @prodOrderNumber
      AND c.qty_allocated < c.qty_requested
      AND c.disposition = 'B'
)
AND h.complete = 'N'
AND l.qty_ordered <> l.qty_received

ORDER BY l.date_due;
`;

module.exports = {
  findBackorderComponents,
  findInventoryBulk,
  findTransfersBulk,
  findPOsBulk
};
