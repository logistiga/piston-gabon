/*
  # Initial Schema Setup

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `nom` (text)
      - `entreprise` (text, optional)
      - `email` (text, unique)
      - `telephone` (text)
      - `limite_credit` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `tickets`
      - `id` (uuid, primary key)
      - `description` (text)
      - `montant` (decimal)
      - `statut` (enum: 'en attente', 'payé', 'annulé')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  entreprise text,
  email text UNIQUE NOT NULL,
  telephone text NOT NULL,
  limite_credit decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  montant decimal(10,2) NOT NULL,
  statut text NOT NULL DEFAULT 'en attente' CHECK (statut IN ('en attente', 'payé', 'annulé')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Enable read access for authenticated users" ON clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON clients
  FOR DELETE TO authenticated USING (true);

-- Create policies for tickets
CREATE POLICY "Enable read access for authenticated users" ON tickets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON tickets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON tickets
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON tickets
  FOR DELETE TO authenticated USING (true);