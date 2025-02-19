import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Menu, X, Home, LogOut, Settings, 
  ChevronDown, ChevronRight, Package, FileText,
  Users, CreditCard, Building2, Link2, Wallet,
  Building, ShoppingCart, Truck, ShoppingBag,
  LayoutGrid, BarChart3, UserCog, Shield, History
} from 'lucide-react';
import { supabase } from '../config/supabase';
import { signOut } from '../store/slices/authSlice';
import BackButton from './ui/BackButton';
import type { AppDispatch, RootState } from '../store';

interface NavigationGroup {
  name: string;
  icon: string;
  items: {
    name: string;
    href: string;
    icon: string;
  }[];
}

const navigation: NavigationGroup[] = [
  {
    name: 'Ventes',
    icon: 'CreditCard',
    items: [
      { name: 'Point de Vente', href: '/pos', icon: 'CreditCard' },
      { name: 'Tickets', href: '/tickets', icon: 'FileText' },
      { name: 'Devis', href: '/quotes', icon: 'FileText' },
      { name: 'Factures', href: '/invoices', icon: 'FileText' },
      { name: 'Clients', href: '/customers', icon: 'Users' },
    ]
  },
  {
    name: 'Achats',
    icon: 'ShoppingCart',
    items: [
      { name: 'Commandes', href: '/purchase-orders', icon: 'ShoppingCart' },
      { name: 'Réception', href: '/purchase-orders/reception', icon: 'Truck' },
      { name: 'Fournisseurs', href: '/suppliers', icon: 'Building' },
    ]
  },
  {
    name: 'Catalogue',
    icon: 'Package',
    items: [
      { name: 'Catalogue Articles', href: '/catalog', icon: 'Package' },
      { name: 'Articles', href: '/articles', icon: 'Package' },
      { name: 'Catégories', href: '/categories', icon: 'LayoutGrid' },
      { name: 'Marques', href: '/brands', icon: 'Building2' },
      { name: 'Compatibilité', href: '/compatibility', icon: 'Link2' },
    ]
  },
  {
    name: 'Finance',
    icon: 'Wallet',
    items: [
      { name: 'Caisse', href: '/cash', icon: 'Wallet' },
      { name: 'Banque', href: '/bank', icon: 'Building' },
      { name: 'Rapports', href: '/reports', icon: 'BarChart3' },
    ]
  },
  {
    name: 'Administration',
    icon: 'Shield',
    items: [
      { name: 'Utilisateurs', href: '/users', icon: 'UserCog' },
      { name: 'Rôles', href: '/roles', icon: 'Shield' },
      { name: 'Journal d\'Audit', href: '/audit', icon: 'History' },
    ]
  }
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = async () => {
    try {
      await dispatch(signOut());
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getIcon = (iconName: string) => {
    const icons = {
      Home, FileText, Users, ShoppingBag, Package, LayoutGrid, CreditCard, 
      Building2, Link2, Wallet, Building, ShoppingCart, Truck, BarChart3,
      UserCog, Shield, History
    };
    return icons[iconName as keyof typeof icons];
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => 
      prev.includes(groupName)
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    );
  };

  const renderNavigationGroup = (group: NavigationGroup) => {
    const isOpen = openGroups.includes(group.name);
    const hasActiveChild = group.items.some(item => location.pathname === item.href);
    const GroupIcon = getIcon(group.icon);

    return (
      <div key={group.name} className="space-y-1">
        <button
          onClick={() => toggleGroup(group.name)}
          className={`w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md ${
            hasActiveChild
              ? 'bg-primary-50 text-primary-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center">
            <GroupIcon className={`mr-3 h-5 w-5 flex-shrink-0 ${
              hasActiveChild ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
            }`} />
            {group.name}
          </div>
          {isOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>

        {isOpen && (
          <div className="space-y-1 pl-11">
            {group.items.map(item => {
              const Icon = getIcon(item.icon);
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-xl font-semibold">Piston Gabon</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <nav className="flex-1 space-y-1 px-2 py-4">
            <Link
              to="/"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location.pathname === '/'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Home className={`mr-3 h-5 w-5 flex-shrink-0 ${
                location.pathname === '/' ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
              }`} />
              Dashboard
            </Link>

            {navigation.map(group => renderNavigationGroup(group))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button 
              onClick={handleLogout}
              className="flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="mr-3 h-6 w-6" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center border-b border-gray-200 px-4">
            <span className="text-xl font-semibold">Piston Gabon</span>
          </div>
          
          <nav className="flex-1 space-y-1 px-2 py-4">
            <Link
              to="/"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location.pathname === '/'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Home className={`mr-3 h-5 w-5 flex-shrink-0 ${
                location.pathname === '/' ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
              }`} />
              Dashboard
            </Link>

            {navigation.map(group => renderNavigationGroup(group))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button 
              onClick={handleLogout}
              className="flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="mr-3 h-6 w-6" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              {location.pathname !== '/' && <BackButton />}
            </div>
            <div className="ml-4 flex items-center gap-4">
              <Link to="/settings" className="text-gray-500 hover:text-gray-700">
                <Settings className="h-6 w-6" />
              </Link>
              <div className="relative">
                <img
                  className="h-8 w-8 rounded-full"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="User avatar"
                />
              </div>
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;