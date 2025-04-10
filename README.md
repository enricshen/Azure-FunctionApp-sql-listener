# 🔧 Azure SQL Function API

This repository contains a set of Azure Functions that interact with an Azure SQL Database. It supports inserting data, fetching user records, and querying with support for wildcard and multi-value filters.

---

## 📁 Endpoints Overview

| Function        | Method | Route                  | Description                            |
|----------------|--------|------------------------|----------------------------------------|
| `getUser`      | GET    | `/api/getUser`         | Retrieve user by Firebase UID          |
| `insert`       | POST   | `/api/insert`          | Insert record in SQL table             |
| `edit`         | PUT    | `/api/edit`            | Edit record in SQL table               |
| `queryData`    | GET    | `/api/queryData`       | Query table with advanced filters      |

---

## 📘 Function Details

### 🔹 `getUserFunction`

**Method:** `GET`  
**Endpoint:** `/api/getUser`  
**Description:** Fetches a user based on their `firebase_uid`.

**Example:**
```http
GET http://localhost:7071/api/getUser?firebase_uid=67890

### 🔹 `insertFunction`

**Request Body:**
{
  "table": "appUsers",
  "data": {
    "firebase_uid": "12345",
    "email": "user@example.com"
  }
}

### 🔹 `queryFunction`

✅ Parameters
table: (Required) The table/view to query.

field=value: Exact match.

field=value1,value2: Multiple values (translated to IN clause).

field__like=value: Wildcard search (translated to LIKE '%value%').

🔍 Examples
Query a single value:
GET http://localhost:7071/api/queryData?table=appUsers&user_id=1

uery multiple values (IN clause):
GET http://localhost:7071/api/queryData?table=appUsers&user_id=1,2,3

Wildcard search (LIKE clause):
GET http://localhost:7071/api/queryData?table=stocks&stock_symbol__like=A

### 🔹 `bulkInsertFucntion`

**Method:** `POST`  
**Endpoint:** `/api/bulk-insert`  
**Description:** Bulk upload data to a table.

**Example:**
http://localhost:7071/api/bulk-insert

**Request Body:**
{
    "table": "appTransactions",
    "data": [
      { "user_id": 3, "portfolio_id": 3,"stock_symbol":"IBM", "transaction_type": "Buy" },
      { "user_id": 3, "portfolio_id": 3,"stock_symbol":"AAPL", "transaction_type": "Buy" },
      { "user_id": 3, "portfolio_id": 3,"stock_symbol":"ATM", "transaction_type": "Buy" }
    ]
  }

### 🔹 `deleteFucntion`

**Method:** `POST`  
**Endpoint:** `/api/-delete`  
**Description:** Delete a single record from table

**Example:**
http://localhost:7071/api/delete

**Request Body:**
{
    "table": "appTransactions",
    "id": 91
  }