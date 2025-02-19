-- Drop existing column if it exists to avoid conflicts
ALTER TABLE ticket_items 
  DROP COLUMN IF EXISTS discount_type;

-- Add discount_type column with proper constraints
ALTER TABLE ticket_items
  ADD COLUMN discount_type text NOT NULL 
  DEFAULT 'percentage' 
  CHECK (discount_type IN ('percentage', 'fixed'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_items_discount_type 
ON ticket_items(discount_type);

-- Add helpful comment
COMMENT ON COLUMN ticket_items.discount_type IS 'Type of discount (percentage or fixed amount)';