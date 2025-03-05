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

        // Validate data contains at least one key-value pair
        if (Object.keys(data).length === 0) {
            context.res = { status: 400, body: "Data object cannot be empty." };
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

        // Generate dynamic column and value strings
        const columns = Object.keys(data).join(", ");
        const values = Object.values(data)
            .map((value) => `'${value}'`)
            .join(", ");

        // Generate update part of the upsert query
        const updateSet = Object.keys(data)
            .map((col) => `${col} = '${data[col]}'`)
            .join(", ");

        // Assume 'id' column exists as primary key (Modify based on your schema)
        const upsertQuery = `
            MERGE INTO ${table} AS target
            USING (SELECT ${values}) AS source (${columns})
            ON target.id = source.id
            WHEN MATCHED THEN
                UPDATE SET ${updateSet}
            WHEN NOT MATCHED THEN
                INSERT (${columns}) VALUES (${values});
        `;

        // Execute query
        await pool.request().query(upsertQuery);

        context.res = {
            status: 200,
            body: `Record upserted successfully in table '${table}'.`,
        };
    } catch (error) {
        context.log(`Error: ${error.message}`);
        context.res = { status: 500, body: `Database error: ${error.message}` };
    } finally {
        sql.close(); // Close connection
    }
};
