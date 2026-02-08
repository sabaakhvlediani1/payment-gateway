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