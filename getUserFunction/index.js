const sql = require("mssql");
require("dotenv").config();

module.exports = async function (context, req) {
    try {
        // Validate that firebase_uid is provided in the query params
        const firebase_uid = req.query.firebase_uid;
        if (!firebase_uid) {
            context.res = {
                status: 400,
                body: "Missing required parameter: firebase_uid.",
            };
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

        // Query the database for the user
        const result = await pool
            .request()
            .input("firebase_uid", sql.VarChar, firebase_uid)
            .query("SELECT * FROM appUsers WHERE firebase_uid = @firebase_uid");

        // Check if user exists
        if (result.recordset.length === 0) {
            context.res = {
                status: 404,
                body: `No user found with firebase_uid: ${firebase_uid}`,
            };
            return;
        }

        // Return the user data
        context.res = {
            status: 200,
            body: result.recordset[0], // Return the first matching record
        };
    } catch (error) {
        context.log(`Error: ${error.message}`);
        context.res = { status: 500, body: `Database error: ${error.message}` };
    } finally {
        sql.close(); // Close connection
    }
};
