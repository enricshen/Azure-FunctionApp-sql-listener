const sql = require("mssql");
require("dotenv").config();

module.exports = async function (context, req) {
    try {
        const table = req.body.table;
        if (!table) {
            context.res = { status: 400, body: "Missing 'table' field." };
            return;
        }

        const escapedTable = `[${table.replace(/[^a-zA-Z0-9_]/g, "")}]`;
        const isBulk = Array.isArray(req.body.records);
const records = isBulk
  ? req.body.records.map((r) => {
      const { table, ...rest } = r;
      return rest;
    })
  : [{ ...req.body }];

delete records[0].table;

if (!records.every((r) => r.id)) {
  context.res = { status: 400, body: "Each record must include an 'id' field." };
  return;
}


        const pool = await sql.connect({
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            server: process.env.SQL_SERVER,
            port: parseInt(process.env.SQL_PORT), //remove port if connecting to Azure SQL
            database: process.env.SQL_DATABASE,
            options: {
                encrypt: process.env.SQL_ENCRYPT === "true",
                enableArithAbort: true,
            },
        });

        const updatedRecords = [];

        for (const record of records) {
            const { id, ...updates } = record;

            if (Object.keys(updates).length === 0) continue;

            const updateClauses = [];
            const request = pool.request();
            let paramIndex = 0;

            for (const key of Object.keys(updates)) {
                updateClauses.push(`[${key}] = @param${paramIndex}`);
                const value = updates[key];

                if (typeof value === "number") {
                    if (Number.isInteger(value)) {
                        request.input(`param${paramIndex}`, sql.Int, value);
                    } else {
                        request.input(`param${paramIndex}`, sql.Decimal(18, 2), value);
                    }
                } else if (typeof value === "string" && !isNaN(Date.parse(value))) {
                    request.input(`param${paramIndex}`, sql.DateTime, new Date(value));
                } else {
                    request.input(`param${paramIndex}`, sql.NVarChar, value);
                }

                paramIndex++;
            }

            request.input("recordId", sql.Int, id);
            const updateQuery = `UPDATE ${escapedTable} SET ${updateClauses.join(", ")} WHERE id = @recordId`;
            await request.query(updateQuery);

            const selectQuery = `SELECT * FROM ${escapedTable} WHERE id = @recordId`;
            const updated = await pool.request().input("recordId", sql.Int, id).query(selectQuery);

            if (updated.recordset.length > 0) {
                updatedRecords.push(updated.recordset[0]);
            }
        }

        context.res = {
            status: 200,
            body: isBulk ? updatedRecords : updatedRecords[0] || {},
        };
    } catch (error) {
        context.log(`Error: ${error.message}`);
        context.res = {
            status: 500,
            body: `Database error: ${error.message}`,
        };
    } finally {
        sql.close();
    }
};
