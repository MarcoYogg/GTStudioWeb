import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import { ROUTES } from '../constants/routes';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const HomePage = lazy(() => import('../pages/HomePage'));
const ReceiptsPage = lazy(() => import('../pages/ReceiptsPage'));
const SchedulePage = lazy(() => import('../pages/SchedulePage'));
const MembersPage = lazy(() => import('../pages/MembersPage'));
const TicketsPage = lazy(() => import('../pages/TicketsPage'));
const FloorplanPage = lazy(() => import('../pages/FloorplanPage'));

function LoadingRoute() {
  return <div className="loading-screen">載入中…</div>;
}

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <AuthLayout />,
    children: [
      { index: true, element: <Suspense fallback={<LoadingRoute />}><LoginPage /></Suspense> },
    ],
  },
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <Suspense fallback={<LoadingRoute />}><HomePage /></Suspense> },
      { path: ROUTES.RECEIPTS, element: <Suspense fallback={<LoadingRoute />}><ReceiptsPage /></Suspense> },
      { path: ROUTES.SCHEDULE, element: <Suspense fallback={<LoadingRoute />}><SchedulePage /></Suspense> },
      { path: ROUTES.MEMBERS, element: <Suspense fallback={<LoadingRoute />}><MembersPage /></Suspense> },
      { path: ROUTES.TICKETS, element: <Suspense fallback={<LoadingRoute />}><TicketsPage /></Suspense> },
      { path: ROUTES.FLOORPLAN, element: <Suspense fallback={<LoadingRoute />}><FloorplanPage /></Suspense> },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
]);