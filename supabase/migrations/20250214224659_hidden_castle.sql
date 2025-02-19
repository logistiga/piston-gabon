-- Drop existing function and trigger
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

    -- Check if payment amount exceeds remaining amount
    IF document_type = 'ticket' THEN
      SELECT 
        t.montant,
        COALESCE(SUM(p.amount), 0) as paid
      INTO total_amount, total_paid
      FROM tickets t
      LEFT JOIN payments p ON p.document_type = 'ticket' 
        AND p.document_id = t.id 
        AND p.id != NEW.id
      WHERE t.id = document_id
      GROUP BY t.montant;

      IF (total_paid + NEW.amount) > total_amount THEN
        RAISE EXCEPTION 'Le montant du paiement (%) dépasse le montant restant à payer (%)', 
          NEW.amount, 
          total_amount - total_paid;
      END IF;
    END IF;
  END IF;

  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM payments
  WHERE document_type = document_type
  AND document_id = document_id;

  -- Update status based on document type
  CASE document_type
    WHEN 'ticket' THEN
      SELECT montant INTO total_amount
      FROM tickets WHERE id = document_id;
      
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

    WHEN 'invoice' THEN
      SELECT total INTO total_amount
      FROM invoices WHERE id = document_id;
      
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

    WHEN 'purchase_order' THEN
      SELECT total_amount INTO total_amount
      FROM purchase_orders WHERE id = document_id;
      
      UPDATE purchase_orders 
      SET 
        payment_status = CASE 
          WHEN total_paid >= total_amount THEN 'paid'
          WHEN total_paid > 0 THEN 'partial'
          ELSE 'pending'
        END,
        paid_amount = total_paid
      WHERE id = document_id;
  END CASE;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status updates
CREATE TRIGGER update_payment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();

-- Add helpful comments
COMMENT ON FUNCTION update_payment_status IS 'Updates payment status and validates payment amounts';