-- Add payment_type to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'sale'
  CHECK (payment_type IN ('sale', 'purchase'));

-- Create or replace view for bank transactions with payment type
CREATE OR REPLACE VIEW bank_transactions_details AS
WITH payment_info AS (
  SELECT 
    p.id as payment_id,
    p.entity_type,
    p.entity_id,
    p.payment_method,
    p.check_number,
    p.reference as payment_reference,
    p.payment_date::date as payment_date,
    p.payment_type,
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
  bt.type,
  CASE
    -- Pour les paiements, le montant dépend du type de paiement
    WHEN bt.type = 'payment' THEN
      CASE pi.payment_type
        -- Les ventes sont des entrées positives
        WHEN 'sale' THEN ABS(bt.amount)
        -- Les achats sont des sorties négatives
        WHEN 'purchase' THEN -ABS(bt.amount)
        ELSE bt.amount
      END
    -- Les dépôts sont toujours positifs
    WHEN bt.type = 'deposit' THEN ABS(bt.amount)
    -- Les retraits sont toujours négatifs
    WHEN bt.type = 'withdrawal' THEN -ABS(bt.amount)
    -- Pour les virements, dépend de la description
    WHEN bt.type = 'transfer' THEN 
      CASE 
        WHEN bt.description ILIKE '%sortant%' THEN -ABS(bt.amount)
        ELSE ABS(bt.amount)
      END
    ELSE bt.amount
  END as amount,
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

-- Update existing payments with payment_type
UPDATE payments
SET payment_type = CASE
  WHEN entity_type IN ('ticket', 'invoice') THEN 'sale'
  WHEN entity_type = 'purchase_order' THEN 'purchase'
  ELSE 'sale'
END
WHERE payment_type IS NULL;

-- Add helpful comments
COMMENT ON COLUMN payments.payment_type IS 'Type of payment (sale or purchase)';
COMMENT ON VIEW bank_transactions_details IS 'View combining bank transactions with payment details';