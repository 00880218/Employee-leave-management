import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, FileText, Sparkles } from 'lucide-react';

function LeaveForm({ onComplete }) {
  const { apiFetch, showToast } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form states
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(0);

  // Calculate duration dynamically
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);

      const diffTime = end.getTime() - start.getTime();
      if (diffTime >= 0) {
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setDuration(diffDays);
      } else {
        setDuration(0);
      }
    } else {
      setDuration(0);
    }
  }, [startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      showToast('Please fill out all fields', 'error');
      return;
    }

    if (duration <= 0) {
      showToast('End date must be on or after start date', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/leaves/request', {
        method: 'POST',
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });

      showToast('Leave request submitted successfully', 'success');
      
      // Reset form and return
      setStartDate('');
      setEndDate('');
      setReason('');
      if (onComplete) onComplete();
    } catch (err) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div className="stat-icon-wrapper" style={{ position: 'relative', top: 0, right: 0, background: 'var(--accent-light)', color: 'var(--accent)' }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem' }}>Request Time Off</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fill in the details below to request a new leave of absence.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Leave Type</label>
          <select
            className="form-select"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            required
          >
            <option value="casual">Casual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="annual">Annual Leave</option>
            <option value="unpaid">Unpaid Leave</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">End Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Dynamic Duration Alert */}
        {duration > 0 && (
          <div style={{ padding: '0.85rem 1rem', background: 'var(--accent-light)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Calculated Duration:</span>
            <strong style={{ color: 'var(--accent)' }}>{duration} {duration === 1 ? 'Calendar Day' : 'Calendar Days'}</strong>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Reason for Absence</label>
          <div style={{ position: 'relative' }}>
            <FileText size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
            <textarea
              className="form-textarea"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              placeholder="Please provide a clear reason for your leave request..."
              rows="4"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onComplete} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LeaveForm;
