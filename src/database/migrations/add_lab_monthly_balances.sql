-- Migration: Add lab_monthly_balances table
-- Date: 2026-02-24
-- Description: Add monthly balance tracking for lab payments

-- Create the lab_monthly_balances table if it doesn't exist
CREATE TABLE IF NOT EXISTS lab_monthly_balances (
    id TEXT PRIMARY KEY,
    lab_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    total_cost REAL DEFAULT 0,
    total_paid REAL DEFAULT 0,
    remaining_balance REAL DEFAULT 0,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
    UNIQUE(lab_id, year, month)
);

-- Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_lab_monthly_balances_lab ON lab_monthly_balances(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_monthly_balances_year_month ON lab_monthly_balances(year, month);
CREATE INDEX IF NOT EXISTS idx_lab_monthly_balances_lab_year_month ON lab_monthly_balances(lab_id, year, month);
CREATE INDEX IF NOT EXISTS idx_lab_monthly_balances_status ON lab_monthly_balances(status);

-- Initialize monthly balances from existing lab_orders data
-- This will create a monthly balance record for each lab and month that has orders
INSERT INTO lab_monthly_balances (id, lab_id, year, month, total_cost, total_paid, remaining_balance, status, created_at, updated_at)
SELECT 
    lower(hex(randomblob(16))) as id,
    lab_id,
    CAST(strftime('%Y', order_date) AS INTEGER) as year,
    CAST(strftime('%m', order_date) AS INTEGER) as month,
    SUM(cost) as total_cost,
    SUM(paid_amount) as total_paid,
    SUM(remaining_balance) as remaining_balance,
    CASE 
        WHEN SUM(remaining_balance) <= 0 THEN 'paid'
        WHEN SUM(paid_amount) > 0 THEN 'partial'
        ELSE 'unpaid'
    END as status,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM lab_orders
WHERE lab_id IS NOT NULL AND order_date IS NOT NULL
GROUP BY lab_id, year, month
ON CONFLICT(lab_id, year, month) DO UPDATE SET
    total_cost = excluded.total_cost,
    total_paid = excluded.total_paid,
    remaining_balance = excluded.remaining_balance,
    status = excluded.status,
    updated_at = CURRENT_TIMESTAMP;
