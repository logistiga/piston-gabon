/*
  # Invoice Management System Schema

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `reference` (text, unique) - Format: FA_XXXXXX
      - `ticket_id` (uuid, foreign key)
      - `client_id` (uuid, foreign key)
      - `total` (decimal)
      - `status` (text) - 'payé' or 'non_payé'
      - `payment_date` (timestamptz)
      - `due_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `payments`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, foreign key)
      - `amount` (decimal)
      - `payment_method` (text)
      - `payment_date` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  ticket_id uuid REFERENCES tickets(id),
  client_id uuid REFERENCES clients(id),
  total decimal(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'non_payé' CHECK (status IN ('payé', 'non_payé')),
  payment_date timestamptz,
  due_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('espèces', 'virement', 'chèque', 'mobile_money')),
  payment_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Enable read access for authenticated users" ON invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON invoices
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON invoices
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON invoices
  FOR DELETE TO authenticated USING (true);

-- Create policies for payments
CREATE POLICY "Enable read access for authenticated users" ON payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON payments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON payments
  FOR DELETE TO authenticated USING (true);

-- Add trigger to update invoice status when payment is made
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total payments for the invoice
  WITH total_payments AS (
    SELECT invoice_id, SUM(amount) as paid_amount
    FROM payments
    WHERE invoice_id = NEW.invoice_id
    GROUP BY invoice_id
  )
  UPDATE invoices i
  SET 
    status = CASE 
      WHEN p.paid_amount >= i.total THEN 'payé'
      ELSE 'non_payé'
    END,
    payment_date = CASE 
      WHEN p.paid_amount >= i.total THEN now()
      ELSE null
    END,
    updated_at = now()
  FROM total_payments p
  WHERE i.id = p.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status();