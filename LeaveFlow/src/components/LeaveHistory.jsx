import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, CalendarRange } from 'lucide-react';

function LeaveHistory() {
  const { apiFetch } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const data = await apiFetch('/leaves/my-leaves');
        setLeaves(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="glass-card skeleton" style={{ height: '300px' }}></div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem' }}>Personal Leave Record</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>A complete history of all your submitted leave applications.</p>
        </div>
      </div>

      {leaves.length === 0 ? (
        <div className="empty-state">
          <CalendarRange size={48} className="empty-state-icon" />
          <h3>No Leave Applications Found</h3>
          <p>You haven't requested any time off yet. When you do, your history will show up here.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Duration</th>
                <th>Dates Requested</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Reviewed By</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.id}>
                  <td>
                    <span className={`request-type-tag ${leave.leave_type}`}>
                      {leave.leave_type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {leave.duration} {leave.duration === 1 ? 'Day' : 'Days'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </div>
                  </td>
                  <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>
                    {leave.reason}
                  </td>
                  <td>
                    <span className={`status-badge ${leave.status}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {leave.status !== 'pending' ? (
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {leave.reviewer_name || `Manager #${leave.reviewed_by}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {leave.reviewed_at ? formatDate(leave.reviewed_at) : ''}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LeaveHistory;
