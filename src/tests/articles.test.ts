import { supabase } from '../config/supabase';

describe('Article Management', () => {
  const testArticle = {
    cb: 'TEST-001',
    nom: 'Article Test',
    prixa: 1000,
    prixd: 1500,
    type_stock: 'O',
    stock: 10
  };

  test('Article creation should work', async () => {
    const { data, error } = await supabase
      .from('articles')
      .insert([testArticle])
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.cb).toBe(testArticle.cb);
    expect(data.nom).toBe(testArticle.nom);
  });

  test('Article stock update should work', async () => {
    const newStock = 15;
    const { data: article } = await supabase
      .from('articles')
      .select()
      .eq('cb', testArticle.cb)
      .single();

    const { error } = await supabase
      .from('articles')
      .update({ stock: newStock })
      .eq('id', article.id);

    expect(error).toBeNull();

    const { data: updatedArticle } = await supabase
      .from('articles')
      .select()
      .eq('id', article.id)
      .single();

    expect(updatedArticle.stock).toBe(newStock);
  });

  test('Article search should work', async () => {
    const { data, error } = await supabase
      .from('articles')
      .select()
      .ilike('nom', `%${testArticle.nom}%`);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].nom).toBe(testArticle.nom);
  });
});