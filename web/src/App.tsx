import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';
import { CartProvider } from './context/CartContext';
import { AuthGate } from './components/AuthGate';
import { AdminGate } from './components/AdminGate';
import { PlatformGate } from './components/PlatformGate';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { StockPage } from './pages/StockPage';
import { SalesPage } from './pages/SalesPage';
import { SalesListPage } from './pages/SalesListPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CajaPage } from './pages/CajaPage';
import { CajaListPage } from './pages/CajaListPage';
import { CajaEditPage } from './pages/CajaEditPage';
import { CajaRegisterMissingPage } from './pages/CajaRegisterMissingPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminInvoicesPage } from './pages/admin/AdminInvoicesPage';
import { PlatformBrandsPage } from './pages/platform/PlatformBrandsPage';
import { BrandSettingsPage } from './pages/BrandSettingsPage';
import { PresupuestoPage } from './pages/PresupuestoPage';
import { PresupuestoListPage } from './pages/PresupuestoListPage';
import { FlexPage } from './pages/FlexPage';
import { LegalPage } from './pages/LegalPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin/setup" element={<Navigate to="/login" replace />} />

              <Route element={<PlatformGate />}>
                <Route path="/platform" element={<PlatformBrandsPage />} />
              </Route>

              <Route element={<AdminGate />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
              </Route>

              <Route element={<AuthGate />}>
                <Route path="/app" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/new" element={<ProductFormPage />} />
                <Route path="/products/:id" element={<ProductFormPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/presupuesto" element={<PresupuestoPage />} />
                <Route path="/presupuesto/list" element={<PresupuestoListPage />} />
                <Route path="/sales-list" element={<SalesListPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/caja" element={<CajaPage />} />
                <Route path="/caja/list" element={<CajaListPage />} />
                <Route path="/caja/register" element={<CajaRegisterMissingPage />} />
                <Route path="/caja/edit/:date" element={<CajaEditPage />} />
                <Route path="/flex" element={<FlexPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/tiendanube" element={<Navigate to="/app" replace />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/brand" element={<BrandSettingsPage />} />
                <Route path="/users" element={<Navigate to="/admin/users" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </BrandProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
