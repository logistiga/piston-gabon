-- Drop existing views and tables
DROP VIEW IF EXISTS ticket_payments_view;
DROP TABLE IF EXISTS ticket_items CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;

-- Create tickets table
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  client_nom text,
  client_email text,
  client_telephone text,
  montant decimal(12,2) NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'avance', 'payé', 'annulé')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed')),
  facture boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ticket_items table
CREATE TABLE ticket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(10,2) NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ticket_items_ticket_article_unique UNIQUE(ticket_id, article_id)
);

-- Create function to generate ticket reference
CREATE OR REPLACE FUNCTION generate_ticket_reference()
RETURNS text AS $$
DECLARE
  ref text;
  num int;
BEGIN
  -- Get the current max reference number
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 3) AS integer)), 0)
  INTO num
  FROM tickets;
  
  -- Generate new reference (T_XXXXXX)
  ref := 'T_' || LPAD((num + 1)::text, 6, '0');
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate reference
CREATE OR REPLACE FUNCTION tickets_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := generate_ticket_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_before_insert_trigger
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION tickets_before_insert();

-- Create view for ticket payments
CREATE VIEW ticket_payments_view AS
WITH payment_totals AS (
  SELECT 
    document_id,
    SUM(amount) as total_paid
  FROM payments
  WHERE document_type = 'ticket'
  GROUP BY document_id
)
SELECT 
  t.id as ticket_id,
  t.montant as total_amount,
  COALESCE(pt.total_paid, 0) as paid_amount,
  t.montant - COALESCE(pt.total_paid, 0) as remaining_amount,
  CASE
    WHEN t.statut = 'annulé' THEN 'annulé'
    WHEN COALESCE(pt.total_paid, 0) >= t.montant THEN 'payé'
    WHEN COALESCE(pt.total_paid, 0) > 0 THEN 'avance'
    ELSE 'en_attente'
  END as payment_status,
  t.created_at,
  t.reference,
  t.client_nom,
  t.client_email,
  t.client_telephone,
  t.statut,
  t.facture
FROM tickets t
LEFT JOIN payment_totals pt ON pt.document_id = t.id;

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_items ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policies
CREATE POLICY "tickets_crud_policy" ON tickets
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ticket_items_crud_policy" ON ticket_items
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_tickets_reference ON tickets(reference);
CREATE INDEX idx_tickets_client_nom ON tickets(client_nom);
CREATE INDEX idx_tickets_statut ON tickets(statut);
CREATE INDEX idx_tickets_payment_status ON tickets(payment_status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

CREATE INDEX idx_ticket_items_ticket_id ON ticket_items(ticket_id);
CREATE INDEX idx_ticket_items_article_id ON ticket_items(article_id);

-- Add helpful comments
COMMENT ON TABLE tickets IS 'Stores ticket information';
COMMENT ON TABLE ticket_items IS 'Stores line items for tickets';
COMMENT ON VIEW ticket_payments_view IS 'View showing ticket payment totals and status with ticket details';