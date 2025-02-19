-- Drop existing view if it exists
DROP VIEW IF EXISTS bank_transactions_details;

-- Create view for bank transactions with proper details
CREATE VIEW bank_transactions_details AS
WITH payment_info AS (
  SELECT 
    p.id as payment_id,
    p.entity_type,
    p.entity_id,
    p.payment_method,
    p.check_number,
    p.reference as payment_reference,
    p.payment_date::date as payment_date,
    CASE
      WHEN p.entity_type = 'ticket' THEN (
        SELECT t.reference
        FROM tickets t
        WHERE t.id = p.entity_id::uuid
      )
      WHEN p.entity_type = 'invoice' THEN (
        SELECT i.reference
        FROM invoices i
        WHERE i.id = p.entity_id::uuid
      )
      WHEN p.entity_type = 'purchase_order' THEN (
        SELECT po.reference
        FROM purchase_orders po
        WHERE po.id = p.entity_id::uuid
      )
      ELSE NULL
    END as document_reference,
    CASE
      WHEN p.entity_type = 'ticket' THEN (
        SELECT t.client_nom
        FROM tickets t
        WHERE t.id = p.entity_id::uuid
      )
      WHEN p.entity_type = 'invoice' THEN (
        SELECT i.client_nom
        FROM invoices i
        WHERE i.id = p.entity_id::uuid
      )
      WHEN p.entity_type = 'purchase_order' THEN (
        SELECT po.supplier_name
        FROM purchase_orders po
        WHERE po.id = p.entity_id::uuid
      )
      ELSE NULL
    END as client_nom,
    CASE
      WHEN p.entity_type = 'ticket' THEN 'Ticket'
      WHEN p.entity_type = 'invoice' THEN 'Facture'
      WHEN p.entity_type = 'purchase_order' THEN 'Commande'
    END as document_type
  FROM payments p
)
SELECT 
  bt.id,
  bt.bank_id,
  CASE
    WHEN bt.type = 'payment' THEN (
      CASE pi.payment_method
        WHEN 'check' THEN 'Chèque'
        WHEN 'bank_transfer' THEN 'Virement'
        ELSE pi.payment_method
      END
    )
    ELSE bt.type
  END as type,
  -ABS(bt.amount) as amount, -- Always show negative amounts
  bt.status,
  bt.date::date as transaction_date,
  bt.transaction_number,
  b.name as bank_name,
  CASE
    WHEN bt.type = 'payment' THEN pi.document_reference
    ELSE bt.reference
  END as reference_number,
  CASE
    WHEN bt.type = 'payment' THEN pi.payment_reference
    ELSE NULL
  END as payment_reference,
  pi.check_number,
  CASE
    WHEN bt.type = 'deposit' THEN 'Dépôt'
    WHEN bt.type = 'withdrawal' THEN 'Retrait'
    WHEN bt.type = 'transfer' THEN 'Virement'
    WHEN bt.type = 'payment' THEN (
      CASE pi.payment_method
        WHEN 'cash' THEN 'Espèces'
        WHEN 'check' THEN 'Chèque'
        WHEN 'bank_transfer' THEN 'Virement'
        ELSE 'Paiement'
      END
    )
    ELSE 'Paiement'
  END as payment_type,
  CASE
    WHEN bt.status = 'confirmed' THEN 'Confirmé'
    WHEN bt.status = 'pending' THEN 'En attente'
    ELSE 'Rejeté'
  END as status_label,
  pi.client_nom,
  CASE
    WHEN bt.type = 'payment' THEN 
      CASE pi.payment_method
        WHEN 'check' THEN 
          CONCAT(
            'Paiement ',
            LOWER(pi.document_type),
            ' ',
            pi.document_reference,
            ' - ',
            pi.client_nom,
            ' (Chèque n°',
            pi.check_number,
            ')'
          )
        ELSE
          CONCAT(
            'Paiement ',
            LOWER(pi.document_type),
            ' ',
            pi.document_reference,
            ' - ',
            pi.client_nom
          )
      END
    ELSE bt.description
  END as description,
  pi.payment_date
FROM bank_transactions bt
LEFT JOIN banks b ON bt.bank_id = b.id
LEFT JOIN payment_info pi ON bt.id = pi.payment_id;

-- Add RLS policy for the view
GRANT SELECT ON bank_transactions_details TO authenticated;

-- Add helpful comments
COMMENT ON VIEW bank_transactions_details IS 'View combining bank transactions with payment details';
COMMENT ON COLUMN bank_transactions_details.transaction_date IS 'Transaction date (date only, no time)';
COMMENT ON COLUMN bank_transactions_details.payment_date IS 'Payment date (date only, no time)';
COMMENT ON COLUMN bank_transactions_details.check_number IS 'Check number for check payments';
COMMENT ON COLUMN bank_transactions_details.amount IS 'Transaction amount (always negative)';
COMMENT ON COLUMN bank_transactions_details.reference_number IS 'Document reference number';
COMMENT ON COLUMN bank_transactions_details.payment_reference IS 'Optional payment reference';