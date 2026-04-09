import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GoalPage from './pages/GoalPage';
import SchedulePage from './pages/SchedulePage';
import CalendarPage from './pages/CalendarPage';
import { Brain, LogOut, LayoutDashboard, Target, CalendarDays, CalendarIcon, Sparkles } from 'lucide-react';

function NavLink({ to, icon: Icon, children }) {
  return (
    <a
      href={to}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#AAA] hover:text-[#00FFFF] hover:bg-[#00FFFF]/10 transition-all duration-300 group"
    >
      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform group-hover:text-[#00FFFF]" />
      <span className="group-hover:text-[#00FFFF]">{children}</span>
    </a>
  );
}

function Layout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-[#00FFFF]/30 border-t-[#00FFFF] rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-2 border-[#FF00FF]/30 border-t-[#FF00FF] rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Animated Neon Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#00FFFF]/10 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FF00FF]/10 rounded-full blur-[120px] animate-float animation-delay-1000"></div>
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0A0A0F]/90 backdrop-blur-xl border-r border-[#00FFFF]/20 z-50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-[#00FFFF]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#00FFFF] to-[#FF00FF] rounded-xl flex items-center justify-center shadow-[0_0_20px_#00FFFF]">
                <Brain className="w-5 h-5 text-[#0A0A0F]" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Manovyavastha</h1>
                <p className="text-xs text-[#666]">Cognitive Scheduler</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/goal" icon={Target}>Create Goal</NavLink>
            <NavLink to="/schedule" icon={CalendarDays}>Schedule</NavLink>
            <NavLink to="/calendar" icon={CalendarIcon}>Calendar</NavLink>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-[#00FFFF]/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#00FFFF] to-[#FF00FF] rounded-full flex items-center justify-center shadow-md">
                <span className="text-[#0A0A0F] font-bold">{user.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#E8E8E8]">{user.name}</p>
                <p className="text-xs text-[#666]">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/30 text-[#FF3366] hover:bg-[#FF3366]/20 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen p-6">
        <div className="animate-slideIn">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1A1A2E',
              color: '#00FFFF',
              border: '1px solid #00FFFF',
              borderRadius: '12px',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
          <Route path="/goal" element={<Layout><GoalPage /></Layout>} />
          <Route path="/schedule" element={<Layout><SchedulePage /></Layout>} />
          <Route path="/calendar" element={<Layout><CalendarPage /></Layout>} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;