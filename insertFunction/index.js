const sql = require("mssql");
require("dotenv").config();

module.exports = async function (context, req) {
    try {
        // Validate request body
        if (!req.body || !req.body.table || !req.body.data) {
            context.res = {
                status: 400,
                body: "Request must include 'table' and 'data' fields.",
            };
            return;
        }

        const { table, data } = req.body;

        // Ensure the data object has at least one key-value pair
        if (Object.keys(data).length === 0) {
            context.res = { status: 400, body: "Data object cannot be empty." };
            return;
        }

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

        // Generate column and value strings for insertion
        const columns = Object.keys(data).join(", ");
        const values = Object.values(data)
            .map((value) => `'${value}'`)
            .join(", ");

        // Construct and execute the INSERT query
        const insertQuery = `INSERT INTO ${table} (${columns}) VALUES (${values})`;
        await pool.request().query(insertQuery);

        context.res = {
            status: 201,
            body: `New record inserted into table '${table}'.`,
        };
    } catch (error) {
        context.log(`Error: ${error.message}`);
        context.res = { status: 500, body: `Database error: ${error.message}` };
    } finally {
        sql.close(); // Close connection
    }
};
