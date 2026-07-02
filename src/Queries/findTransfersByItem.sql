USE P21_REPL;
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

WHERE
    i.item_id = @itemId
    AND h.complete_flag = 'N'

ORDER BY h.planned_recpt_date;