/*
  # Purchase Orders Schema

  1. New Tables
    - `purchase_orders` - Stores purchase order information
      - `id` (uuid, primary key)
      - `reference` (text, unique)
      - `supplier_name` (text)
      - `status` (text: draft, validated, cancelled)
      - `total_amount` (decimal)
      - `notes` (text)
      - `order_date` (timestamp)
      - `expected_date` (timestamp)
      - `payment_status` (text: pending, partial, paid)
      - `payment_date` (timestamp)
      
    - `purchase_order_items` - Stores items in each purchase order
      - `id` (uuid, primary key)
      - `purchase_order_id` (uuid, references purchase_orders)
      - `article_id` (uuid, references articles)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total_price` (decimal)
      - `notes` (text)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users

  3. Functions & Triggers
    - Auto-generate reference numbers (CM_XXXXXX)
    - Calculate item total prices
    - Update purchase order total amount
*/

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  supplier_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'cancelled')),
  total_amount decimal(12,2) NOT NULL DEFAULT 0,
  notes text,
  order_date timestamptz NOT NULL DEFAULT now(),
  expected_date timestamptz,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  total_price decimal(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for purchase_orders
CREATE POLICY "purchase_orders_select_policy" ON purchase_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "purchase_orders_insert_policy" ON purchase_orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "purchase_orders_update_policy" ON purchase_orders
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "purchase_orders_delete_policy" ON purchase_orders
  FOR DELETE TO authenticated USING (true);

-- Create policies for purchase_order_items
CREATE POLICY "purchase_order_items_select_policy" ON purchase_order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "purchase_order_items_insert_policy" ON purchase_order_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "purchase_order_items_update_policy" ON purchase_order_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "purchase_order_items_delete_policy" ON purchase_order_items
  FOR DELETE TO authenticated USING (true);

-- Function to generate purchase order reference
CREATE OR REPLACE FUNCTION generate_purchase_order_reference()
RETURNS text AS $$
DECLARE
  ref text;
  num int;
BEGIN
  -- Get the current max reference number
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 4) AS integer)), 0)
  INTO num
  FROM purchase_orders;
  
  -- Generate new reference (CM_XXXXXX)
  ref := 'CM_' || LPAD((num + 1)::text, 6, '0');
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate purchase order total
CREATE OR REPLACE FUNCTION calculate_purchase_order_total(order_id uuid)
RETURNS decimal AS $$
DECLARE
  total decimal(12,2);
BEGIN
  SELECT COALESCE(SUM(total_price), 0)
  INTO total
  FROM purchase_order_items
  WHERE purchase_order_id = order_id;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate reference on insert
CREATE OR REPLACE FUNCTION purchase_orders_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := generate_purchase_order_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_orders_before_insert_trigger
BEFORE INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION purchase_orders_before_insert();

-- Trigger to calculate item total price
CREATE OR REPLACE FUNCTION purchase_order_items_before_save()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price := NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_order_items_before_save_trigger
BEFORE INSERT OR UPDATE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION purchase_order_items_before_save();

-- Trigger to update purchase order total
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_orders
  SET 
    total_amount = calculate_purchase_order_total(NEW.purchase_order_id),
    updated_at = now()
  WHERE id = NEW.purchase_order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_order_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_purchase_order_total();