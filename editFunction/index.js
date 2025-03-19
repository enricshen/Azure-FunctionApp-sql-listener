const sql = require("mssql");
require("dotenv").config();

module.exports = async function (context, req) {
    try {
        // Validate required parameters: table name and id
        const table = req.body.table;
        const recordId = req.body.id;

        if (!table || !recordId) {
            context.res = {
                status: 400,
                body: "Request must include 'table' and 'id' fields.",
            };
            return;
        }

        // Escape table name to prevent SQL Injection
        const escapedTable = `[${table.replace(/[^a-zA-Z0-9_]/g, "")}]`;

        // Extract fields to update (excluding 'table' and 'id')
        const updates = { ...req.body };
        delete updates.table;
        delete updates.id;

        if (Object.keys(updates).length === 0) {
            context.res = {
                status: 400,
                body: "No fields provided to update.",
            };
            return;
        }

        // Establish SQL connection
        const pool = await sql.connect({
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            server: process.env.SQL_SERVER,
            database: process.env.SQL_DATABASE,
            options: {
                encrypt: process.env.SQL_ENCRYPT === "true",
                enableArithAbort: true,
            },
        });

        // Step 1: Retrieve Existing Record
        const selectQuery = `SELECT * FROM ${escapedTable} WHERE id = @recordId`;
        const selectResult = await pool
            .request()
            .input("recordId", sql.Int, recordId)
            .query(selectQuery);

        if (selectResult.recordset.length === 0) {
            context.res = {
                status: 404,
                body: `No record found in table '${table}' with id '${recordId}'.`,
            };
            return;
        }

        // Step 2: Detect Data Types & Construct Update Query
        const updateClauses = [];
        let paramIndex = 0;
        const request = pool.request();

        Object.keys(updates).forEach((key) => {
            updateClauses.push(`${key} = @param${paramIndex}`);

            const value = updates[key];

            // Detect and bind correct SQL data types
            if (typeof value === "number") {
                if (Number.isInteger(value)) {
                    request.input(`param${paramIndex}`, sql.Int, value); // Integer values
                } else {
                    request.input(`param${paramIndex}`, sql.Decimal(18, 2), value); // Decimal values
                }
            } else if (typeof value === "string" && !isNaN(Date.parse(value))) {
                request.input(`param${paramIndex}`, sql.DateTime, new Date(value)); // Date values
            } else {
                request.input(`param${paramIndex}`, sql.NVarChar, value); // Default to string
            }

            paramIndex++;
        });

        const updateQuery = `UPDATE ${escapedTable} SET ${updateClauses.join(", ")} WHERE id = @recordId`;
        request.input("recordId", sql.Int, recordId);

        // Step 3: Execute Update Query
        await request.query(updateQuery);

        // Step 4: Return the Updated Record
        const updatedRecord = await pool
            .request()
            .input("recordId", sql.Int, recordId)
            .query(selectQuery);

        context.res = {
            status: 200,
            body: updatedRecord.recordset[0],
        };
    } catch (error) {
        context.log(`Error: ${error.message}`);
        context.res = { status: 500, body: `Database error: ${error.message}` };
    } finally {
        sql.close(); // Close connection
    }
};
