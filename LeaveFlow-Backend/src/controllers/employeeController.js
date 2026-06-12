const db = require('../services/db');

/**
 * Get all employees with their leave balance summaries (Manager only)
 */
async function getAllEmployees(req, res) {
  try {
    const list = await db.employees.findAll();
    
    // Enrich each employee with their current leave balances
    const enrichedList = await Promise.all(
      list.map(async (emp) => {
        const stats = await db.leaveRequests.getStats(emp.id);
        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          created_at: emp.created_at,
          leave_stats: {
            approved_requests: stats.approved,
            pending_requests: stats.pending,
            total_days_taken: stats.total_days_approved,
            by_type: stats.by_type
          }
        };
      })
    );

    return res.json(enrichedList);
  } catch (error) {
    console.error('Fetch employees list error:', error);
    return res.status(500).json({ message: 'Server error during fetching employee directory.' });
  }
}

/**
 * Create a new employee account (Manager only, session remains with manager)
 */
async function createEmployee(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password, and role are required.' });
  }

  try {
    const existingUser = await db.employees.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'An employee with this email already exists.' });
    }

    const newEmp = await db.employees.create({
      name,
      email,
      password,
      role: role === 'manager' ? 'manager' : 'employee'
    });

    return res.status(201).json({
      message: 'Employee registered successfully.',
      employee: newEmp
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return res.status(500).json({ message: 'Server error during employee registration.' });
  }
}

/**
 * Delete an employee (Manager only, cannot delete self)
 */
async function deleteEmployee(req, res) {
  const { id } = req.params;
  const targetId = parseInt(id, 10);
  const managerId = req.user.id;

  if (targetId === managerId) {
    return res.status(400).json({ message: 'Access denied. You cannot delete your own account.' });
  }

  try {
    const deleted = await db.employees.delete(targetId);
    if (!deleted) {
      return res.status(404).json({ message: 'Employee not found.' });
    }
    return res.json({ message: 'Employee successfully removed from the system.' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return res.status(500).json({ message: 'Server error during employee deletion.' });
  }
}

module.exports = {
  getAllEmployees,
  createEmployee,
  deleteEmployee,
};
