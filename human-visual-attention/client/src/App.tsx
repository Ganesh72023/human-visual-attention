import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { useAuth } from "./context/AuthContext";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { UploadReportPage } from "./pages/UploadReportPage";

function GuardedRoute(props: { children: React.ReactNode; role?: "admin" }) {
  const auth = useAuth();
  if (!auth.user) return <Navigate to="/login" replace />;
  if (props.role && auth.user.role !== props.role) return <Navigate to="/dashboard" replace />;
  return <>{props.children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 md:px-6">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<GuardedRoute children={<DashboardPage />} />} />
          <Route path="/uploads/:id" element={<GuardedRoute children={<UploadReportPage />} />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<GuardedRoute role="admin" children={<AdminPanelPage />} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
