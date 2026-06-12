import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarCheck, 
  CalendarClock, 
  CalendarX, 
  Users, 
  UserMinus, 
  ChevronRight, 
  Plus, 
  UserCheck 
} from 'lucide-react';

function DashboardStats({ onNavigate, isManager }) {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        if (isManager) {
          // Load manager stats
          const managerStats = await apiFetch('/leaves/manager-stats');
          setStats(managerStats);
          
          // Load top 3 recent requests
          const allRequests = await apiFetch('/leaves/all');
          setRecentLeaves(allRequests.slice(0, 3));
        } else {
          // Load employee stats
          const empStats = await apiFetch('/leaves/stats');
          setStats(empStats);

          // Load personal history (top 3)
          const myHistory = await apiFetch('/leaves/my-leaves');
          setRecentLeaves(myHistory.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [isManager]);

  if (loading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card skeleton" style={{ height: '140px' }}></div>
        ))}
      </div>
    );
  }

  // Circular progress stroke calculation
  const circleRadius = 36;
  const strokeCircumference = 2 * Math.PI * circleRadius; // ~226.2

  const getStrokeOffset = (taken, total) => {
    const safeTaken = Math.min(taken, total);
    const fraction = safeTaken / total;
    return strokeCircumference - fraction * strokeCircumference;
  };

  if (isManager) {
    return (
      <div className="animate-fade-in">
        {/* Manager Stats Cards */}
        <div className="stats-grid">
          <div className="glass-card stat-card approved glass-card-hover">
            <div className="stat-icon-wrapper">
              <Users size={20} />
            </div>
            <p className="stat-label">Total Staff</p>
            <h2 className="stat-value">{stats?.total_employees || 0}</h2>
            <div className="stat-footer">Active employees registered</div>
          </div>

          <div className="glass-card stat-card pending glass-card-hover">
            <div className="stat-icon-wrapper">
              <CalendarClock size={20} />
            </div>
            <p className="stat-label">Pending Reviews</p>
            <h2 className="stat-value">{stats?.pending || 0}</h2>
            <div className="stat-footer">Awaiting manager review</div>
          </div>

          <div className="glass-card stat-card approved glass-card-hover">
            <div className="stat-icon-wrapper">
              <UserMinus size={20} />
            </div>
            <p className="stat-label">Out Today</p>
            <h2 className="stat-value">{stats?.employees_on_leave_today?.length || 0}</h2>
            <div className="stat-footer">Staff currently on leave</div>
          </div>
        </div>

        {/* Manager Dashboard Details */}
        <div className="dashboard-grid">
          {/* Active Leave Queue */}
          <div className="glass-card chart-card">
            <div className="chart-header">
              <h3 className="ring-title">Currently on Leave Today</h3>
              {stats?.employees_on_leave_today?.length > 0 && (
                <span className="status-badge approved">Active</span>
              )}
            </div>
            
            {stats?.employees_on_leave_today?.length === 0 ? (
              <div className="empty-state">
                <UserCheck size={36} className="empty-state-icon" />
                <p>All employees are present today.</p>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', marginTop: 0 }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.employees_on_leave_today?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.employee_name}</td>
                        <td>
                          <span className={`request-type-tag ${item.leave_type}`}>
                            {item.leave_type}
                          </span>
                        </td>
                        <td>{new Date(item.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>{new Date(item.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 className="ring-title">Quick Tasks</h3>
            
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => onNavigate('approvals')}>
              <CalendarClock size={18} />
              <span>Go to Approval Queue</span>
              <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
            </button>

            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => onNavigate('employees')}>
              <Users size={18} />
              <span>Staff Directory</span>
              <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
            </button>

            <div className="glass-card-hover" style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Database Engine</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-approved)', animation: 'pulse-ring 2s infinite' }}></div>
                {stats?.isPgConnected ? 'PostgreSQL (Prod)' : 'SQLite/JSON Fallback'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Employee View
  const leaveTypesArr = [
    { type: 'casual', label: 'Casual', color: 'var(--color-casual)', gradientId: 'gradCasual' },
    { type: 'sick', label: 'Sick', color: 'var(--color-sick)', gradientId: 'gradSick' },
    { type: 'annual', label: 'Annual', color: 'var(--color-annual)', gradientId: 'gradAnnual' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Employee Stats Grid */}
      <div className="stats-grid">
        <div className="glass-card stat-card approved glass-card-hover">
          <div className="stat-icon-wrapper">
            <CalendarCheck size={20} />
          </div>
          <p className="stat-label">Approved Days</p>
          <h2 className="stat-value">{stats?.total_days_approved || 0}</h2>
          <div className="stat-footer">Total leave days approved</div>
        </div>

        <div className="glass-card stat-card pending glass-card-hover">
          <div className="stat-icon-wrapper">
            <CalendarClock size={20} />
          </div>
          <p className="stat-label">Pending Requests</p>
          <h2 className="stat-value">{stats?.pending || 0}</h2>
          <div className="stat-footer">Requests awaiting review</div>
        </div>

        <div className="glass-card stat-card rejected glass-card-hover">
          <div className="stat-icon-wrapper">
            <CalendarX size={20} />
          </div>
          <p className="stat-label">Rejected Requests</p>
          <h2 className="stat-value">{stats?.rejected || 0}</h2>
          <div className="stat-footer">Requests denied by manager</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Leave Balances Charts (Rings) */}
        <div className="glass-card chart-card">
          <div className="chart-header">
            <h3 className="ring-title">Annual Leave Balances</h3>
            <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => onNavigate('apply')}>
              <Plus size={16} />
              <span>Apply Leave</span>
            </button>
          </div>

          <div className="progress-rings-container">
            {leaveTypesArr.map((item) => {
              const typeData = stats?.by_type?.[item.type] || { taken: 0, total: 10 };
              const remaining = typeData.total - typeData.taken;
              
              return (
                <div key={item.type} className="progress-ring-item">
                  <div className="ring-svg-wrapper">
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <defs>
                        <linearGradient id={item.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={item.color} />
                          <stop offset="100%" stopColor="#fff" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      {/* Track */}
                      <circle
                        cx="45"
                        cy="45"
                        r={circleRadius}
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth="6"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="45"
                        cy="45"
                        r={circleRadius}
                        fill="transparent"
                        stroke={`url(#${item.gradientId})`}
                        strokeWidth="6"
                        strokeDasharray={strokeCircumference}
                        strokeDashoffset={getStrokeOffset(typeData.taken, typeData.total)}
                        strokeLinecap="round"
                        transform="rotate(-90 45 45)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                      />
                    </svg>
                    <div className="ring-text">
                      <span className="ring-text-num">{remaining}</span>
                      <span className="ring-text-label">Days</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span className="ring-title">{item.label}</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {typeData.taken} of {typeData.total} taken
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Leave Requests Summary */}
        <div className="glass-card">
          <div className="chart-header">
            <h3 className="ring-title">Recent Requests</h3>
            <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => onNavigate('history')}>
              View All
            </button>
          </div>

          {recentLeaves.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <p>You haven't requested any leave yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentLeaves.map((leave) => (
                <div key={leave.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span className={`request-type-tag ${leave.leave_type}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                      {leave.leave_type}
                    </span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      {leave.duration} {leave.duration === 1 ? 'day' : 'days'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {new Date(leave.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(leave.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`status-badge ${leave.status}`} style={{ fontSize: '0.7rem' }}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardStats;
