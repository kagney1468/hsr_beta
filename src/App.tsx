/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SellerSignup from './pages/SellerSignup';
import AgentSignup from './pages/AgentSignup';
import SellerDashboard from './pages/SellerDashboard';
import PropertyProfile from './pages/PropertyProfile';
import DocumentUpload from './pages/DocumentUpload';
import FinalDeclaration from './pages/FinalDeclaration';
import SellerOnboarding from './pages/SellerOnboarding';
import ReadinessDashboard from './pages/ReadinessDashboard';
import SellerProfile from './pages/SellerProfile';
import Certificate from './pages/Certificate';
import Help from './pages/Help';
import SellerLayout from './layouts/SellerLayout';
import AgentLayout from './layouts/AgentLayout';
import AgentDashboard from './pages/AgentDashboard';
import AgentBranding from './pages/AgentBranding';
import AgentPropertyDetail from './pages/AgentPropertyDetail';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicPack from './pages/PublicPack';

export default function App() {
  console.log("App rendering");
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup/seller" element={<SellerSignup />} />
          <Route path="/signup/agent" element={<AgentSignup />} />
          
          {/* Public Property Pack - Open access before registration gate */}
          <Route path="/pack/:token" element={<PublicPack />} />
          <Route path="/share/:token" element={<PublicPack />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Seller Journey Routes wrapped in SellerLayout */}
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<Navigate to="/seller/dashboard" replace />} />
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="onboarding" element={<SellerOnboarding />} />
              <Route path="profile" element={<SellerProfile />} />
              <Route path="property" element={<PropertyProfile />} />
              <Route path="documents" element={<DocumentUpload />} />
              <Route path="declaration" element={<FinalDeclaration />} />
              <Route path="readiness" element={<ReadinessDashboard />} />
              <Route path="certificate" element={<Certificate />} />
              <Route path="help" element={<Help />} />
            </Route>

            {/* Agent Routes */}
            <Route path="/agent" element={<AgentLayout />}>
              <Route index element={<Navigate to="/agent/dashboard" replace />} />
              <Route path="dashboard" element={<AgentDashboard />} />
              <Route path="branding" element={<AgentBranding />} />
              <Route path="property/:id" element={<AgentPropertyDetail />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
