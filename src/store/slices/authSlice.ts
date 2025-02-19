import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

interface AuthState {
  user: any | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  initialized: false,
};

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    // First sign in with credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message === 'Invalid login credentials') {
        throw new Error('Email ou mot de passe incorrect');
      }
      throw new Error(authError.message);
    }

    // Then get the user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      // Sign out if profile fetch fails
      await supabase.auth.signOut();
      throw new Error('Erreur lors de la récupération du profil');
    }

    // Store session
    if (authData.session) {
      localStorage.setItem('sb-session', JSON.stringify(authData.session));
    }

    return {
      ...authData.user,
      profile: profile || null
    };
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  
  // Clear stored session
  localStorage.removeItem('sb-session');
});

export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (_, { rejectWithValue }) => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        return null;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error('Erreur lors de la récupération du profil');
      }

      return {
        ...session.user,
        profile: profile || null
      };
    } catch (error) {
      // Clear stored session on error
      localStorage.removeItem('sb-session');
      return rejectWithValue((error as Error).message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign In
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Une erreur est survenue';
        state.initialized = true;
      })
      // Sign Out
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.initialized = true;
      })
      // Refresh Session
      .addCase(refreshSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.initialized = true;
      })
      .addCase(refreshSession.rejected, (state, action) => {
        state.user = null;
        state.loading = false;
        state.error = action.payload as string;
        state.initialized = true;
      });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;