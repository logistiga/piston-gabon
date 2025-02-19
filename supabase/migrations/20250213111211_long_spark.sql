-- Add discount_type column to ticket_items table
ALTER TABLE ticket_items
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL 
  DEFAULT 'percentage' 
  CHECK (discount_type IN ('percentage', 'fixed'));

-- Update any existing records to use percentage discount
UPDATE ticket_items 
SET discount_type = 'percentage' 
WHERE discount_type IS NULL;

-- Add helpful comment
COMMENT ON COLUMN ticket_items.discount_type IS 'Type of discount (percentage or fixed amount)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_items_discount_type ON ticket_items(discount_type);