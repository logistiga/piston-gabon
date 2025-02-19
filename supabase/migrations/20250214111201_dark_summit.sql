-- Add discount_type column to invoice_items table
DO $$ BEGIN
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE invoice_items 
      ADD COLUMN discount_type text NOT NULL 
      DEFAULT 'percentage' 
      CHECK (discount_type IN ('percentage', 'fixed'));
  END IF;
END $$;

-- Update any existing records to use percentage discount
UPDATE invoice_items 
SET discount_type = 'percentage' 
WHERE discount_type IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_discount_type 
ON invoice_items(discount_type);

-- Add helpful comment
COMMENT ON COLUMN invoice_items.discount_type IS 'Type of discount (percentage or fixed amount)';