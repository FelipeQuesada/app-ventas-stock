import { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Settings,
  User,
  Menu,
  X,
  MoreHorizontal,
  FileText,
  Truck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';

const BOTTOM_NAV = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/sales', label: 'Ventas', icon: ShoppingCart },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/caja', label: 'Caja', icon: Wallet, end: true },
];

const DRAWER_NAV = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/stock', label: 'Stock', icon: Warehouse },
  { to: '/sales', label: 'Nueva venta', icon: ShoppingCart },
  { to: '/presupuesto', label: 'Presupuesto', icon: FileText },
  { to: '/presupuesto/list', label: 'Historial presupuestos', icon: ListOrdered },
  { to: '/sales-list', label: 'Historial ventas', icon: ListOrdered },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/caja', label: 'Caja', icon: Wallet, end: true },
  { to: '/caja/list', label: 'Historial caja', icon: ListOrdered },
  { to: '/flex', label: 'Flex', icon: Truck },
  { to: '/statistics', label: 'Estadísticas', icon: BarChart3, adminOnly: true },
  { to: '/admin', label: 'Panel admin', icon: Shield, adminOnly: true },
  { to: '/brand', label: 'Mi marca', icon: Settings, adminOnly: true },
  { to: '/profile', label: 'Perfil', icon: User },
];

const TITLES: Record<string, string> = {
  '/app': 'Inicio',
  '/products': 'Productos',
  '/products/new': 'Nuevo producto',
  '/stock': 'Stock',
  '/sales': 'Registrar venta',
  '/presupuesto': 'Presupuesto',
  '/presupuesto/list': 'Historial de presupuestos',
  '/sales-list': 'Historial de ventas',
  '/customers': 'Clientes',
  '/caja': 'Caja del día',
  '/caja/list': 'Historial de caja',
  '/caja/register': 'Día faltante',
  '/flex': 'Flex',
  '/statistics': 'Estadísticas',
  '/users': 'Usuarios',
  '/profile': 'Perfil',
};

function resolveTitle(pathname: string, brandName?: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/products/')) return 'Editar producto';
  if (pathname.startsWith('/customers/')) return 'Detalle de cliente';
  if (pathname.startsWith('/caja/edit/')) return 'Editar caja';
  if (pathname.startsWith('/caja/register')) return 'Día faltante';
  return brandName || 'Control+';
}

function roleLabel(role: string | undefined): string {
  if (role === 'super_admin') return 'Super admin';
  if (role === 'owner') return 'Dueño';
  if (role === 'admin') return 'Admin';
  return 'Empleado';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { brand, isBrandAdmin, isSuperAdmin, limits, exitBrand } = useBrand();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const drawerItems = DRAWER_NAV.filter((item) => {
    if (item.to === '/flex' && !limits.flex) return false;
    if (item.to === '/statistics' && !limits.statistics) return false;
    if (
      (item.to === '/presupuesto' || item.to === '/presupuesto/list') &&
      !limits.presupuestos
    ) {
      return false;
    }
    if (item.adminOnly && !isBrandAdmin) return false;
    return true;
  });
  const moreActive = !BOTTOM_NAV.some((item) => {
    if (item.end) return location.pathname === item.to;
    return (
      item.to === location.pathname ||
      (item.to !== '/app' && location.pathname.startsWith(item.to))
    );
  });

  const activeIndex = useMemo(() => {
    if (open || moreActive) return BOTTOM_NAV.length;
    const idx = BOTTOM_NAV.findIndex((item) => {
      if (item.end) return location.pathname === item.to;
      return (
        item.to === location.pathname ||
        (item.to !== '/app' && location.pathname.startsWith(item.to))
      );
    });
    return idx >= 0 ? idx : 0;
  }, [location.pathname, open, moreActive]);

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
            {brand?.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} />
            ) : (
              <span className="sidebar-brand-fallback">
                {(brand?.name || 'C').slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1>{brand?.name || 'Control+'}</h1>
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
            <span style={{ fontSize: 11 }}>{roleLabel(profile?.role)}</span>
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8, color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
              onClick={() => {
                exitBrand();
                navigate('/platform');
              }}
            >
              Panel plataforma
            </button>
          )}
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
            <h2>{resolveTitle(location.pathname, brand?.name)}</h2>
          </div>
          <div className="topbar-email muted">{profile?.email}</div>
        </header>

        <main className="page-content">{children}</main>

        <nav className="bottom-nav" aria-label="Navegación principal">
          <div className="bottom-nav-pill">
            <div className="bottom-nav-track">
              <div
                className="bottom-nav-indicator"
                style={{ transform: `translate3d(${activeIndex * 100}%, 0, 0)` }}
                aria-hidden
              />
              {BOTTOM_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `bottom-nav-link ${isActive && !open ? 'active' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={20} strokeWidth={isActive && !open ? 2.4 : 2} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
              <button
                type="button"
                className={`bottom-nav-link ${moreActive || open ? 'active' : ''}`}
                onClick={() => setOpen(true)}
              >
                <MoreHorizontal size={20} strokeWidth={moreActive || open ? 2.4 : 2} />
                <span>Más</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
