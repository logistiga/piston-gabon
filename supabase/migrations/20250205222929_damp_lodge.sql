/*
  # Role Management Schema

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `permissions` (text array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create policies for roles
CREATE POLICY "Enable read access for authenticated users" ON roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON roles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON roles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON roles
  FOR DELETE TO authenticated USING (true);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
  ('administrateur', 'Accès complet à tous les modules', ARRAY[
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'articles.view', 'articles.create', 'articles.edit', 'articles.delete',
    'stock.view', 'stock.adjust', 'stock.transfer',
    'factures.view', 'factures.create', 'factures.edit', 'factures.delete', 'factures.validate',
    'caisse.view', 'caisse.encaisser', 'caisse.decaisser',
    'rapports.view', 'rapports.export'
  ]),
  ('commercial', 'Gestion des clients et devis', ARRAY[
    'clients.view', 'clients.create', 'clients.edit',
    'articles.view',
    'factures.view', 'factures.create'
  ]),
  ('caisse', 'Gestion de la caisse', ARRAY[
    'caisse.view', 'caisse.encaisser', 'caisse.decaisser',
    'factures.view'
  ]),
  ('stock', 'Gestion du stock', ARRAY[
    'articles.view', 'articles.edit',
    'stock.view', 'stock.adjust', 'stock.transfer'
  ]),
  ('compta', 'Gestion de la comptabilité', ARRAY[
    'factures.view', 'factures.validate',
    'caisse.view',
    'rapports.view', 'rapports.export'
  ])
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;