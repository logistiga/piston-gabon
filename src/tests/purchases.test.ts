import { supabase } from '../config/supabase';

describe('Purchase Management', () => {
  const testOrder = {
    supplier_name: 'Fournisseur Test',
    total_amount: 5000,
    status: 'draft'
  };

  test('Purchase order creation should work', async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([testOrder])
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.supplier_name).toBe(testOrder.supplier_name);
    expect(data.reference).toMatch(/^CM_\d{6}$/);
  });

  test('Purchase order validation should work', async () => {
    const { data: order } = await supabase
      .from('purchase_orders')
      .select()
      .eq('supplier_name', testOrder.supplier_name)
      .single();

    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'validated' })
      .eq('id', order.id);

    expect(error).toBeNull();

    const { data: updatedOrder } = await supabase
      .from('purchase_orders')
      .select()
      .eq('id', order.id)
      .single();

    expect(updatedOrder.status).toBe('validated');
  });
});