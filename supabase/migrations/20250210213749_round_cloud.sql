-- Create function to import payment data
CREATE OR REPLACE FUNCTION import_payment_data()
RETURNS void AS $$
DECLARE
  payment record;
BEGIN
  -- Import payments from tickets and invoices
  FOR payment IN (
    SELECT 
      p.id,
      p.entity_type,
      p.entity_id,
      p.amount,
      p.payment_method,
      p.payment_date,
      p.bank_id,
      p.reference,
      CASE
        WHEN p.entity_type = 'ticket' THEN (
          SELECT client_nom || ' - ' || reference
          FROM tickets
          WHERE id = p.entity_id::uuid
        )
        WHEN p.entity_type = 'invoice' THEN (
          SELECT client_nom || ' - ' || reference
          FROM invoices
          WHERE id = p.entity_id::uuid
        )
      END as description
    FROM payments p
    WHERE p.payment_method IN ('check', 'bank_transfer')
    AND p.bank_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM bank_transactions bt 
      WHERE bt.id = p.id
    )
  ) LOOP
    -- Insert bank transaction
    INSERT INTO bank_transactions (
      id,
      bank_id,
      type,
      amount,
      description,
      reference,
      date,
      status,
      transaction_number
    ) VALUES (
      payment.id,
      payment.bank_id,
      'payment',
      payment.amount,
      payment.description,
      payment.reference,
      payment.payment_date,
      'confirmed',
      generate_transaction_number()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the import function
SELECT import_payment_data();