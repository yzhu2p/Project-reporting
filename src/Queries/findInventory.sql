
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

WHERE i.item_id = @itemId
AND (l.qty_on_hand - l.qty_allocated) > 0

ORDER BY l.location_id;