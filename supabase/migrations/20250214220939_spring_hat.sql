-- Drop existing view
DROP VIEW IF EXISTS ticket_payments_view;

-- Create view for ticket payments with proper ordering
CREATE VIEW ticket_payments_view AS
SELECT 
  t.id as ticket_id,
  t.reference,
  t.montant as total_amount,
  COALESCE(SUM(p.amount), 0) as paid_amount,
  t.montant - COALESCE(SUM(p.amount), 0) as remaining_amount,
  CASE
    WHEN t.statut = 'annulé' THEN 'annulé'
    WHEN COALESCE(SUM(p.amount), 0) >= t.montant THEN 'payé'
    WHEN COALESCE(SUM(p.amount), 0) > 0 THEN 'avance'
    ELSE 'en_attente'
  END as payment_status,
  t.created_at
FROM tickets t
LEFT JOIN payments p ON p.document_type = 'ticket' AND p.document_id = t.id
GROUP BY t.id, t.reference, t.montant, t.statut, t.created_at;

-- Add helpful comments
COMMENT ON VIEW ticket_payments_view IS 'View showing ticket payment totals and status';