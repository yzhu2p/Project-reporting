require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: "Portal13.promtl.local",
    database: "P21_REPL",
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

// Load queries from external files
const queriesPath = path.join(__dirname, 'Queries');
const findBackorderPOsQuery = fs.readFileSync(path.join(queriesPath, 'findBackorderPOs.sql'), 'utf-8');
const findInventoryQuery = fs.readFileSync(path.join(queriesPath, 'findInventory.sql'), 'utf-8');
const findTransfersQuery = fs.readFileSync(path.join(queriesPath, 'findTransfersByItem.sql'), 'utf-8');

// Location priority list as requested (dummy locations)
const LOCATION_PRIORITY = [100, 200, 300, 250];

function getPriorityScore(locationId) {
    const index = LOCATION_PRIORITY.indexOf(Number(locationId));
    return index === -1 ? 999 : index; // 999 for locations not in priority list
}

app.get('/api/backorders/:prodOrderNumber', async (req, res) => {
    const prodOrderNumber = req.params.prodOrderNumber;
    
    try {
        let pool = await sql.connect(config);
        
        // 1. Fetch backordered components and earliest open PO
        const backordersResult = await pool.request()
            .input('prodOrderNumber', sql.VarChar, prodOrderNumber)
            .query(findBackorderPOsQuery);
            
        const components = backordersResult.recordset;
        
        // If no components found, return empty
        if (components.length === 0) {
            return res.json([]);
        }
        
        // 2. For each component, fetch inventory and transfers concurrently
        const enhancedComponents = await Promise.all(components.map(async (comp) => {
            const itemId = comp.item_id;
            
            const [inventoryResult, transferResult] = await Promise.all([
                pool.request()
                    .input('itemId', sql.VarChar, itemId)
                    .query(findInventoryQuery),
                pool.request()
                    .input('itemId', sql.VarChar, itemId)
                    .query(findTransfersQuery)
            ]);
            
            const inventory = inventoryResult.recordset;
            const transfers = transferResult.recordset;
            
            // 3. Determine Recommended Action
            let recommendation = "";
            let recommendedTransferLocation = null;
            
            if (transfers.length > 0) {
                recommendation = "Await Transfer";
            } else if (inventory.length > 0) {
                recommendation = "Recommend Transfer";
                let bestLoc = inventory[0];
                let bestScore = getPriorityScore(bestLoc.location_id);
                
                for (let i = 1; i < inventory.length; i++) {
                    let score = getPriorityScore(inventory[i].location_id);
                    if (score < bestScore) {
                        bestScore = score;
                        bestLoc = inventory[i];
                    }
                }
                recommendedTransferLocation = bestLoc.location_id;
            } else if (comp.po_no) {
                recommendation = "Await Purchase Order";
            } else {
                recommendation = "Suggest Purchase";
            }
            
            return {
                ...comp,
                inventory,
                transfers,
                recommendation,
                recommendedTransferLocation
            };
        }));
        
        res.json(enhancedComponents);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred fetching data." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});