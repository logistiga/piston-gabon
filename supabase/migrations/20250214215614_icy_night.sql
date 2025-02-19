-- Add payment_status to tickets if it doesn't exist
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS payment_status text 
  DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'partial', 'completed'));

-- Create or replace function to update ticket payment status
CREATE OR REPLACE FUNCTION update_ticket_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid decimal(12,2);
  total_amount decimal(12,2);
BEGIN
  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM payments
  WHERE document_type = 'ticket'
  AND document_id = NEW.document_id;

  -- Get ticket total amount
  SELECT montant INTO total_amount
  FROM tickets 
  WHERE id = NEW.document_id;

  -- Update ticket status
  UPDATE tickets 
  SET 
    statut = CASE 
      WHEN total_paid >= total_amount THEN 'payé'
      WHEN total_paid > 0 THEN 'avance'
      ELSE 'en_attente'
    END,
    payment_status = CASE 
      WHEN total_paid >= total_amount THEN 'completed'
      WHEN total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END
  WHERE id = NEW.document_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ticket payment status updates
DROP TRIGGER IF EXISTS update_ticket_payment_status_trigger ON payments;
CREATE TRIGGER update_ticket_payment_status_trigger
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
WHEN (NEW.document_type = 'ticket')
EXECUTE FUNCTION update_ticket_payment_status();

-- Add helpful comments
COMMENT ON COLUMN tickets.payment_status IS 'Payment status (pending, partial, completed)';
COMMENT ON FUNCTION update_ticket_payment_status IS 'Updates ticket payment status based on total amount paid';