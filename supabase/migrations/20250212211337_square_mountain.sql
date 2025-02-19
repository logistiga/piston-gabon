-- Update entity_type check constraint in payments table
ALTER TABLE payments 
  DROP CONSTRAINT IF EXISTS payments_entity_type_check,
  ADD CONSTRAINT payments_entity_type_check 
  CHECK (entity_type IN ('ticket', 'invoice', 'purchase_order'));

-- Add helpful comment
COMMENT ON COLUMN payments.entity_type IS 'Type of entity being paid (ticket, invoice, purchase_order)';