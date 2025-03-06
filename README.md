# Azure-FunctionApp-SQLTest
 
Functions:

getUserFunction: [GET] http://localhost:7071/api/getUser
    http://localhost:7071/api/getUser?firebase_uid=67890

insertFunction: [POST] http://localhost:7071/api/insert
    curl -X POST "http://localhost:7071/api/upsertRecord" \
     -H "Content-Type: application/json" \
     -d '{
          "table": "appUsers",
          "data": {
              "firebase_uid": "12345",
              "email": "user@example.com"
          }
      }'

queryFunction: [GET] http://localhost:7071/api/query
    http://localhost:7071/api/queryData?table=appUsers&user_id=1
