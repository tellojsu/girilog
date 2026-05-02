import type { RouteObject } from 'react-router-dom';
import NotFound from '../pages/NotFound';
import HomePage from '../pages/home/page';
import AuthPage from '../pages/auth/page';
import Dashboard from '../pages/dashboard/page';
import InvoiceList from '../pages/invoices/list/page';
import InvoiceCreator from '../pages/invoices/creator/page';
import InvoiceDetail from '../pages/invoices/detail/page';
import SettingsPage from '../pages/settings/page';
import ClientsPage from '../pages/clients/page';
import AuthGuard from '../components/feature/AuthGuard';
import DatabaseSetup from '../pages/DatabaseSetup';

const routes: RouteObject[] = [
  {
    path: '/setup',
    element: <DatabaseSetup />,
  },
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <AuthPage />,
  },
  {
    path: '/dashboard',
    element: <AuthGuard><Dashboard /></AuthGuard>,
  },
  {
    path: '/invoices',
    element: <AuthGuard><InvoiceList /></AuthGuard>,
  },
  {
    path: '/invoices/new',
    element: <AuthGuard><InvoiceCreator /></AuthGuard>,
  },
  {
    path: '/invoices/:id',
    element: <AuthGuard><InvoiceDetail /></AuthGuard>,
  },
  {
    path: '/invoices/:id/edit',
    element: <AuthGuard><InvoiceCreator /></AuthGuard>,
  },
  {
    path: '/clients',
    element: <AuthGuard><ClientsPage /></AuthGuard>,
  },
  {
    path: '/settings',
    element: <AuthGuard><SettingsPage /></AuthGuard>,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
