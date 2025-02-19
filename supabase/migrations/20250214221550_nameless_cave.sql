-- Drop existing view
DROP VIEW IF EXISTS ticket_payments_view;

-- Create view for ticket payments with proper relationships
CREATE VIEW ticket_payments_view AS
WITH payment_totals AS (
  SELECT 
    document_id,
    SUM(amount) as total_paid
  FROM payments
  WHERE document_type = 'ticket'
  GROUP BY document_id
)
SELECT 
  t.id as ticket_id,
  t.montant as total_amount,
  COALESCE(pt.total_paid, 0) as paid_amount,
  t.montant - COALESCE(pt.total_paid, 0) as remaining_amount,
  CASE
    WHEN t.statut = 'annulé' THEN 'annulé'
    WHEN COALESCE(pt.total_paid, 0) >= t.montant THEN 'payé'
    WHEN COALESCE(pt.total_paid, 0) > 0 THEN 'avance'
    ELSE 'en_attente'
  END as payment_status,
  t.created_at,
  t.client_nom,
  t.client_email,
  t.client_telephone,
  t.statut,
  t.facture
FROM tickets t
LEFT JOIN payment_totals pt ON pt.document_id = t.id;

-- Add helpful comments
COMMENT ON VIEW ticket_payments_view IS 'View showing ticket payment totals and status with ticket details';