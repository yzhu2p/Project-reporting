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

// Create a global connection pool
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL Database');
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    process.exit(1);
  });

// Import SQL queries from JS module
const { 
  findBackorderComponents, 
  findInventoryBulk, 
  findTransfersBulk, 
  findPOsBulk 
} = require('./Queries/queries');

// Location priority scoring:
// 1. 200s first (e.g., MIS 200, Barrie 250)
// 2. Laval (100)
// 3. NS (360)
// 4. BC Surrey (400)
// 5. Others
function getPriorityScore(locationId) {
    const loc = Number(locationId);
    if (loc >= 200 && loc < 300) return 1;
    if (loc === 100) return 2;
    if (loc === 360) return 3;
    if (loc === 400) return 4;
    return 5;
}

app.get('/api/backorders/:prodOrderNumber', async (req, res) => {
    const prodOrderNumber = req.params.prodOrderNumber;
    
    try {
        const pool = await poolPromise;
        
        // 1. Get backordered components for this project
        const backordersResult = await pool.request()
            .input('prodOrderNumber', sql.VarChar, prodOrderNumber)
            .query(findBackorderComponents);
            
        const components = backordersResult.recordset;
        
        // If no components found, return empty
        if (!components || components.length === 0) {
            return res.json([]);
        }
        
        // Project location is the source location of the production order
        const toLocationId = components[0].source_location_id;
        
        // 2. Fetch inventory, transfers and POs in bulk (exactly 3 parallel queries)
        const [inventoryResult, transferResult, poResult] = await Promise.all([
            pool.request()
                .input('prodOrderNumber', sql.VarChar, prodOrderNumber)
                .query(findInventoryBulk),
            pool.request()
                .input('prodOrderNumber', sql.VarChar, prodOrderNumber)
                .input('toLocationId', sql.Int, toLocationId)
                .query(findTransfersBulk),
            pool.request()
                .input('prodOrderNumber', sql.VarChar, prodOrderNumber)
                .query(findPOsBulk)
        ]);
        
        const allInventory = inventoryResult.recordset || [];
        const allTransfers = transferResult.recordset || [];
        const allPOs = poResult.recordset || [];
        
        // Index queries in JS by item_id to associate them in O(N) instead of O(N^2)
        const inventoryMap = {};
        allInventory.forEach(inv => {
            if (!inventoryMap[inv.item_id]) inventoryMap[inv.item_id] = [];
            inventoryMap[inv.item_id].push(inv);
        });
        
        const transferMap = {};
        allTransfers.forEach(tx => {
            if (!transferMap[tx.item_id]) transferMap[tx.item_id] = [];
            transferMap[tx.item_id].push(tx);
        });
        
        const poMap = {};
        allPOs.forEach(po => {
            if (!poMap[po.item_id]) poMap[po.item_id] = [];
            poMap[po.item_id].push(po);
        });
        
        // 3. Map items and calculate recommendations
        const enhancedComponents = components.map(comp => {
            const itemId = comp.item_id;
            const inventory = inventoryMap[itemId] || [];
            const transfers = transferMap[itemId] || [];
            const pos = poMap[itemId] || [];
            
            const shortage = comp.qty_requested - comp.qty_allocated;
            
            // Check if transfers cover the shortage
            const totalPendingTransfer = transfers.reduce((sum, tx) => sum + (tx.qty_to_transfer - tx.qty_received), 0);
            
            let recommendation = "";
            let recommendedTransferLocation = null;
            
            if (totalPendingTransfer >= shortage) {
                recommendation = "Await Transfer";
            } else {
                // Filter out the project's own location from transfer consideration
                const candidateInventory = inventory.filter(inv => Number(inv.location_id) !== Number(comp.source_location_id));
                
                if (candidateInventory.length > 0) {
                    recommendation = "Recommend Transfer";
                    let bestLoc = candidateInventory[0];
                    let bestScore = getPriorityScore(bestLoc.location_id);
                    
                    for (let i = 1; i < candidateInventory.length; i++) {
                        let score = getPriorityScore(candidateInventory[i].location_id);
                        if (score < bestScore) {
                            bestScore = score;
                            bestLoc = candidateInventory[i];
                        }
                    }
                    recommendedTransferLocation = bestLoc.location_id;
                } else {
                    // Check if there is an active PO heading specifically to the project location
                    const hasProjectLocationPO = pos.some(po => Number(po.location_id) === Number(comp.source_location_id));
                    if (hasProjectLocationPO) {
                        recommendation = "Await Purchase Order";
                    } else {
                        recommendation = "Suggest Purchase";
                    }
                }
            }
            
            return {
                ...comp,
                inventory,
                transfers,
                pos, // Array of all open POs
                recommendation,
                recommendedTransferLocation
            };
        });
        
        res.json(enhancedComponents);
        
    } catch (err) {
        console.error("API Error: ", err);
        res.status(500).json({ error: "An error occurred fetching data.", details: err.message });
    }
});

// Serve static built frontend files (for docker or production bundle)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Wildcard fallback to serve index.html for client-side routing
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    } else {
        res.status(404).json({ error: 'API route not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});