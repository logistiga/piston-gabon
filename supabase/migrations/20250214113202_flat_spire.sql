-- Add discount_type column to all sales item tables
DO $$ BEGIN
  -- Add column to invoice_items if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE invoice_items 
      ADD COLUMN discount_type text NOT NULL 
      DEFAULT 'percentage' 
      CHECK (discount_type IN ('percentage', 'fixed'));
  END IF;

  -- Add column to quote_items if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_items' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE quote_items 
      ADD COLUMN discount_type text NOT NULL 
      DEFAULT 'percentage' 
      CHECK (discount_type IN ('percentage', 'fixed'));
  END IF;

  -- Add column to ticket_items if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_items' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE ticket_items 
      ADD COLUMN discount_type text NOT NULL 
      DEFAULT 'percentage' 
      CHECK (discount_type IN ('percentage', 'fixed'));
  END IF;
END $$;

-- Update any existing records to use percentage discount
UPDATE invoice_items SET discount_type = 'percentage' WHERE discount_type IS NULL;
UPDATE quote_items SET discount_type = 'percentage' WHERE discount_type IS NULL;
UPDATE ticket_items SET discount_type = 'percentage' WHERE discount_type IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_discount_type ON invoice_items(discount_type);
CREATE INDEX IF NOT EXISTS idx_quote_items_discount_type ON quote_items(discount_type);
CREATE INDEX IF NOT EXISTS idx_ticket_items_discount_type ON ticket_items(discount_type);

-- Add helpful comments
COMMENT ON COLUMN invoice_items.discount_type IS 'Type of discount (percentage or fixed amount)';
COMMENT ON COLUMN quote_items.discount_type IS 'Type of discount (percentage or fixed amount)';
COMMENT ON COLUMN ticket_items.discount_type IS 'Type of discount (percentage or fixed amount)';