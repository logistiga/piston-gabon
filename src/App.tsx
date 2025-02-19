import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from './config/supabase';
import { setUser, refreshSession } from './store/slices/authSlice';
import Layout from './components/Layout';
import Loading from './components/Loading';
import type { RootState } from './store';

// Lazy load components
const Login = React.lazy(() => import('./components/auth/Login'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Clients = React.lazy(() => import('./components/Clients'));
const Tickets = React.lazy(() => import('./components/Tickets'));
const Quotes = React.lazy(() => import('./components/Quotes'));
const Invoices = React.lazy(() => import('./components/Invoices'));
const Articles = React.lazy(() => import('./components/catalog/Articles'));
const ArticleCatalog = React.lazy(() => import('./components/catalog/ArticleCatalog'));
const PurchaseOrderList = React.lazy(() => import('./components/stock/PurchaseOrderList'));
const PurchaseOrderReception = React.lazy(() => import('./components/stock/PurchaseOrderReception'));
const Categories = React.lazy(() => import('./components/catalog/Categories'));
const BrandList = React.lazy(() => import('./components/brands/BrandList'));
const Compatibility = React.lazy(() => import('./components/catalog/Compatibility'));
const CompanySettings = React.lazy(() => import('./components/settings/CompanySettings'));
const SupplierList = React.lazy(() => import('./components/suppliers/SupplierList'));
const POSInterface = React.lazy(() => import('./components/pos/POSInterface'));
const BankTransactions = React.lazy(() => import('./components/banks/BankTransactions'));
const CashRegister = React.lazy(() => import('./components/cash/CashRegister'));
const Reports = React.lazy(() => import('./components/reports/Reports'));
const UserList = React.lazy(() => import('./components/users/UserList'));
const RoleList = React.lazy(() => import('./components/roles/RoleList'));
const AuditList = React.lazy(() => import('./components/audit/AuditList'));

function App() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    dispatch(refreshSession());

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setUser(session?.user ?? null));
      
      if (session) {
        localStorage.setItem('sb-session', JSON.stringify(session));
      } else {
        localStorage.removeItem('sb-session');
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  if (!user) {
    return (
      <Router>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <Router>
      <Layout>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POSInterface />} />
            <Route path="/customers" element={<Clients />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/catalog" element={<ArticleCatalog />} />
            <Route path="/purchase-orders" element={<PurchaseOrderList />} />
            <Route path="/purchase-orders/reception" element={<PurchaseOrderReception />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/brands" element={<BrandList />} />
            <Route path="/compatibility" element={<Compatibility />} />
            <Route path="/settings" element={<CompanySettings />} />
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/bank" element={<BankTransactions />} />
            <Route path="/cash" element={<CashRegister />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/roles" element={<RoleList />} />
            <Route path="/audit" element={<AuditList />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;