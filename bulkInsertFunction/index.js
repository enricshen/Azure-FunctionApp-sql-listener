const sql = require("mssql");
require("dotenv").config();

module.exports = async function (context, req) {
    try {
        if (!req.body || !req.body.table || !req.body.data) {
            context.res = {
                status: 400,
                body: "Request must include 'table' and 'data' fields.",
            };
            return;
        }

        const { table, data } = req.body;

        // Ensure data is an array of objects
        const records = Array.isArray(data) ? data : [data];

        if (records.length === 0 || Object.keys(records[0]).length === 0) {
            context.res = { status: 400, body: "Data array cannot be empty or contain empty objects." };
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

        const request = pool.request();
        const columns = Object.keys(records[0]);

        let valueRows = [];

        // Helper to detect SQL types
        const getSqlType = (value) => {
            if (typeof value === "number") {
                return Number.isInteger(value) ? sql.Int : sql.Float;
            } else if (typeof value === "boolean") {
                return sql.Bit;
            } else if (value instanceof Date || !isNaN(Date.parse(value))) {
                return sql.DateTime;
            } else {
                return sql.VarChar;
            }
        };

        records.forEach((record, rowIndex) => {
            let valuePlaceholders = [];

            columns.forEach((col, colIndex) => {
                const paramName = `param_${rowIndex}_${colIndex}`;
                const value = record[col];
                const sqlType = getSqlType(value);
                valuePlaceholders.push(`@${paramName}`);
                request.input(paramName, sqlType, value);
            });

            valueRows.push(`(${valuePlaceholders.join(", ")})`);
        });

        const query = `
            INSERT INTO ${table} (${columns.join(", ")})
            VALUES ${valueRows.join(",\n")}
        `;

        await request.query(query);

        context.res = {
            status: 201,
            body: `${records.length} record(s) successfully inserted into '${table}'.`,
        };
    } catch (error) {
        context.log("Bulk Insert Error:", error.message);
        context.res = {
            status: 500,
            body: `Database error: ${error.message}`,
        };
    } finally {
        sql.close();
    }
};
