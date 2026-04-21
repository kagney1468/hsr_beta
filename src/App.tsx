/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Login from './pages/Login';
import SellerSignup from './pages/SellerSignup';
import AgentSignup from './pages/AgentSignup';
import Welcome from './pages/Welcome';
import AddProperty from './pages/AddProperty';
import SellerDashboard from './pages/SellerDashboard';
import PropertyProfile from './pages/PropertyProfile';
import DocumentUpload from './pages/DocumentUpload';
import FinalDeclaration from './pages/FinalDeclaration';
import ReadinessDashboard from './pages/ReadinessDashboard';
import SellerProfile from './pages/SellerProfile';
import Certificate from './pages/Certificate';
import Help from './pages/Help';
import SellerLayout from './layouts/SellerLayout';
import AgentLayout from './layouts/AgentLayout';
import BuyerLayout from './layouts/BuyerLayout';
import BuyerSignup from './pages/BuyerSignup';
import BuyerDashboard from './pages/BuyerDashboard';
import BuyerProfile from './pages/BuyerProfile';
import BuyerCompare from './pages/BuyerCompare';
import AgentDashboard from './pages/AgentDashboard';
import AgentBranding from './pages/AgentBranding';
import AgentPropertyDetail from './pages/AgentPropertyDetail';
import AgentOnboarding from './pages/AgentOnboarding';
import AgentProfile from './pages/AgentProfile';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicPack from './pages/PublicPack';
import AuthCallback from './pages/AuthCallback';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import CookieBanner from './components/CookieBanner';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CookieBanner />
        <SpeedInsights />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup/seller" element={<SellerSignup />} />
          <Route path="/signup/agent" element={<AgentSignup />} />
          <Route path="/signup/buyer" element={<BuyerSignup />} />

          {/* Legal pages — public, no auth */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />

          {/* Public Property Pack */}
          <Route path="/pack/:token" element={<PublicPack />} />
          <Route path="/share/:token" element={<PublicPack />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* First-time seller welcome — full-page, no sidebar */}
            <Route path="/welcome" element={<Welcome />} />
            {/* Agent onboarding — Google OAuth agents who haven't set up firm details yet */}
            <Route path="/agent/onboarding" element={<AgentOnboarding />} />
            <Route path="/add-property" element={<AddProperty />} />

            {/* Seller Journey */}
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

            {/* Buyer Routes */}
            <Route path="/buyer" element={<BuyerLayout />}>
              <Route index element={<Navigate to="/buyer/dashboard" replace />} />
              <Route path="dashboard" element={<BuyerDashboard />} />
              <Route path="profile" element={<BuyerProfile />} />
              <Route path="compare" element={<BuyerCompare />} />
            </Route>

            {/* Agent Routes */}
            <Route path="/agent" element={<AgentLayout />}>
              <Route index element={<Navigate to="/agent/dashboard" replace />} />
              <Route path="dashboard" element={<AgentDashboard />} />
              <Route path="branding" element={<AgentBranding />} />
              <Route path="profile" element={<AgentProfile />} />
              <Route path="property/:id" element={<AgentPropertyDetail />} />
            </Route>
          </Route>

          {/* Legacy redirects */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
