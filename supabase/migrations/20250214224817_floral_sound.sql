-- Add payment_type column to payments table
DO $$ BEGIN
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE payments 
      ADD COLUMN payment_type text NOT NULL 
      DEFAULT 'sale' 
      CHECK (payment_type IN ('sale', 'purchase'));
  END IF;
END $$;

-- Update existing payments with correct payment type
UPDATE payments
SET payment_type = CASE
  WHEN document_type IN ('ticket', 'invoice') THEN 'sale'
  WHEN document_type = 'purchase_order' THEN 'purchase'
  ELSE 'sale'
END
WHERE payment_type IS NULL;

-- Create or replace function to set payment type automatically
CREATE OR REPLACE FUNCTION set_payment_type()
RETURNS TRIGGER AS $$
BEGIN
  NEW.payment_type := CASE
    WHEN NEW.document_type IN ('ticket', 'invoice') THEN 'sale'
    WHEN NEW.document_type = 'purchase_order' THEN 'purchase'
    ELSE 'sale'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set payment type
DROP TRIGGER IF EXISTS set_payment_type_trigger ON payments;
CREATE TRIGGER set_payment_type_trigger
BEFORE INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION set_payment_type();

-- Add helpful comments
COMMENT ON COLUMN payments.payment_type IS 'Type of payment (sale or purchase)';
COMMENT ON FUNCTION set_payment_type IS 'Sets payment type based on document type';