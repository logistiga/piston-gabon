-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_payment_status_trigger ON payments;
DROP FUNCTION IF EXISTS update_payment_status();

-- Create function to update payment status based on amount
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid decimal(12,2);
  total_amount decimal(12,2);
  document_type text;
  document_id uuid;
BEGIN
  -- Get payment details
  IF TG_OP = 'DELETE' THEN
    document_type := OLD.document_type;
    document_id := OLD.document_id;
  ELSE
    document_type := NEW.document_type;
    document_id := NEW.document_id;
  END IF;

  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM payments
  WHERE document_type = document_type
  AND document_id = document_id;

  -- Get total amount based on document type
  IF document_type = 'ticket' THEN
    SELECT montant INTO total_amount
    FROM tickets WHERE id = document_id;
    
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
    WHERE id = document_id;

  ELSIF document_type = 'invoice' THEN
    SELECT total INTO total_amount
    FROM invoices WHERE id = document_id;
    
    -- Update invoice status
    UPDATE invoices 
    SET 
      status = CASE 
        WHEN total_paid >= total_amount THEN 'payé'
        WHEN total_paid > 0 THEN 'avance'
        ELSE 'non_payé'
      END,
      payment_status = CASE 
        WHEN total_paid >= total_amount THEN 'completed'
        WHEN total_paid > 0 THEN 'partial'
        ELSE 'pending'
      END,
      payment_date = CASE 
        WHEN total_paid >= total_amount THEN now()
        ELSE payment_date
      END
    WHERE id = document_id;

  ELSIF document_type = 'purchase_order' THEN
    SELECT total_amount INTO total_amount
    FROM purchase_orders WHERE id = document_id;
    
    -- Update purchase order status
    UPDATE purchase_orders 
    SET 
      payment_status = CASE 
        WHEN total_paid >= total_amount THEN 'paid'
        WHEN total_paid > 0 THEN 'partial'
        ELSE 'pending'
      END,
      paid_amount = total_paid
    WHERE id = document_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status updates
CREATE TRIGGER update_payment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();

-- Add helpful comments
COMMENT ON FUNCTION update_payment_status IS 'Updates payment status based on total amount paid';