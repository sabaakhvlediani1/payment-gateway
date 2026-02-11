# 💳 Payment Gateway API

A high-performance Node.js payment gateway integration featuring a **PSP (Payment Service Provider) simulator**, **3DS redirection flow**, and a **domain-driven state machine**.

---

## 🚀 Quick Start

### ⚙️ Environment Setup
Create a `.env` file in the root directory:
```env
DB_USER=admin
DB_PASSWORD=admin
DB_NAME=payment
DB_HOST=localhost
DB_PORT=5432
```
---

### 🐳 Start Database (Docker)
This project uses Docker to ensure a consistent PostgreSQL environment.

```Bash
docker-compose up -d
```

### 💾 Database Initialization
The `docker-entrypoint-initdb.d/init.sql` script automatically creates the `transactions` table
and other required schema when the container starts. No manual setup required.

### 🛠️ Install & Run
```Bash
npm install
```
```# Run in development mode
npm run dev
```
> ⚠️ Make sure Docker is running and the PostgreSQL container is up before starting the server.
---

## 🏗️ Architecture & Design Decisions
* 🛡️ Domain-Driven Design (DDD): Business logic is encapsulated in the Transaction entity, ensuring rules are consistent regardless of data source.

* 🔄 State Machine Pattern: Enforces valid status flows, preventing illegal transitions like FAILED to SUCCESS.

* 📦 Repository Pattern: The TransactionRepository abstracts all PostgreSQL interactions, keeping the service layer database-agnostic.

* 💾 Restore Pattern: Implemented Transaction.restore() to re-instantiate domain objects from database rows without re-triggering "new transaction" logic.

* 🔒 Webhook Idempotency: Each webhook checks the current transaction state and ignores callbacks
  for terminal states (SUCCESS, FAILED), ensuring duplicate PSP events do not corrupt data.


## 📘 API Documentation (Swagger)

Swagger UI is available at:

http://localhost:3000/docs

It documents:
- Public Transaction API
- PSP Simulator endpoints
- Webhook payloads
- Example requests & responses

## 🧪 Testing the Flow
💳 Card 4111 (3DS Redirection)
Using this card triggers the asynchronous 3DS flow.

Request: Send a POST to /transactions. Initial status will be PENDING_3DS.

Redirect: Use the threeDsRedirectUrl provided in the response to complete the challenge.

Webhook: The PSP Simulator automatically sends a background update after the challenge is completed.

Example Request:

```Bash
curl -X POST http://localhost:3000/transactions \
-H "Content-Type: application/json" \
-d '{
  "amount": 100,
  "currency": "USD",
  "cardNumber": "4111111111111111",
  "cardExpiry": "12/30",
  "cvv": "123",
  "orderId": "order-1",
  "callbackUrl": "http://localhost:3000/webhooks/psp"
}'
```

✅ Card 5555 (Immediate Success)
Directly moves to a SUCCESS state via an immediate background webhook.

❌ Card 4000 (Immediate Failure)
This card simulates a failed payment.

## 📊 Database Schema
```
CREATE TABLE IF NOT EXISTS transactions (
    internal_id VARCHAR(50) PRIMARY KEY,
    psp_transaction_id VARCHAR(50) UNIQUE,
    status VARCHAR(20) NOT NULL,
    amount NUMERIC NOT NULL,
    final_amount NUMERIC,
    currency VARCHAR(10),
    order_id VARCHAR(50),
    callback_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

The system persists the following core fields in the transactions table:

* internal_id	Unique internal transaction ID
* psp_transaction_id	PSP transaction ID returned by the simulator
* status	Transaction state: CREATED, PENDING_3DS, SUCCESS, FAILED
* amount	Original transaction amount
* final_amount	Updated amount via webhook (if any)
* currency	Currency code (e.g., USD)
* order_id	Optional order reference
* callback_url	URL for PSP webhook callbacks
* created_at	Timestamp of transaction creation


## 📡 API Endpoints

* **POST** ` /transactions `
    * **Description**: Initial payment request to start the transaction flow.
    * **Status Codes**: `201 Created`, `400 Bad Request`

* **GET** ` /transactions/:id `
    * **Description**: Fetch the current state and details of a specific transaction.
    * **Status Codes**: `200 OK`, `404 Not Found`

* **POST** ` /webhooks/psp `
    * **Description**: Asynchronous callback endpoint for the PSP to update transaction results.
    * **Status Codes**: `200 OK`, `204 No Content`
 
* **POST** `/psp/transactions`
  * Simulates transaction creation
  * Returns SUCCESS, FAILED, or PENDING_3DS

* **GET** `/psp/3ds/:transactionId`
  * Simulated 3DS challenge page
  * Triggers delayed webhook after completion


## ✅ Test Coverage

The test suite includes coverage for:
- Transaction state transitions
- Webhook idempotency (duplicate callbacks)
- PSP simulator behavior (SUCCESS / FAILED / 3DS flows)


## 🏁 Running Tests
To run the automated test suite:

```Bash
npm test
```
