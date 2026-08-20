import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import CompanyAdminLayout from './layouts/CompanyAdminLayout';
import ProjectTeamLayout from './layouts/ProjectTeamLayout';
import ClientPortalLayout from './layouts/ClientPortalLayout';
import { useAuth } from './context/AuthContext';
import ComingSoon from './components/ComingSoon';
import { unlockAudio } from './utils/notificationSound';
import { useEffect } from 'react';

import LandingPage from './pages/LandingPage';

// Import Real Pages
import SuperAdminDashboard from './pages/super-admin/Dashboard';
import SuperAdminCompanies from './pages/super-admin/Companies';
import SuperAdminSubscriptions from './pages/super-admin/Subscriptions';
import SuperAdminRevenue from './pages/super-admin/Revenue';
import SuperAdminTickets from './pages/super-admin/SupportTickets';
import SuperAdminSettings from './pages/super-admin/Settings';
import SuperAdminPlans from './pages/super-admin/Plans';
import SuperAdminUsers from './pages/super-admin/GlobalUsers';
import SuperAdminLogs from './pages/super-admin/SystemLogs';

import CompanyAdminDashboard from './pages/company-admin/Dashboard';
import Projects from './pages/company-admin/Projects';
import ProjectDetails from './pages/company-admin/ProjectDetails';
import CreateJob from './pages/company-admin/CreateJob';
import Team from './pages/company-admin/Team';
import Schedule from './pages/company-admin/Schedule';
import Photos from './pages/company-admin/Photos';
import Drawings from './pages/company-admin/Drawings';
import Issues from './pages/company-admin/Issues';
import Estimates from './pages/company-admin/Estimates';
import Chat from './pages/company-admin/Chat';
import Settings from './pages/company-admin/Settings';
import Tasks from './pages/company-admin/Tasks';
import Timesheets from './pages/company-admin/Timesheets';
import GPS from './pages/company-admin/GPS';
import DailyLogs from './pages/company-admin/DailyLogs';
import DailyLogReports from './pages/company-admin/DailyLogReports';
import Invoices from './pages/company-admin/Invoices';
import InvoiceDetail from './pages/company-admin/InvoiceDetail';
import PurchaseOrders from './pages/company-admin/PurchaseOrders';
import PurchaseOrderForm from './pages/company-admin/PurchaseOrderForm';
import PurchaseOrderDetail from './pages/company-admin/PurchaseOrderDetail';
import Clients from './pages/company-admin/Clients';
import Reports from './pages/company-admin/Reports';
import AttendanceReports from './pages/company-admin/AttendanceReports';
import Payroll from './pages/company-admin/Payroll';
import Equipment from './pages/company-admin/Equipment';
import WorkerPunch from './pages/company-admin/WorkerPunch';
import CrewClock from './pages/company-admin/CrewClock';
import TradeManagement from './pages/company-admin/TradeManagement';
import ProjectIntelligence from './pages/company-admin/ProjectIntelligence';
import Deficiencies from './pages/jobs/Deficiencies';
import JobDetails from './pages/jobs/JobDetails';

// RFI Module
import RFIDashboard from './pages/company-admin/RFIDashboard';
import RFIList from './pages/company-admin/RFIList';
import CreateRFI from './pages/company-admin/CreateRFI';
import RFIDetail from './pages/company-admin/RFIDetail';


import ProjectTeamHome from './pages/project-team/Home';
import UploadPage from './pages/project-team/Upload';
import TasksPage from './pages/project-team/Tasks';
import ProjectTeamChat from './pages/project-team/Chat';
import ProjectTeamProfile from './pages/project-team/Profile';
import PublicBidSubmission from './pages/PublicBidSubmission';

import ClientPortalDashboard from './pages/client-portal/Dashboard';
import ClientTimeline from './pages/client-portal/Timeline';
import ClientPhotos from './pages/client-portal/Photos';
import ClientApprovals from './pages/client-portal/Approvals';
import ClientInvoices from './pages/client-portal/Invoices';
import ClientMessages from './pages/client-portal/Messages';
import ClientDailyLogs from './pages/client-portal/DailyLogs';
import ClientWorkProgress from './pages/client-portal/WorkProgress';


const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-black tracking-widest uppercase animate-pulse">Constructing...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  useEffect(() => {
    const handleFirstClick = () => {
      unlockAudio();
      window.removeEventListener('mousedown', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
    };
    window.addEventListener('mousedown', handleFirstClick);
    window.addEventListener('keydown', handleFirstClick);
    
    return () => {
      window.removeEventListener('mousedown', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
    };
  }, []);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/signup" element={<Navigate to="/register" />} />
      <Route path="/tasks" element={<Navigate to="/company-admin/tasks" />} />

      {/* Public Pages */}
      <Route path="/submit-bid/:drawingId" element={<PublicBidSubmission />} />
      <Route path="/public/purchase-order/:id" element={<PurchaseOrderDetail isPublic={true} />} />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="companies" element={<SuperAdminCompanies />} />
        <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
        <Route path="revenue" element={<SuperAdminRevenue />} />
        <Route path="tickets" element={<SuperAdminTickets />} />
        <Route path="plans" element={<SuperAdminPlans />} />
        <Route path="users" element={<SuperAdminUsers />} />
        <Route path="logs" element={<SuperAdminLogs />} />
        <Route path="settings" element={<SuperAdminSettings />} />
        <Route path="*" element={<ComingSoon title="Super Admin Module" />} />
      </Route>

      {/* Unified Staff Routes (Company Admin Layout) */}
      <Route
        path="/company-admin"
        element={
          <ProtectedRoute allowedRoles={['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR']}>
            <CompanyAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CompanyAdminDashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId" element={<ProjectDetails />} />
        <Route path="projects/:projectId/jobs/new" element={<CreateJob />} />
        <Route path="projects/:projectId/jobs/:jobId/edit" element={<CreateJob />} />
        <Route path="projects/:projectId/jobs/:jobId/deficiencies" element={<Deficiencies />} />
        <Route path="projects/:projectId/jobs/:jobId" element={<JobDetails />} />
        <Route path="team" element={<Team />} />

        <Route path="schedule" element={<Schedule />} />
        <Route path="photos" element={<Photos />} />
        <Route path="drawings" element={<Drawings />} />
        <Route path="issues" element={<Issues />} />
        <Route path="estimates" element={<Estimates />} />
        <Route path="chat" element={<Chat />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="timesheets" element={<Timesheets />} />
        <Route path="gps" element={<GPS />} />
        <Route path="daily-logs" element={<DailyLogs />} />
        <Route path="daily-log-reports" element={<DailyLogReports />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
        <Route path="purchase-orders/edit/:id" element={<PurchaseOrderForm />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="clients" element={<Clients />} />
        <Route path="reports" element={<Reports />} />
        <Route path="attendance-reports" element={<AttendanceReports />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="equipment" element={<Equipment />} />
        <Route path="clock" element={<WorkerPunch />} />
        <Route path="crew-clock" element={<CrewClock />} />
        <Route path="trades" element={<TradeManagement />} />
        <Route path="project-intel" element={<ProjectIntelligence />} />
        <Route path="settings" element={<Settings />} />

        {/* RFI Routes */}
        <Route path="rfi" element={<RFIDashboard />} />
        <Route path="rfi/list" element={<RFIList />} />
        <Route path="rfi/create" element={<CreateRFI />} />
        <Route path="rfi/:id" element={<RFIDetail />} />

        <Route path="*" element={<ComingSoon title="Module Not Found" />} />
      </Route>

      {/* Project Team Routes - Deprecated/Merged into Company Admin
      <Route
        path="/project-team"
        element={
          <ProtectedRoute allowedRoles={['project_manager', 'foreman', 'worker']}>
            <ProjectTeamLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProjectTeamHome />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="chat" element={<ProjectTeamChat />} />
        <Route path="profile" element={<ProjectTeamProfile />} />
        <Route path="files" element={<ComingSoon title="Project Files" description="Access important project documents on the go." />} />
      </Route>
      */}

      {/* Client Portal Routes */}
      <Route
        path="/client-portal"
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <ClientPortalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientPortalDashboard />} />
        <Route path="progress/:projectId" element={<ClientWorkProgress />} />
        <Route path="projects" element={<Projects />} />
        <Route path="photos" element={<ClientPhotos />} />
        <Route path="drawings" element={<Drawings />} />
        <Route path="daily-logs" element={<ClientDailyLogs />} />
        <Route path="approvals" element={<ClientApprovals />} />
        <Route path="invoices" element={<ClientInvoices />} />
        <Route path="messages" element={<Chat />} />
        {/* Client RFI Routes */}
        <Route path="rfi" element={<RFIDashboard />} />
        <Route path="rfi/list" element={<RFIList />} />
        <Route path="rfi/:id" element={<RFIDetail />} />
        <Route path="profile" element={<ProjectTeamProfile />} />
      </Route>

    </Routes>
    </>
  );
}

export default App;
