-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_payment_status_trigger ON payments;
DROP FUNCTION IF EXISTS update_payment_status();

-- Create function to update payment status based on amount
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid decimal(12,2);
  total_amount decimal(12,2);
  doc_type text;
  doc_id uuid;
  remaining decimal(12,2);
BEGIN
  -- Get payment details
  IF TG_OP = 'DELETE' THEN
    doc_type := OLD.document_type;
    doc_id := OLD.document_id;
  ELSE
    doc_type := NEW.document_type;
    doc_id := NEW.document_id;

    -- Calculate remaining amount
    CASE doc_type
      WHEN 'ticket' THEN
        SELECT 
          t.montant,
          t.montant - COALESCE(SUM(p.amount), 0) as remaining
        INTO total_amount, remaining
        FROM tickets t
        LEFT JOIN payments p ON p.document_type = 'ticket' 
          AND p.document_id = t.id 
          AND p.id != NEW.id
        WHERE t.id = doc_id
        GROUP BY t.montant;

      WHEN 'invoice' THEN
        SELECT 
          i.total,
          i.total - COALESCE(SUM(p.amount), 0) as remaining
        INTO total_amount, remaining
        FROM invoices i
        LEFT JOIN payments p ON p.document_type = 'invoice'
          AND p.document_id = i.id
          AND p.id != NEW.id
        WHERE i.id = doc_id
        GROUP BY i.total;

      WHEN 'purchase_order' THEN
        SELECT 
          po.total_amount,
          po.total_amount - COALESCE(SUM(p.amount), 0) as remaining
        INTO total_amount, remaining
        FROM purchase_orders po
        LEFT JOIN payments p ON p.document_type = 'purchase_order'
          AND p.document_id = po.id
          AND p.id != NEW.id
        WHERE po.id = doc_id
        GROUP BY po.total_amount;
    END CASE;

    -- Validate payment amount
    IF NEW.amount > remaining THEN
      RAISE EXCEPTION 'Le montant du paiement (%) dépasse le montant restant à payer (%)', 
        NEW.amount, 
        remaining;
    END IF;
  END IF;

  -- Calculate total payments
  SELECT COALESCE(SUM(p.amount), 0)
  INTO total_paid
  FROM payments p
  WHERE p.document_type = doc_type
  AND p.document_id = doc_id;

  -- Update status based on document type
  CASE doc_type
    WHEN 'ticket' THEN
      SELECT montant INTO total_amount
      FROM tickets WHERE id = doc_id;
      
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
      WHERE id = doc_id;

    WHEN 'invoice' THEN
      SELECT total INTO total_amount
      FROM invoices WHERE id = doc_id;
      
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
      WHERE id = doc_id;

    WHEN 'purchase_order' THEN
      SELECT total_amount INTO total_amount
      FROM purchase_orders WHERE id = doc_id;
      
      UPDATE purchase_orders 
      SET 
        payment_status = CASE 
          WHEN total_paid >= total_amount THEN 'paid'
          WHEN total_paid > 0 THEN 'partial'
          ELSE 'pending'
        END,
        paid_amount = total_paid
      WHERE id = doc_id;
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