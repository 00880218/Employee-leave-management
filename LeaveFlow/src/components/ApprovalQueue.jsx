import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, Calendar, ClipboardCheck } from 'lucide-react';

function ApprovalQueue() {
  const { apiFetch, showToast } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  async function fetchPendingRequests() {
    try {
      setLoading(true);
      const data = await apiFetch('/leaves/all?status=pending');
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleReview = async (id, status) => {
    setProcessingId(id);
    try {
      await apiFetch(`/leaves/review/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      showToast(`Leave request ${status} successfully`, 'success');
      
      // Update local list
      setRequests(prev => prev.filter(req => req.id !== id));
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

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
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem' }}>Pending Leave Approvals</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review and respond to active time-off requests submitted by employees.</p>
      </div>

      {requests.length === 0 ? (
        <div className="glass-panel empty-state">
          <ClipboardCheck size={48} className="empty-state-icon" style={{ color: 'var(--color-approved)' }} />
          <h3>All Caught Up!</h3>
          <p>There are no pending leave requests awaiting approval at this time.</p>
        </div>
      ) : (
        <div className="approval-queue">
          {requests.map((req) => (
            <div key={req.id} className="glass-card request-card animate-slide-in">
              <div className="request-card-info">
                <div className="request-card-header">
                  <span className="requester-name">{req.employee_name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({req.employee_email})</span>
                  <span className={`request-type-tag ${req.leave_type}`}>
                    {req.leave_type}
                  </span>
                </div>

                <div className="request-date-range">
                  <Calendar size={15} className="text-accent" />
                  <span>
                    {formatDate(req.start_date)} - {formatDate(req.end_date)}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {req.duration} {req.duration === 1 ? 'Calendar Day' : 'Calendar Days'}
                  </span>
                </div>

                <div className="request-reason">
                  <strong>Reason:</strong> {req.reason}
                </div>
              </div>

              <div className="request-actions">
                <button
                  className="btn-secondary btn-danger"
                  onClick={() => handleReview(req.id, 'rejected')}
                  disabled={processingId === req.id}
                >
                  <X size={16} />
                  <span>Reject</span>
                </button>
                <button
                  className="btn-primary btn-success"
                  onClick={() => handleReview(req.id, 'approved')}
                  disabled={processingId === req.id}
                >
                  <Check size={16} />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApprovalQueue;
