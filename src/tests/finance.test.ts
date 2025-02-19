import { supabase } from '../config/supabase';

describe('Financial Management', () => {
  const testBank = {
    name: 'Banque Test',
    account_number: 'TEST123456',
    balance: 0
  };

  test('Bank account creation should work', async () => {
    const { data, error } = await supabase
      .from('banks')
      .insert([testBank])
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.name).toBe(testBank.name);
    expect(data.balance).toBe(0);
  });

  test('Bank transaction should update balance', async () => {
    const { data: bank } = await supabase
      .from('banks')
      .select()
      .eq('name', testBank.name)
      .single();

    const deposit = {
      bank_id: bank.id,
      type: 'deposit',
      amount: 10000,
      description: 'Test deposit'
    };

    const { error } = await supabase
      .from('bank_transactions')
      .insert([deposit]);

    expect(error).toBeNull();

    const { data: updatedBank } = await supabase
      .from('banks')
      .select()
      .eq('id', bank.id)
      .single();

    expect(updatedBank.balance).toBe(deposit.amount);
  });

  test('Cash register operation should work', async () => {
    const operation = {
      operation_type: 'income',
      amount: 5000,
      reason: 'Test income'
    };

    const { data, error } = await supabase
      .from('cash_register')
      .insert([operation])
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.amount).toBe(operation.amount);
    expect(data.operation_type).toBe(operation.operation_type);
  });
});