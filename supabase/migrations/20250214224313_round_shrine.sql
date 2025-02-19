-- Drop existing view if it exists
DROP VIEW IF EXISTS bank_transactions_details;

-- Create view for bank transactions with proper details
CREATE VIEW bank_transactions_details AS
WITH payment_info AS (
  SELECT 
    p.id as payment_id,
    p.document_type,
    p.document_id,
    p.payment_method,
    p.check_number,
    p.reference as payment_reference,
    p.payment_date::date as payment_date,
    CASE
      WHEN p.document_type = 'ticket' THEN (
        SELECT t.reference
        FROM tickets t
        WHERE t.id = p.document_id
      )
      WHEN p.document_type = 'invoice' THEN (
        SELECT i.reference
        FROM invoices i
        WHERE i.id = p.document_id
      )
      WHEN p.document_type = 'purchase_order' THEN (
        SELECT po.reference
        FROM purchase_orders po
        WHERE po.id = p.document_id
      )
      ELSE NULL
    END as document_reference,
    CASE
      WHEN p.document_type = 'ticket' THEN (
        SELECT t.client_nom
        FROM tickets t
        WHERE t.id = p.document_id
      )
      WHEN p.document_type = 'invoice' THEN (
        SELECT i.client_nom
        FROM invoices i
        WHERE i.id = p.document_id
      )
      WHEN p.document_type = 'purchase_order' THEN (
        SELECT po.supplier_name
        FROM purchase_orders po
        WHERE po.id = p.document_id
      )
      ELSE NULL
    END as client_nom,
    CASE
      WHEN p.document_type = 'ticket' THEN 'Ticket'
      WHEN p.document_type = 'invoice' THEN 'Facture'
      WHEN p.document_type = 'purchase_order' THEN 'Commande'
    END as document_type_label,
    CASE
      WHEN p.document_type IN ('ticket', 'invoice') THEN 'sale'
      WHEN p.document_type = 'purchase_order' THEN 'purchase'
    END as payment_type
  FROM payments p
)
SELECT 
  bt.id,
  bt.bank_id,
  bt.type,
  CASE
    -- Pour les paiements, le montant dépend du type de document
    WHEN bt.type = 'payment' THEN
      CASE payment_info.payment_type
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
    WHEN bt.type = 'payment' THEN payment_info.document_reference
    ELSE bt.reference
  END as reference_number,
  CASE
    WHEN bt.type = 'payment' THEN payment_info.payment_reference
    ELSE NULL
  END as payment_reference,
  payment_info.check_number,
  CASE
    WHEN bt.type = 'deposit' THEN 'Dépôt'
    WHEN bt.type = 'withdrawal' THEN 'Retrait'
    WHEN bt.type = 'transfer' THEN 'Virement'
    WHEN bt.type = 'payment' THEN (
      CASE payment_info.payment_method
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
  payment_info.client_nom,
  CASE
    WHEN bt.type = 'payment' THEN 
      CASE payment_info.payment_method
        WHEN 'check' THEN 
          CONCAT(
            'Paiement ',
            LOWER(payment_info.document_type_label),
            ' ',
            payment_info.document_reference,
            ' - ',
            payment_info.client_nom,
            ' (Chèque n°',
            payment_info.check_number,
            ')'
          )
        ELSE
          CONCAT(
            'Paiement ',
            LOWER(payment_info.document_type_label),
            ' ',
            payment_info.document_reference,
            ' - ',
            payment_info.client_nom
          )
      END
    ELSE bt.description
  END as description,
  payment_info.payment_date
FROM bank_transactions bt
LEFT JOIN banks b ON bt.bank_id = b.id
LEFT JOIN payment_info ON bt.id = payment_info.payment_id;

-- Add helpful comments
COMMENT ON VIEW bank_transactions_details IS 'View showing bank transactions with payment details';
COMMENT ON COLUMN bank_transactions_details.transaction_date IS 'Transaction date (date only, no time)';
COMMENT ON COLUMN bank_transactions_details.payment_date IS 'Payment date (date only, no time)';
COMMENT ON COLUMN bank_transactions_details.check_number IS 'Check number for check payments';
COMMENT ON COLUMN bank_transactions_details.amount IS 'Transaction amount (positive for income, negative for expense)';
COMMENT ON COLUMN bank_transactions_details.reference_number IS 'Document reference number';
COMMENT ON COLUMN bank_transactions_details.payment_reference IS 'Optional payment reference';