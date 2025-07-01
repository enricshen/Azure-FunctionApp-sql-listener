const sql = require("mssql");
require("dotenv").config();

module.exports = async function (context, req) {
    try {
        // Validate input
        const table = req.query.table || req.body?.table;
        const id = req.query.id || req.body?.id;

        if (!table || !id) {
            context.res = {
                status: 400,
                body: "Missing required parameters: 'table' and 'id'."
            };
            return;
        }

        // Sanitize table name to prevent SQL injection
        const sanitizedTable = `[${table.replace(/[^a-zA-Z0-9_]/g, "")}]`;

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
        request.input("id", sql.Int, id); // assumes `id` is an integer

        const deleteQuery = `DELETE FROM ${sanitizedTable} WHERE id = @id`;

        const result = await request.query(deleteQuery);

        context.res = {
            status: 200,
            body: result.rowsAffected[0] > 0
                ? `Record with id ${id} deleted from '${table}'.`
                : `No record found with id ${id} in '${table}'.`
        };
    } catch (error) {
        context.log("Delete Error:", error.message);
        context.res = {
            status: 500,
            body: `Database error: ${error.message}`,
        };
    } finally {
        sql.close();
    }
};
