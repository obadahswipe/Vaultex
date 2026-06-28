import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ClientLayout } from '@/components/client/ClientLayout';
import { IBLayout } from '@/components/ib/IBLayout';
import { Toaster } from '@/components/ui/toaster';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { useUIStore } from '@/stores/ui.store';
import { I18nDocumentSync } from '@/lib/i18n/useTranslation';
import { AdminOnly } from '@/components/shared/ProtectedRoute';

// Demo page
const DemoPage         = lazy(() => import('@/pages/Demo'));

// Admin pages
const Login            = lazy(() => import('@/pages/Login'));
const Dashboard        = lazy(() => import('@/pages/Dashboard'));
const Entries          = lazy(() => import('@/pages/Entries'));
const Report           = lazy(() => import('@/pages/Report'));
const Data             = lazy(() => import('@/pages/Data'));
const Opening          = lazy(() => import('@/pages/Opening'));
const Vouchers         = lazy(() => import('@/pages/Vouchers'));
const Currency         = lazy(() => import('@/pages/Currency'));
const Clients              = lazy(() => import('@/pages/Clients'));
const IBManagement         = lazy(() => import('@/pages/IBManagement'));
const Operations           = lazy(() => import('@/pages/Operations'));
const Reconciliation       = lazy(() => import('@/pages/Reconciliation'));
const Treasury             = lazy(() => import('@/pages/Treasury'));
const AgingReport          = lazy(() => import('@/pages/AgingReport'));
const OperationsAnalytics  = lazy(() => import('@/pages/OperationsAnalytics'));
const Payments             = lazy(() => import('@/pages/Payments'));
const Journals             = lazy(() => import('@/pages/Journals'));
const Trades               = lazy(() => import('@/pages/Trades'));
const Reports              = lazy(() => import('@/pages/Reports'));
const IBCommissions        = lazy(() => import('@/pages/IBCommissions'));
const EOD                  = lazy(() => import('@/pages/EOD'));
const ChartOfAccounts      = lazy(() => import('@/pages/ChartOfAccounts'));
const Users                = lazy(() => import('@/pages/Users'));
const Settings             = lazy(() => import('@/pages/Settings'));
const GeneralSettings      = lazy(() => import('@/pages/settings/GeneralSettings'));
const SymbolSettings       = lazy(() => import('@/pages/settings/SymbolSettings'));
const GatewaySettings      = lazy(() => import('@/pages/settings/GatewaySettings'));
const OperationsSettings   = lazy(() => import('@/pages/settings/OperationsSettings'));
const Profile              = lazy(() => import('@/pages/Profile'));

// New platform modules
const Branches             = lazy(() => import('@/pages/Branches'));
const Wallets              = lazy(() => import('@/pages/Wallets'));
const CRM                  = lazy(() => import('@/pages/CRM'));
const HR                   = lazy(() => import('@/pages/HR'));
const Assets               = lazy(() => import('@/pages/Assets'));
const Ownership            = lazy(() => import('@/pages/Ownership'));
const Risk                 = lazy(() => import('@/pages/Risk'));
const Workflows            = lazy(() => import('@/pages/Workflows'));

// IB portal pages
const IBLogin           = lazy(() => import('@/pages/ib/Login'));
const IBPortalDashboard = lazy(() => import('@/pages/ib/Dashboard'));
const IBPortalComms     = lazy(() => import('@/pages/ib/Commissions'));
const IBPortalClients   = lazy(() => import('@/pages/ib/Clients'));
const IBPortalProfile   = lazy(() => import('@/pages/ib/Profile'));

// Client portal pages
const ClientLogin        = lazy(() => import('@/pages/client/Login'));
const ClientDashboard    = lazy(() => import('@/pages/client/Dashboard'));
const ClientTrades       = lazy(() => import('@/pages/client/Trades'));
const ClientTransactions = lazy(() => import('@/pages/client/Transactions'));
const ClientStatements   = lazy(() => import('@/pages/client/Statements'));
const ClientProfile      = lazy(() => import('@/pages/client/Profile'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function ThemeInitializer() {
  const { theme } = useUIStore();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInitializer />
        <I18nDocumentSync />
<Suspense fallback={<div className="flex h-screen items-center justify-center"><PageLoader /></div>}>
          <Routes>
            {/* ── Demo access page ─────────────────────────────────────────── */}
            <Route path="/demo" element={<DemoPage />} />

            {/* ── Admin routes ─────────────────────────────────────────────── */}
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entries" element={<Entries />} />
              <Route path="/report" element={<Report />} />
              <Route path="/data" element={<Data />} />
              <Route path="/opening" element={<Opening />} />
              <Route path="/vouchers" element={<Vouchers />} />
              <Route path="/currency" element={<Currency />} />
              <Route path="/clients"        element={<Clients />} />
              <Route path="/ib-mgmt"        element={<IBManagement />} />
              <Route path="/operations"     element={<Operations />} />
              <Route path="/reconciliation" element={<Reconciliation />} />
              <Route path="/treasury"       element={<Treasury />} />
              <Route path="/aging"          element={<AgingReport />} />
              <Route path="/ops-analytics"  element={<OperationsAnalytics />} />
              <Route path="/payments"       element={<Payments />} />
              <Route path="/journals"       element={<Journals />} />
              <Route path="/trades"         element={<Trades />} />
              <Route path="/reports"        element={<Reports />} />
              <Route path="/ib-commissions" element={<IBCommissions />} />
              <Route path="/eod"            element={<AdminOnly><EOD /></AdminOnly>} />
              <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="/users"          element={<AdminOnly><Users /></AdminOnly>} />
              <Route path="/profile"        element={<Profile />} />
              {/* New platform modules */}
              <Route path="/branches"   element={<Branches />} />
              <Route path="/wallets"    element={<Wallets />} />
              <Route path="/crm"        element={<CRM />} />
              <Route path="/hr"         element={<HR />} />
              <Route path="/assets"     element={<Assets />} />
              <Route path="/ownership"  element={<Ownership />} />
              <Route path="/risk"       element={<Risk />} />
              <Route path="/workflows"  element={<Workflows />} />
              <Route path="/settings"       element={<AdminOnly><Settings /></AdminOnly>}>
                <Route index element={<Navigate to="/settings/general" replace />} />
                <Route path="general"    element={<GeneralSettings />} />
                <Route path="symbols"    element={<SymbolSettings />} />
                <Route path="gateways"   element={<GatewaySettings />} />
                <Route path="operations" element={<OperationsSettings />} />
              </Route>
            </Route>

            {/* ── IB portal routes ─────────────────────────────────────────── */}
            <Route path="/ib/login" element={<IBLogin />} />
            <Route path="/ib" element={<IBLayout />}>
              <Route index element={<Navigate to="/ib/dashboard" replace />} />
              <Route path="dashboard"   element={<IBPortalDashboard />} />
              <Route path="commissions" element={<IBPortalComms />} />
              <Route path="clients"     element={<IBPortalClients />} />
              <Route path="profile"     element={<IBPortalProfile />} />
            </Route>

            {/* ── Client portal routes ──────────────────────────────────────── */}
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<Navigate to="/client/dashboard" replace />} />
              <Route path="dashboard"    element={<ClientDashboard />} />
              <Route path="trades"       element={<ClientTrades />} />
              <Route path="transactions" element={<ClientTransactions />} />
              <Route path="statements"   element={<ClientStatements />} />
              <Route path="profile"      element={<ClientProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/demo" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
