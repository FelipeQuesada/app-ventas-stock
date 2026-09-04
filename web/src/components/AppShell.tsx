import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  ListOrdered,
  Users,
  Wallet,
  BarChart3,
  Shield,
  User,
  Menu,
  X,
  MoreHorizontal,
  Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BOTTOM_NAV = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/sales', label: 'Ventas', icon: ShoppingCart },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/caja', label: 'Caja', icon: Wallet, end: true },
];

const DRAWER_NAV = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/stock', label: 'Stock', icon: Warehouse },
  { to: '/sales', label: 'Nueva venta', icon: ShoppingCart },
  { to: '/sales-list', label: 'Historial ventas', icon: ListOrdered },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/caja', label: 'Caja', icon: Wallet, end: true },
  { to: '/caja/list', label: 'Historial caja', icon: ListOrdered },
  { to: '/statistics', label: 'Estadísticas', icon: BarChart3, adminOnly: true },
  { to: '/tiendanube', label: 'Tiendanube', icon: Store, adminOnly: true },
  { to: '/admin', label: 'Panel admin', icon: Shield, adminOnly: true },
  { to: '/profile', label: 'Perfil', icon: User },
];

const TITLES: Record<string, string> = {
  '/': 'Inicio',
  '/products': 'Productos',
  '/products/new': 'Nuevo producto',
  '/stock': 'Stock',
  '/sales': 'Registrar venta',
  '/sales-list': 'Historial de ventas',
  '/customers': 'Clientes',
  '/caja': 'Caja del día',
  '/caja/list': 'Historial de caja',
  '/statistics': 'Estadísticas',
  '/tiendanube': 'Tiendanube',
  '/users': 'Usuarios',
  '/profile': 'Perfil',
};

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/products/')) return 'Editar producto';
  if (pathname.startsWith('/customers/')) return 'Detalle de cliente';
  if (pathname.startsWith('/caja/edit/')) return 'Editar caja';
  return 'Advance Coat';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isAdmin = profile?.role === 'admin';

  const drawerItems = DRAWER_NAV.filter((item) => !item.adminOnly || isAdmin);
  const moreActive = !BOTTOM_NAV.some((item) => {
    if (item.end) return location.pathname === item.to;
    return (
      item.to === location.pathname ||
      (item.to !== '/' && location.pathname.startsWith(item.to))
    );
  });

  return (
    <div className="app-shell">
      <AnimatePresence>
        {open && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img src="/logo-advance.png" alt="Advance Coat" />
          </div>
          <div>
            <h1>Advance Coat</h1>
            <span>Gestión de ventas</span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {drawerItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="muted" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {profile?.name ?? 'Usuario'}
            <br />
            <span style={{ fontSize: 11 }}>{profile?.role === 'admin' ? 'Admin' : 'Empleado'}</span>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="row">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <h2>{resolveTitle(location.pathname)}</h2>
          </div>
          <div className="topbar-email muted">{profile?.email}</div>
        </header>

        <main className="page-content">{children}</main>

        <nav className="bottom-nav" aria-label="Navegación principal">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            className={`bottom-nav-link ${moreActive || open ? 'active' : ''}`}
            onClick={() => setOpen(true)}
          >
            <MoreHorizontal size={22} />
            <span>Más</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
