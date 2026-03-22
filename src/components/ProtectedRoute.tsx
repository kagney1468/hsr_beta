import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-[#00e5a0] border-t-transparent rounded-full" />
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If not verified, redirect to a "Verify Email" landing page or show a toast
  // Since we sign them out in Login if not verified, this might be redundant for login,
  // but good for direct access or if session persistence kicks in.
  /* if (!user.email_confirmed_at) {
    return <Navigate to="/login" state={{ error: "Please verify your email address." }} replace />;
  } */

  return <Outlet />;
}
