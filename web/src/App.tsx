import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AuthGate } from './components/AuthGate';
import { AdminGate } from './components/AdminGate';
import { LoginPage } from './pages/LoginPage';
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
import { StatisticsPage } from './pages/StatisticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminSetupPage } from './pages/admin/AdminSetupPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminInvoicesPage } from './pages/admin/AdminInvoicesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/setup" element={<AdminSetupPage />} />

            <Route element={<AdminGate />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>

            <Route element={<AuthGate />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/new" element={<ProductFormPage />} />
              <Route path="/products/:id" element={<ProductFormPage />} />
              <Route path="/stock" element={<StockPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales-list" element={<SalesListPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/caja" element={<CajaPage />} />
              <Route path="/caja/list" element={<CajaListPage />} />
              <Route path="/caja/edit/:date" element={<CajaEditPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/users" element={<Navigate to="/admin/users" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
