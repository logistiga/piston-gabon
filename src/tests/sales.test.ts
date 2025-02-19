import { supabase } from '../config/supabase';

describe('Sales Management', () => {
  const testTicket = {
    client_nom: 'Client Test',
    montant: 1500,
    statut: 'en_attente'
  };

  test('Ticket creation should work', async () => {
    const { data, error } = await supabase
      .from('tickets')
      .insert([testTicket])
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.client_nom).toBe(testTicket.client_nom);
    expect(data.reference).toMatch(/^T_\d{6}$/);
  });

  test('Ticket payment should work', async () => {
    const { data: ticket } = await supabase
      .from('tickets')
      .select()
      .eq('client_nom', testTicket.client_nom)
      .single();

    const payment = {
      entity_type: 'ticket',
      entity_id: ticket.id,
      payment_method: 'cash',
      amount: ticket.montant,
      total_amount: ticket.montant
    };

    const { error: paymentError } = await supabase
      .from('payments')
      .insert([payment]);

    expect(paymentError).toBeNull();

    const { data: updatedTicket } = await supabase
      .from('tickets')
      .select()
      .eq('id', ticket.id)
      .single();

    expect(updatedTicket.statut).toBe('payé');
  });
});