-- First drop existing check constraint if it exists
ALTER TABLE ticket_items DROP CONSTRAINT IF EXISTS ticket_items_discount_check;

-- Modify discount column to have higher precision
ALTER TABLE ticket_items 
  ALTER COLUMN discount TYPE decimal(10,2);

-- Add new check constraint
ALTER TABLE ticket_items
  ADD CONSTRAINT ticket_items_discount_check 
  CHECK (
    (discount_type = 'percentage' AND discount >= 0 AND discount <= 100) OR
    (discount_type = 'fixed' AND discount >= 0)
  );

-- Add helpful comment
COMMENT ON COLUMN ticket_items.discount IS 'Discount amount (percentage or fixed amount)';