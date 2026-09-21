import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import AppLayout from './layouts/AppLayout';
import ActivityPage from './pages/ActivityPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import CustomersPage from './pages/CustomersPage';
import DashboardPage from './pages/DashboardPage';
import DebtsPage from './pages/DebtsPage';
import LoginPage from './pages/LoginPage';
import NewSalePage from './pages/NewSalePage';
import NotFoundPage from './pages/NotFoundPage';
import PaymentsPage from './pages/PaymentsPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import SalesPage from './pages/SalesPage';
import UsersPage from './pages/UsersPage';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/sales/new'} replace />;
}

const adminOnly = (page: JSX.Element) => <ProtectedRoute roles={['admin']}>{page}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={adminOnly(<DashboardPage />)} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/new" element={<NewSalePage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerProfilePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports" element={adminOnly(<ReportsPage />)} />
        <Route path="users" element={adminOnly(<UsersPage />)} />
        <Route path="activity" element={adminOnly(<ActivityPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
