import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import NewOrderPage from './pages/NewOrderPage'
import OrderDetailPage from './pages/OrderDetailPage'
import FinishersPage from './pages/FinishersPage'
import NewFinisherPage from './pages/NewFinisherPage'
import FinisherDetailPage from './pages/FinisherDetailPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/new" element={<NewOrderPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/orders/:id/edit" element={<NewOrderPage />} />
              <Route path="/finishers" element={<FinishersPage />} />
              <Route path="/finishers/new" element={<NewFinisherPage />} />
              <Route path="/finishers/:id" element={<FinisherDetailPage />} />
              <Route path="/finishers/:id/edit" element={<NewFinisherPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
          },
          success: {
            style: { background: '#f0f5f2', color: '#2D2D2D', border: '1px solid #b9d1c1' },
          },
          error: {
            style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
          },
        }}
      />
    </AuthProvider>
  )
}

export default App
