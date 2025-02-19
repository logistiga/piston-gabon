-- Add payment_status to tickets if it doesn't exist
ALTER TABLE tickets 
  DROP CONSTRAINT IF EXISTS tickets_statut_check,
  ADD CONSTRAINT tickets_statut_check 
  CHECK (statut IN ('en_attente', 'avance', 'payé', 'annulé'));

-- Add payment_status to invoices if it doesn't exist
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check,
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('non_payé', 'avance', 'payé'));

-- Create function to update payment status based on amount
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid decimal(12,2);
  total_amount decimal(12,2);
  entity_type text;
  entity_id uuid;
BEGIN
  -- Get payment details
  entity_type := NEW.entity_type;
  entity_id := NEW.entity_id::uuid;

  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM payments
  WHERE entity_type = NEW.entity_type
  AND entity_id::uuid = NEW.entity_id::uuid;

  -- Get total amount based on entity type
  IF entity_type = 'ticket' THEN
    SELECT montant INTO total_amount
    FROM tickets WHERE id = entity_id;
    
    -- Update ticket status
    UPDATE tickets 
    SET statut = CASE 
      WHEN total_paid >= total_amount THEN 'payé'
      WHEN total_paid > 0 THEN 'avance'
      ELSE 'en_attente'
    END
    WHERE id = entity_id;

  ELSIF entity_type = 'invoice' THEN
    SELECT total INTO total_amount
    FROM invoices WHERE id = entity_id;
    
    -- Update invoice status
    UPDATE invoices 
    SET status = CASE 
      WHEN total_paid >= total_amount THEN 'payé'
      WHEN total_paid > 0 THEN 'avance'
      ELSE 'non_payé'
    END
    WHERE id = entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status updates
DROP TRIGGER IF EXISTS update_payment_status_trigger ON payments;
CREATE TRIGGER update_payment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();

-- Add helpful comments
COMMENT ON FUNCTION update_payment_status IS 'Updates payment status based on total amount paid';