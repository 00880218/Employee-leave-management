import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, UserPlus, FileBarChart, X, Mail, User, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';

function EmployeeList() {
  const { apiFetch, showToast, user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [submitting, setSubmitting] = useState(false);

  // Fetch directory list helper
  async function loadDirectory() {
    try {
      setLoading(true);
      const data = await apiFetch('/employees');
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDirectory();
  }, []);

  // Handle new employee registration
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      showToast('Please fill out all fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/employees', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });

      showToast('Employee successfully registered.', 'success');
      
      // Reset form states
      setName('');
      setEmail('');
      setPassword('');
      setRole('employee');
      setShowModal(false);

      // Re-fetch employee list
      await loadDirectory();
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle employee deletion
  const handleDelete = async (id, empName) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently remove employee "${empName}"? This will also remove all their leave requests.`);
    if (!confirmDelete) return;

    try {
      await apiFetch(`/employees/${id}`, {
        method: 'DELETE'
      });
      showToast(`Employee "${empName}" has been removed.`, 'success');
      await loadDirectory();
    } catch (err) {
      showToast(err.message || 'Failed to remove employee.', 'error');
    }
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="employee-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card skeleton" style={{ height: '220px' }}></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      {/* Directory Top Control bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem' }}>Staff Directory & Balances</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>View directory details, system roles, and allocated leave balances.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Add Employee Button */}
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ padding: '0.65rem 1.1rem', fontSize: '0.85rem' }}>
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>

          {/* Search Input bar */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}
              placeholder="Search directory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="glass-panel empty-state">
          <Search size={48} className="empty-state-icon" />
          <h3>No Match Found</h3>
          <p>We couldn't find any employees matching your search query "{searchQuery}".</p>
        </div>
      ) : (
        <div className="employee-grid">
          {filteredEmployees.map((emp) => {
            const stats = emp.leave_stats;
            
            return (
              <div key={emp.id} className="glass-card employee-card glass-card-hover animate-slide-in">
                <div className="emp-card-header">
                  <div className="emp-avatar">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="emp-details">
                    <h4 className="emp-name">{emp.name}</h4>
                    <p className="emp-email">{emp.email}</p>
                    <span className={`role-badge ${emp.role}`} style={{ alignSelf: 'flex-start' }}>
                      {emp.role === 'manager' ? 'Manager' : 'Employee'}
                    </span>
                  </div>
                  {user && user.id !== emp.id && (
                    <button
                      className="btn-secondary btn-danger"
                      style={{
                        marginLeft: 'auto',
                        padding: '0.45rem',
                        minWidth: 'auto',
                        borderRadius: 'var(--radius-sm)'
                      }}
                      onClick={() => handleDelete(emp.id, emp.name)}
                      title={`Remove ${emp.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Approved Requests:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stats.approved_requests} ({stats.total_days_taken} days)</span>
                </div>

                {/* Subgrid of leave balances */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FileBarChart size={12} className="text-accent" />
                    <span>Annual Balance Summary</span>
                  </div>
                  <div className="emp-balances-list">
                    <div className="emp-balance-item">
                      <span className="emp-balance-lbl">Casual</span>
                      <span className="emp-balance-val">
                        {stats.by_type.casual.taken} / {stats.by_type.casual.total}
                      </span>
                    </div>
                    <div className="emp-balance-item">
                      <span className="emp-balance-lbl">Sick</span>
                      <span className="emp-balance-val">
                        {stats.by_type.sick.taken} / {stats.by_type.sick.total}
                      </span>
                    </div>
                    <div className="emp-balance-item">
                      <span className="emp-balance-lbl">Annual</span>
                      <span className="emp-balance-val">
                        {stats.by_type.annual.taken} / {stats.by_type.annual.total}
                      </span>
                    </div>
                    <div className="emp-balance-item">
                      <span className="emp-balance-lbl">Unpaid</span>
                      <span className="emp-balance-val">
                        {stats.by_type.unpaid.taken} Days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Employee Registration Modal */}
      {showModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="animate-slide-in" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '2.25rem',
            background: '#ffffff', // Solid white background
            boxShadow: '0 20px 50px rgba(124, 58, 237, 0.12)',
            border: '1px solid rgba(124, 58, 237, 0.15)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Employee</h3>
              <button className="btn-secondary" style={{ padding: '0.25rem', minWidth: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    placeholder="jane.doe@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Role Definition</label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select
                    className="form-select"
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager / Approver</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeList;
