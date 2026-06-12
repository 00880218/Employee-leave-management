import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import DashboardStats from './components/DashboardStats';
import LeaveForm from './components/LeaveForm';
import LeaveHistory from './components/LeaveHistory';
import ApprovalQueue from './components/ApprovalQueue';
import EmployeeList from './components/EmployeeList';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  CheckSquare, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  User, 
  Briefcase 
} from 'lucide-react';

function App() {
  const { user, loading, notification, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If role is manager, let the default tab be dashboard, otherwise dashboard for employees too.
  useEffect(() => {
    if (user) {
      setActiveTab('dashboard');
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '1rem',
      }}>
        <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%' }}></div>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Initializing LeaveFlow...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        {notification && (
          <div className={`toast-notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </>
    );
  }

  const isManager = user.role === 'manager';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['employee', 'manager'] },
    { id: 'apply', label: 'Apply Leave', icon: PlusCircle, roles: ['employee'] },
    { id: 'history', label: 'My Leave History', icon: History, roles: ['employee'] },
    { id: 'approvals', label: 'Approval Queue', icon: CheckSquare, roles: ['manager'] },
    { id: 'employees', label: 'Employee Directory', icon: Users, roles: ['manager'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header for Mobile */}
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="logo-text">Leave<span>Flow</span></div>
        <div className="user-avatar-small">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`sidebar glass-panel ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-text">Leave<span>Flow</span></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="user-profile-card">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <h4 className="user-name">{user.name}</h4>
            <p className="user-email">{user.email}</p>
            <span className={`role-badge ${user.role}`}>
              {user.role === 'manager' ? 'Manager' : 'Employee'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={logout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top bar for desktop */}
        <div className="desktop-topbar">
          <div>
            <h1 className="page-title">
              {activeTab === 'dashboard' && 'System Dashboard'}
              {activeTab === 'apply' && 'New Leave Request'}
              {activeTab === 'history' && 'Your Leave History'}
              {activeTab === 'approvals' && 'Review Approvals'}
              {activeTab === 'employees' && 'Employee Directory'}
            </h1>
            <p className="page-subtitle">Welcome back, {user.name.split(' ')[0]}. Here is your status.</p>
          </div>
          
          <div className="profile-capsule glass-card">
            <Briefcase size={16} className="text-accent" />
            <span>ID: #{user.id}</span>
            <div className="divider"></div>
            <User size={16} className="text-accent" />
            <span>{user.name}</span>
          </div>
        </div>

        {/* Tab Content Router */}
        <div className="tab-content-container animate-fade-in">
          {activeTab === 'dashboard' && (
            <DashboardStats 
              onNavigate={setActiveTab} 
              isManager={isManager} 
            />
          )}
          {activeTab === 'apply' && (
            <LeaveForm onComplete={() => setActiveTab('dashboard')} />
          )}
          {activeTab === 'history' && (
            <LeaveHistory />
          )}
          {activeTab === 'approvals' && isManager && (
            <ApprovalQueue />
          )}
          {activeTab === 'employees' && isManager && (
            <EmployeeList />
          )}
        </div>
      </main>

      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}
    </div>
  );
}

export default App;
