const sql = require("mssql");
require("dotenv").config();

module.exports = async function (context, req) {
    try {
        // Validate that table/view name is provided
        const table = req.query.table;
        if (!table) {
            context.res = {
                status: 400,
                body: "Missing required parameter: table.",
            };
            return;
        }

        // Escape table name to prevent SQL Injection
        const escapedTable = `[${table.replace(/[^a-zA-Z0-9_]/g, "")}]`;

        // Extract search parameters from query string (excluding "code")
        const filters = { ...req.query };
        delete filters.code; // Remove Azure Functions authentication code
        delete filters.table; // Remove table name from filters

        // Construct WHERE clause dynamically
        let whereClauses = [];
        let parameters = [];
        let paramIndex = 0;

        Object.keys(filters).forEach((key) => {
            let value = filters[key];

            // LIKE filter (e.g. name__like=John)
            if (key.endsWith("__like")) {
                const field = key.replace("__like", "");
                whereClauses.push(`${field} LIKE @param${paramIndex}`);
                parameters.push({ name: `param${paramIndex}`, value: `%${value}%` }); // wildcard both sides
                paramIndex++;
            }
            // IN clause for comma-separated values
            else if (value.includes(",")) {
                let valuesArray = value.split(",").map((v) => v.trim());
                let inClause = valuesArray.map((_, i) => `@param${paramIndex + i}`).join(", ");
                whereClauses.push(`${key} IN (${inClause})`);
                valuesArray.forEach((v) => {
                    parameters.push({ name: `param${paramIndex}`, value: v });
                    paramIndex++;
                });
            }
            // Standard equality filter
            else {
                whereClauses.push(`${key} = @param${paramIndex}`);
                parameters.push({ name: `param${paramIndex}`, value });
                paramIndex++;
            }
        });

        // Join WHERE conditions
        let whereClause = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

        // Establish SQL connection
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

        // Construct SQL Query
        const query = `SELECT * FROM ${escapedTable} ${whereClause}`;
        const request = pool.request();

        // Bind parameters to prevent SQL Injection
        parameters.forEach((param) => {
            request.input(param.name, sql.VarChar, param.value);
        });

        // Execute Query
        const result = await request.query(query);

        // Return data
        context.res = {
            status: 200,
            body: result.recordset.length > 0 ? result.recordset : "No records found.",
        };
    } catch (error) {
        context.log(`Error: ${error.message}`);
        context.res = { status: 500, body: `Database error: ${error.message}` };
    } finally {
        sql.close(); // Close connection
    }
};
