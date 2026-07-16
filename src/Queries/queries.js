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

const findProjectCosting = `
DECLARE @customer_id INT;
SELECT @customer_id = COALESCE(
    (SELECT TOP 1 oeh.customer_id
     FROM prod_order_line pol
     JOIN prod_order_line_link poll
         ON pol.prod_order_number = poll.prod_order_number
         AND pol.line_number = poll.prod_order_line_number
         AND poll.trans_type = 'O'
     JOIN oe_line oel
         ON poll.transaction_uid = oel.oe_line_uid
     JOIN oe_hdr oeh
         ON oel.order_no = oeh.order_no
     WHERE pol.prod_order_number = @prodOrderNumber),
    106120
);

DECLARE @customer_currency_id INT;
SELECT @customer_currency_id = COALESCE(currency_id, 3)
FROM customer
WHERE customer_id = @customer_id;

WITH exchange_rates AS (
    SELECT
        line.to_currency_id,
        line.exchange_rate
    FROM p21_view_currency_line line
    JOIN (
        SELECT
            to_currency_id,
            MAX(exchange_date) AS exchange_date
        FROM p21_view_currency_line
        WHERE delete_flag = 'N'
        GROUP BY to_currency_id
    ) recent
        ON line.to_currency_id = recent.to_currency_id
       AND line.exchange_date = recent.exchange_date

    UNION ALL

    SELECT 3, 1.0
),
ranked_suppliers AS (
    SELECT 
        inv_mast_uid,
        supplier_id,
        cost,
        ROW_NUMBER() OVER (
            PARTITION BY inv_mast_uid 
            ORDER BY cost ASC
        ) as rn
    FROM inventory_supplier
    WHERE inv_mast_uid IN (
        SELECT inv_mast_uid 
        FROM prod_order_line_component 
        WHERE prod_order_number = @prodOrderNumber
    )
)

SELECT
    c.prod_order_number,

    i.item_id,
    i.item_desc,

    c.qty_requested,
    c.qty_allocated,
    c.qty_on_pick_tickets,
    c.disposition,

    sup.supplier_id,
    sup.supplier_name,
    
    -- Raw Supplier Cost (in supplier native currency)
    COALESCE(inv_sup.cost, 0) AS raw_supplier_cost,

    -- Supplier Cost (converted to customer currency, before manufacturer markup)
    COALESCE(
        inv_sup.cost
            * COALESCE(cus_rate.exchange_rate, 1.0)
            /
            CASE
                WHEN sup.currency_id = @customer_currency_id
                    THEN COALESCE(cus_rate.exchange_rate, 1.0)
                ELSE COALESCE(sup_rate.exchange_rate, 1.0)
            END,
        0
    ) AS supplier_cost,

    -- Landed cost calculation (with manufacturer markup)
    COALESCE(
        CASE
            WHEN i.default_product_group IN ('ABB', 'ABBMV', 'OMR', 'RIT', 'PHX', 'PHOENIX', 'OMRON', 'RITTAL') THEN
                inv_sup.cost
                    * COALESCE(cus_rate.exchange_rate, 1.0)
                    /
                    CASE
                        WHEN sup.currency_id = @customer_currency_id
                            THEN COALESCE(cus_rate.exchange_rate, 1.0)
                        ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                    END

            WHEN i.default_product_group = 'SMC' THEN
                (
                    inv_sup.cost
                        * COALESCE(cus_rate.exchange_rate, 1.0)
                        /
                        CASE
                            WHEN sup.currency_id = @customer_currency_id
                                THEN COALESCE(cus_rate.exchange_rate, 1.0)
                            ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                        END
                ) * 1.045

            ELSE
                (
                    inv_sup.cost
                        * COALESCE(cus_rate.exchange_rate, 1.0)
                        /
                        CASE
                            WHEN sup.currency_id = @customer_currency_id
                                THEN COALESCE(cus_rate.exchange_rate, 1.0)
                            ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                        END
                ) * 1.05
        END,
        0
    ) AS landed_cost,

    COALESCE(
        CASE
            WHEN i.default_product_group IN ('ABB', 'ABBMV', 'OMR', 'RIT', 'PHX', 'PHOENIX', 'OMRON', 'RITTAL') THEN
                inv_sup.cost
                    * COALESCE(cus_rate.exchange_rate, 1.0)
                    /
                    CASE
                        WHEN sup.currency_id = @customer_currency_id
                            THEN COALESCE(cus_rate.exchange_rate, 1.0)
                        ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                    END

            WHEN i.default_product_group = 'SMC' THEN
                (
                    inv_sup.cost
                        * COALESCE(cus_rate.exchange_rate, 1.0)
                        /
                        CASE
                            WHEN sup.currency_id = @customer_currency_id
                                THEN COALESCE(cus_rate.exchange_rate, 1.0)
                            ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                        END
                ) * 1.045

            ELSE
                (
                    inv_sup.cost
                        * COALESCE(cus_rate.exchange_rate, 1.0)
                        /
                        CASE
                            WHEN sup.currency_id = @customer_currency_id
                                THEN COALESCE(cus_rate.exchange_rate, 1.0)
                            ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                        END
                ) * 1.05
        END,
        0
    ) AS cost,

    -- Extended Cost using Landed Cost
    c.qty_requested * COALESCE(
        CASE
            WHEN i.default_product_group IN ('ABB', 'ABBMV', 'OMR', 'RIT', 'PHX', 'PHOENIX', 'OMRON', 'RITTAL') THEN
                inv_sup.cost
                    * COALESCE(cus_rate.exchange_rate, 1.0)
                    /
                    CASE
                        WHEN sup.currency_id = @customer_currency_id
                            THEN COALESCE(cus_rate.exchange_rate, 1.0)
                        ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                    END

            WHEN i.default_product_group = 'SMC' THEN
                (
                    inv_sup.cost
                        * COALESCE(cus_rate.exchange_rate, 1.0)
                        /
                        CASE
                            WHEN sup.currency_id = @customer_currency_id
                                THEN COALESCE(cus_rate.exchange_rate, 1.0)
                            ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                        END
                ) * 1.045

            ELSE
                (
                    inv_sup.cost
                        * COALESCE(cus_rate.exchange_rate, 1.0)
                        /
                        CASE
                            WHEN sup.currency_id = @customer_currency_id
                                THEN COALESCE(cus_rate.exchange_rate, 1.0)
                            ELSE COALESCE(sup_rate.exchange_rate, 1.0)
                        END
                ) * 1.05
        END,
        0
    ) AS extended_cost

FROM prod_order_line_component c

JOIN inv_mast i
    ON c.inv_mast_uid = i.inv_mast_uid

-- Get the supplier to use: either the one specified on the component line, or the primary supplier of the item
LEFT JOIN ranked_suppliers rs
    ON c.inv_mast_uid = rs.inv_mast_uid
    AND (
        (c.supplier_id IS NOT NULL AND c.supplier_id = rs.supplier_id)
        OR
        (c.supplier_id IS NULL AND rs.rn = 1)
    )

LEFT JOIN inventory_supplier inv_sup
    ON c.inv_mast_uid = inv_sup.inv_mast_uid
    AND inv_sup.supplier_id = rs.supplier_id

LEFT JOIN p21_view_supplier sup
    ON sup.supplier_id = inv_sup.supplier_id

LEFT JOIN exchange_rates cus_rate
    ON cus_rate.to_currency_id = @customer_currency_id

LEFT JOIN exchange_rates sup_rate
    ON sup_rate.to_currency_id = sup.currency_id

WHERE c.prod_order_number = @prodOrderNumber 
    AND c.disposition != 'C'

ORDER BY i.item_id;
`;

const findProductionOrderStatus = `
SELECT complete 
FROM prod_order_hdr 
WHERE prod_order_number = @prodOrderNumber;
`;

const findSalesOrderLine1Price = `
SELECT TOP 1
    oe1.unit_price AS so_line_1_unit_price
FROM prod_order_line pol
JOIN prod_order_line_link poll
    ON pol.prod_order_number = poll.prod_order_number
    AND pol.line_number = poll.prod_order_line_number
    AND poll.trans_type = 'O'
JOIN oe_line oel
    ON poll.transaction_uid = oel.oe_line_uid
JOIN oe_line oe1
    ON oe1.order_no = oel.order_no
   AND oe1.line_no = 1
WHERE pol.prod_order_number = @prodOrderNumber;
`;

module.exports = {
  findBackorderComponents,
  findInventoryBulk,
  findTransfersBulk,
  findPOsBulk,
  findProjectCosting,
  findProductionOrderStatus,
  findSalesOrderLine1Price
};
