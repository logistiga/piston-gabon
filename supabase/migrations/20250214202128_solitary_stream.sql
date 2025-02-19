-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_bank_balance_from_transaction_trigger ON bank_transactions;
DROP FUNCTION IF EXISTS update_bank_balance_from_transaction();

-- Create function to recalculate bank balance
CREATE OR REPLACE FUNCTION recalculate_bank_balance(target_bank_id uuid)
RETURNS void AS $$
DECLARE
  initial_balance decimal(12,2) := 0;
  calculated_balance decimal(12,2);
BEGIN
  -- Calculate balance from all confirmed transactions
  SELECT COALESCE(SUM(
    CASE
      -- Pour les paiements, le montant dépend du type de paiement
      WHEN bt.type = 'payment' THEN
        CASE p.payment_type
          -- Les ventes sont des entrées positives
          WHEN 'sale' THEN bt.amount
          -- Les achats sont des sorties négatives
          WHEN 'purchase' THEN -bt.amount
          ELSE bt.amount
        END
      -- Les dépôts sont toujours positifs
      WHEN bt.type = 'deposit' THEN bt.amount
      -- Les retraits sont toujours négatifs
      WHEN bt.type = 'withdrawal' THEN -bt.amount
      -- Pour les virements, dépend de la description
      WHEN bt.type = 'transfer' THEN 
        CASE 
          WHEN bt.description ILIKE '%sortant%' THEN -bt.amount
          ELSE bt.amount
        END
      ELSE bt.amount
    END
  ), 0)
  INTO calculated_balance
  FROM bank_transactions bt
  LEFT JOIN payments p ON bt.id = p.id
  WHERE bt.bank_id = target_bank_id
  AND bt.status = 'confirmed';

  -- Update bank balance
  UPDATE banks
  SET 
    balance = initial_balance + calculated_balance,
    updated_at = now()
  WHERE id = target_bank_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update bank balance on transaction changes
CREATE OR REPLACE FUNCTION update_bank_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate balance for affected bank
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_bank_balance(OLD.bank_id);
  ELSE
    PERFORM recalculate_bank_balance(NEW.bank_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for bank balance updates
CREATE TRIGGER update_bank_balance_from_transaction_trigger
AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance_from_transaction();

-- Recalculate all bank balances
DO $$ 
DECLARE
  bank_record RECORD;
BEGIN
  FOR bank_record IN SELECT id FROM banks
  LOOP
    PERFORM recalculate_bank_balance(bank_record.id);
  END LOOP;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION recalculate_bank_balance IS 'Recalculates bank balance from all confirmed transactions';
COMMENT ON FUNCTION update_bank_balance_from_transaction IS 'Trigger function to update bank balance on transaction changes';