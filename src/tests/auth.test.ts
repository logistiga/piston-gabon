import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../config/supabase';

describe('Authentication & User Management', () => {
  // Test data
  const testUser = {
    email: 'test@example.com',
    password: 'Test@2025',
    role: 'user'
  };

  // Clean up after tests
  afterAll(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.signOut();
    }
  });

  test('User registration should work', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user?.email).toBe(testUser.email);
  });

  test('User login should work', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user?.email).toBe(testUser.email);
  });

  test('User profile should be created automatically', async () => {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', testUser.email.split('@')[0])
      .single();

    expect(error).toBeNull();
    expect(profile).toBeDefined();
    expect(profile.role).toBe('user');
    expect(profile.is_active).toBe(true);
  });

  test('User status can be toggled', async () => {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('username', testUser.email.split('@')[0])
      .single();

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: false })
      .eq('user_id', profile.user_id);

    expect(error).toBeNull();

    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('is_active')
      .eq('user_id', profile.user_id)
      .single();

    expect(updatedProfile.is_active).toBe(false);
  });
});