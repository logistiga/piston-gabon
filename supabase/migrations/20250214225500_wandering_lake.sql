-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_bank_transaction_trigger ON payments;
DROP FUNCTION IF EXISTS create_bank_transaction_from_payment();

-- Create function to create bank transaction from payment
CREATE OR REPLACE FUNCTION create_bank_transaction_from_payment()
RETURNS TRIGGER AS $$
DECLARE
  transaction_description text;
  document_reference text;
  entity_name text;
  transaction_amount decimal(12,2);
BEGIN
  -- Only create bank transaction for bank payments
  IF NEW.payment_method IN ('check', 'bank_transfer') AND NEW.bank_id IS NOT NULL THEN
    -- Get document reference and entity name
    CASE NEW.document_type
      WHEN 'ticket' THEN
        SELECT reference, client_nom 
        INTO document_reference, entity_name
        FROM tickets 
        WHERE id = NEW.document_id;
      
      WHEN 'invoice' THEN
        SELECT reference, client_nom
        INTO document_reference, entity_name
        FROM invoices
        WHERE id = NEW.document_id;
      
      WHEN 'purchase_order' THEN
        SELECT reference, supplier_name
        INTO document_reference, entity_name
        FROM purchase_orders
        WHERE id = NEW.document_id;
    END CASE;

    -- Set transaction amount based on document type
    transaction_amount := CASE
      -- Les paiements de tickets et factures sont des entrées positives
      WHEN NEW.document_type IN ('ticket', 'invoice') THEN ABS(NEW.amount)
      -- Les paiements de commandes sont des sorties négatives
      WHEN NEW.document_type = 'purchase_order' THEN -ABS(NEW.amount)
      ELSE NEW.amount
    END;

    -- Create description
    transaction_description := CONCAT(
      'Paiement ',
      CASE NEW.document_type
        WHEN 'ticket' THEN 'ticket'
        WHEN 'invoice' THEN 'facture'
        WHEN 'purchase_order' THEN 'commande'
      END,
      ' ',
      document_reference,
      ' - ',
      entity_name,
      CASE 
        WHEN NEW.payment_method = 'check' THEN CONCAT(' (Chèque n°', NEW.check_number, ')')
        ELSE ''
      END
    );

    -- Insert bank transaction with new UUID
    INSERT INTO bank_transactions (
      bank_id,
      type,
      amount,
      reference,
      description,
      date,
      status,
      transaction_number
    ) VALUES (
      NEW.bank_id,
      'payment',
      transaction_amount,
      document_reference,
      transaction_description,
      NEW.payment_date,
      'confirmed',
      'TR_' || LPAD(CAST(floor(random() * 1000000) AS text), 6, '0')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create bank transaction
CREATE TRIGGER create_bank_transaction_trigger
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION create_bank_transaction_from_payment();

-- Add helpful comments
COMMENT ON FUNCTION create_bank_transaction_from_payment IS 'Creates a bank transaction when a payment is made using bank payment methods, with proper amount sign based on document type';