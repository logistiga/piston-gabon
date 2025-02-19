/*
  # Audit Logs System

  1. Changes
    - Drop existing triggers if they exist
    - Create audit_logs table
    - Enable RLS with policies
    - Create audit trigger function
    - Create triggers for important tables
*/

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_clients_trigger ON clients;
DROP TRIGGER IF EXISTS audit_invoices_trigger ON invoices;
DROP TRIGGER IF EXISTS audit_quotes_trigger ON quotes;
DROP TRIGGER IF EXISTS audit_articles_trigger ON articles;
DROP TRIGGER IF EXISTS audit_banks_trigger ON banks;
DROP TRIGGER IF EXISTS audit_bank_transactions_trigger ON bank_transactions;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_date timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  table_name text NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  ip_address text,
  source text,
  computer_name text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit_logs with unique names
CREATE POLICY "audit_logs_select_policy" ON audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "audit_logs_insert_policy" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  client_ip text;
  source_url text;
  computer text;
BEGIN
  -- Get client info from current session
  client_ip := current_setting('request.headers', true)::jsonb->>'x-real-ip';
  source_url := current_setting('request.headers', true)::jsonb->>'origin';
  computer := current_setting('request.headers', true)::jsonb->>'user-agent';

  -- Insert audit log entry
  INSERT INTO audit_logs (
    operation_date,
    user_id,
    table_name,
    operation_type,
    ip_address,
    source,
    computer_name,
    old_data,
    new_data
  ) VALUES (
    now(),
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    client_ip,
    source_url,
    computer,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for important tables
CREATE TRIGGER audit_clients_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_quotes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_articles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON articles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_banks_trigger
  AFTER INSERT OR UPDATE OR DELETE ON banks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_bank_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();