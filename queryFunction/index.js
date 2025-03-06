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

        // Extract search parameters from query string (excluding "table")
        const filters = { ...req.query };
        delete filters.table; // Remove table name from filters

        // Construct WHERE clause dynamically
        let whereClause = "";
        let parameters = [];
        Object.keys(filters).forEach((key, index) => {
            whereClause += `${index === 0 ? "WHERE" : "AND"} ${key} = @param${index} `;
            parameters.push({ name: `param${index}`, value: filters[key] });
        });

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

        // Construct SQL Query
        const query = `SELECT * FROM ${table} ${whereClause}`;
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
