/*
  # Stock Transfers Schema

  1. New Tables
    - `stock_transfers` - Stores transfer information
      - `id` (uuid, primary key)
      - `reference` (text, unique)
      - `source_warehouse_id` (uuid, references warehouses)
      - `destination_warehouse_id` (uuid, references warehouses)
      - `status` (text: pending, in_progress, completed, cancelled)
      - `requester_id` (uuid, references auth.users)
      - `validator_id` (uuid, references auth.users)
      - `notes` (text)
      
    - `stock_transfer_items` - Stores items in each transfer
      - `id` (uuid, primary key)
      - `transfer_id` (uuid, references stock_transfers)
      - `article_id` (uuid, references articles)
      - `quantity` (integer)
      - `source_location_id` (uuid, references warehouse_locations)
      - `destination_location_id` (uuid, references warehouse_locations)
      - `notes` (text)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users

  3. Functions & Triggers
    - Auto-generate reference numbers (TR_XXXXXX)
    - Update stock locations after transfer completion
*/

-- Create stock_transfers table
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  source_warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  destination_warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  requester_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  validator_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT different_warehouses CHECK (source_warehouse_id != destination_warehouse_id)
);

-- Create stock_transfer_items table
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES stock_transfers(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  source_location_id uuid REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  destination_location_id uuid REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- Create policies for stock_transfers
CREATE POLICY "stock_transfers_select_policy" ON stock_transfers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_transfers_insert_policy" ON stock_transfers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "stock_transfers_update_policy" ON stock_transfers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "stock_transfers_delete_policy" ON stock_transfers
  FOR DELETE TO authenticated USING (true);

-- Create policies for stock_transfer_items
CREATE POLICY "stock_transfer_items_select_policy" ON stock_transfer_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_transfer_items_insert_policy" ON stock_transfer_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "stock_transfer_items_update_policy" ON stock_transfer_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "stock_transfer_items_delete_policy" ON stock_transfer_items
  FOR DELETE TO authenticated USING (true);

-- Function to generate transfer reference
CREATE OR REPLACE FUNCTION generate_transfer_reference()
RETURNS text AS $$
DECLARE
  ref text;
  num int;
BEGIN
  -- Get the current max reference number
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 4) AS integer)), 0)
  INTO num
  FROM stock_transfers;
  
  -- Generate new reference (TR_XXXXXX)
  ref := 'TR_' || LPAD((num + 1)::text, 6, '0');
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate reference on insert
CREATE OR REPLACE FUNCTION stock_transfers_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := generate_transfer_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_transfers_before_insert_trigger
BEFORE INSERT ON stock_transfers
FOR EACH ROW
EXECUTE FUNCTION stock_transfers_before_insert();

-- Function to update stock locations when transfer is completed
CREATE OR REPLACE FUNCTION update_stock_locations()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is changing to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update source locations (decrease stock)
    UPDATE article_locations al
    SET 
      quantity = al.quantity - sti.quantity,
      updated_at = now()
    FROM stock_transfer_items sti
    WHERE 
      sti.transfer_id = NEW.id AND
      al.article_id = sti.article_id AND
      al.location_id = sti.source_location_id;

    -- Update or insert destination locations (increase stock)
    INSERT INTO article_locations (
      article_id,
      location_id,
      quantity
    )
    SELECT
      sti.article_id,
      sti.destination_location_id,
      sti.quantity
    FROM stock_transfer_items sti
    WHERE sti.transfer_id = NEW.id
    ON CONFLICT (article_id, location_id) DO UPDATE
    SET 
      quantity = article_locations.quantity + EXCLUDED.quantity,
      updated_at = now();

    -- Set completed timestamp
    NEW.completed_at = now();
  END IF;

  -- Set cancelled timestamp if status changes to 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_locations_trigger
BEFORE UPDATE ON stock_transfers
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION update_stock_locations();

-- Function to validate stock availability before transfer
CREATE OR REPLACE FUNCTION validate_stock_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's enough stock in source locations
  IF EXISTS (
    SELECT 1
    FROM stock_transfer_items sti
    LEFT JOIN article_locations al ON 
      al.article_id = sti.article_id AND 
      al.location_id = sti.source_location_id
    WHERE 
      sti.transfer_id = NEW.id AND
      (al.quantity IS NULL OR al.quantity < sti.quantity)
  ) THEN
    RAISE EXCEPTION 'Stock insuffisant dans certains emplacements source';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_stock_availability_trigger
BEFORE UPDATE ON stock_transfers
FOR EACH ROW
WHEN (NEW.status = 'in_progress' AND OLD.status = 'pending')
EXECUTE FUNCTION validate_stock_availability();