-- Verify admin role has all required permissions
DO $$ 
DECLARE
  admin_perms text[];
BEGIN
  -- Get current admin permissions
  SELECT permissions INTO admin_perms
  FROM roles
  WHERE name = 'administrateur';

  -- Verify and update if needed
  IF NOT admin_perms @> ARRAY[
    -- Client interface permissions
    'client.view_own',
    'client.edit_own',
    'client.view_catalog',
    'client.place_order',
    'client.view_orders',
    'client.view_invoices',
    'client.download_documents'
  ] THEN
    -- Update admin role with all permissions
    UPDATE roles
    SET permissions = ARRAY[
      -- Admin permissions
      'admin.full_access',
      
      -- User management
      'users.view', 'users.create', 'users.edit', 'users.delete',
      
      -- Client management
      'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
      'clients.credit', 'clients.accounts',
      
      -- Article management
      'articles.view', 'articles.create', 'articles.edit', 'articles.delete',
      'articles.import', 'articles.export', 'articles.prices',
      
      -- Stock management
      'stock.view', 'stock.adjust', 'stock.transfer', 'stock.inventory',
      'stock.receive', 'stock.return',
      
      -- Sales management
      'sales.view', 'sales.create', 'sales.edit', 'sales.delete',
      'sales.discount', 'sales.void', 'sales.refund',
      
      -- Invoice management
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
      'invoices.validate', 'invoices.void', 'invoices.credit',
      
      -- Quote management
      'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.delete',
      'quotes.validate', 'quotes.convert',
      
      -- Ticket management
      'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.delete',
      'tickets.validate', 'tickets.void', 'tickets.refund',
      
      -- Cash management
      'cash.view', 'cash.deposit', 'cash.withdraw', 'cash.transfer',
      'cash.close', 'cash.report',
      
      -- Bank management
      'bank.view', 'bank.deposit', 'bank.withdraw', 'bank.transfer',
      'bank.reconcile', 'bank.report',
      
      -- Report management
      'reports.view', 'reports.export', 'reports.print',
      'reports.sales', 'reports.stock', 'reports.finance',
      
      -- Settings management
      'settings.view', 'settings.edit',
      'settings.company', 'settings.users', 'settings.roles',
      'settings.taxes', 'settings.backup', 'settings.restore',
      
      -- Client interface permissions
      'client.view_own', 'client.edit_own',
      'client.view_catalog', 'client.place_order',
      'client.view_orders', 'client.view_invoices',
      'client.download_documents'
    ]
    WHERE name = 'administrateur';
  END IF;
END $$;

-- Create function to check admin permissions
CREATE OR REPLACE FUNCTION check_admin_permissions(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role text;
  has_permissions boolean;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM user_profiles
  WHERE user_id = $1;

  -- Check if user is admin and has all required permissions
  SELECT EXISTS (
    SELECT 1
    FROM roles
    WHERE name = user_role
    AND permissions @> ARRAY[
      'admin.full_access',
      'client.view_own',
      'client.edit_own',
      'client.view_catalog',
      'client.place_order',
      'client.view_orders',
      'client.view_invoices',
      'client.download_documents'
    ]
  ) INTO has_permissions;

  RETURN has_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION check_admin_permissions IS 'Checks if a user has all required admin permissions';