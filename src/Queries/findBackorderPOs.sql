USE P21_REPL;

SELECT
    c.prod_order_number,

    i.item_id,
    i.item_desc,
    i.extended_desc,

    c.qty_requested,
    c.qty_allocated,
    c.disposition,

    po.po_no,
    po.date_due,
    po.qty_ordered,
    po.qty_received

FROM prod_order_line_component c
JOIN inv_mast i
    ON c.inv_mast_uid = i.inv_mast_uid

OUTER APPLY
(
    SELECT TOP (1)

        h.po_no,
        l.date_due,
        l.qty_ordered,
        l.qty_received

    FROM po_line l

    JOIN po_hdr h
        ON h.po_no = l.po_no

    WHERE l.inv_mast_uid = c.inv_mast_uid
      AND h.complete = 'N'
      AND l.qty_ordered <> l.qty_received

    ORDER BY l.date_due
) po

WHERE c.prod_order_number = @prodOrderNumber
  AND c.qty_allocated < c.qty_requested
  AND (c.disposition = 'B')

ORDER BY i.item_id;