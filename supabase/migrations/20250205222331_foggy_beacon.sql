/*
  # Bank Management Schema

  1. New Tables
    - `banks`
      - `id` (uuid, primary key)
      - `name` (text, bank name)
      - `account_number` (text, unique)
      - `balance` (decimal)
      - `manager_name` (text)
      - `manager_phone` (text)
      - `manager_email` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `bank_transactions`
      - `id` (uuid, primary key)
      - `bank_id` (uuid, references banks)
      - `type` (text: deposit, withdrawal, transfer)
      - `amount` (decimal)
      - `reference` (text)
      - `description` (text)
      - `date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_number text UNIQUE NOT NULL,
  balance decimal(12,2) NOT NULL DEFAULT 0,
  manager_name text,
  manager_phone text,
  manager_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bank_transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid REFERENCES banks(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
  amount decimal(12,2) NOT NULL,
  reference text,
  description text,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for banks
CREATE POLICY "Enable read access for authenticated users" ON banks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON banks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON banks
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON banks
  FOR DELETE TO authenticated USING (true);

-- Create policies for bank_transactions
CREATE POLICY "Enable read access for authenticated users" ON bank_transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON bank_transactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON bank_transactions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON bank_transactions
  FOR DELETE TO authenticated USING (true);

-- Function to update bank balance
CREATE OR REPLACE FUNCTION update_bank_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update bank balance based on transaction type
    UPDATE banks
    SET 
      balance = CASE
        WHEN NEW.type = 'deposit' THEN balance + NEW.amount
        WHEN NEW.type = 'withdrawal' THEN balance - NEW.amount
        WHEN NEW.type = 'transfer' THEN 
          CASE 
            WHEN NEW.bank_id = id THEN balance - NEW.amount
            ELSE balance + NEW.amount
          END
      END,
      updated_at = now()
    WHERE id = NEW.bank_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bank balance updates
CREATE TRIGGER update_bank_balance_trigger
AFTER INSERT ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance();