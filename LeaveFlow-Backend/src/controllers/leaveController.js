const db = require('../services/db');

// Max allocations for leave types
const LEAVE_LIMITS = {
  casual: 12,
  sick: 15,
  annual: 20,
  unpaid: 999
};

/**
 * Helper to calculate calendar days between two dates inclusive
 */
function calculateDays(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  // Normalize dates to midnight to avoid timezone issues in day calculations
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Submit a new leave request
 */
async function requestLeave(req, res) {
  const { leave_type, start_date, end_date, reason } = req.body;
  const employee_id = req.user.id;

  if (!leave_type || !start_date || !end_date || !reason) {
    return res.status(400).json({ message: 'All fields (leave_type, start_date, end_date, reason) are required.' });
  }

  // Validate leave type
  const validTypes = ['casual', 'sick', 'annual', 'unpaid'];
  if (!validTypes.includes(leave_type)) {
    return res.status(400).json({ message: `Invalid leave type. Must be one of: ${validTypes.join(', ')}` });
  }

  // Validate date range
  const duration = calculateDays(start_date, end_date);
  if (duration <= 0) {
    return res.status(400).json({ message: 'End date must be on or after start date.' });
  }

  try {
    // 1. Check for overlapping leave requests (critical business rule)
    const hasOverlap = await db.leaveRequests.checkOverlap(employee_id, start_date, end_date);
    if (hasOverlap) {
      return res.status(400).json({ message: 'You have an active or pending leave request that overlaps with these dates.' });
    }

    // 2. Check leave balance (except for unpaid)
    if (leave_type !== 'unpaid') {
      const stats = await db.leaveRequests.getStats(employee_id);
      const limit = LEAVE_LIMITS[leave_type];
      const currentTaken = stats.by_type[leave_type]?.taken || 0;
      
      if (currentTaken + duration > limit) {
        const remaining = limit - currentTaken;
        return res.status(400).json({ 
          message: `Insufficient leave balance for '${leave_type}'. Requested: ${duration} days, Remaining: ${remaining} days.` 
        });
      }
    }

    // 3. Create leave request
    const newRequest = await db.leaveRequests.create({
      employee_id,
      leave_type,
      start_date,
      end_date,
      reason,
      duration,
      requires_approval: true // leaves generally require approval
    });

    return res.status(201).json({
      message: 'Leave request submitted successfully.',
      leaveRequest: newRequest
    });
  } catch (error) {
    console.error('Leave request error:', error);
    return res.status(500).json({ message: 'Server error during leave request submission.' });
  }
}

/**
 * Get personal leave history for logged-in employee
 */
async function getMyLeaves(req, res) {
  try {
    const list = await db.leaveRequests.findByEmployeeId(req.user.id);
    return res.json(list);
  } catch (error) {
    console.error('Fetch my leaves error:', error);
    return res.status(500).json({ message: 'Server error during fetching leave history.' });
  }
}

/**
 * Get all leave requests (Manager only)
 */
async function getAllLeaves(req, res) {
  const { status, employee_id } = req.query;
  try {
    const filters = {};
    if (status) filters.status = status;
    if (employee_id) filters.employee_id = employee_id;

    const list = await db.leaveRequests.findAll(filters);
    return res.json(list);
  } catch (error) {
    console.error('Fetch all leaves error:', error);
    return res.status(500).json({ message: 'Server error during fetching leave records.' });
  }
}

/**
 * Approve or Reject a leave request (Manager only)
 */
async function reviewLeave(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const managerId = req.user.id;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "Status is required and must be 'approved' or 'rejected'." });
  }

  try {
    const leave = await db.leaveRequests.findById(id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: `Leave request has already been reviewed (${leave.status}).` });
    }

    const updatedLeave = await db.leaveRequests.updateStatus(id, {
      status,
      reviewed_by: managerId,
      reviewed_at: new Date().toISOString()
    });

    return res.json({
      message: `Leave request successfully ${status}.`,
      leaveRequest: updatedLeave
    });
  } catch (error) {
    console.error('Review leave error:', error);
    return res.status(500).json({ message: 'Server error during leave request review.' });
  }
}

/**
 * Get stats summary for logged in user (employee) or system-wide (if manager)
 */
async function getStats(req, res) {
  try {
    const stats = await db.leaveRequests.getStats(req.user.id);
    return res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ message: 'Server error during fetching statistics.' });
  }
}

/**
 * Get global stats summary (Manager only)
 */
async function getManagerStats(req, res) {
  try {
    // Basic leave stats
    const stats = await db.leaveRequests.getStats();

    // Additional manager info: list of all employees
    const allEmps = await db.employees.findAll();
    stats.total_employees = allEmps.length;

    // Get count of currently on leave
    const todayStr = new Date().toISOString().split('T')[0];
    const activeRequests = await db.leaveRequests.findAll({ status: 'approved' });
    
    const currentlyOnLeave = activeRequests.filter(r => {
      const start = new Date(r.start_date).toISOString().split('T')[0];
      const end = new Date(r.end_date).toISOString().split('T')[0];
      return todayStr >= start && todayStr <= end;
    });

    stats.employees_on_leave_today = currentlyOnLeave.map(r => ({
      employee_name: r.employee_name,
      leave_type: r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date
    }));

    return res.json(stats);
  } catch (error) {
    console.error('Get manager stats error:', error);
    return res.status(500).json({ message: 'Server error during fetching system statistics.' });
  }
}

module.exports = {
  requestLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
  getStats,
  getManagerStats
};
