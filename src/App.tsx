/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SellerDashboard from './pages/SellerDashboard';
import PropertyProfile from './pages/PropertyProfile';
import DocumentUpload from './pages/DocumentUpload';
import FinalDeclaration from './pages/FinalDeclaration';
import ReadinessDashboard from './pages/ReadinessDashboard';
import SellerProfile from './pages/SellerProfile';
import Certificate from './pages/Certificate';
import Help from './pages/Help';
import SellerLayout from './layouts/SellerLayout';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          
          {/* Seller Journey Routes wrapped in SellerLayout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<Navigate to="/seller/dashboard" replace />} />
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="profile" element={<SellerProfile />} />
              <Route path="property" element={<PropertyProfile />} />
              <Route path="documents" element={<DocumentUpload />} />
              <Route path="declaration" element={<FinalDeclaration />} />
              <Route path="readiness" element={<ReadinessDashboard />} />
              <Route path="certificate" element={<Certificate />} />
              <Route path="help" element={<Help />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
