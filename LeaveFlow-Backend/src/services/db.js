const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const pgConfig = require('../config/database');

const FALLBACK_PATH = path.resolve(__dirname, '../../data/db.json');

// Memory cache for JSON File DB (to avoid excessive disk operations)
let jsonDbCache = null;
let usePg = false;

// Initialize Database connection
async function initDb() {
  const pgConnected = await pgConfig.testPgConnection();
  if (pgConnected) {
    console.log('Database running on PostgreSQL.');
    usePg = true;
    await setupPgTables();
  } else {
    console.log('Database running on JSON File Fallback.');
    usePg = false;
    await setupJsonDb();
  }
}

// Ensure Postgres tables exist (run schema.sql queries if not created)
async function setupPgTables() {
  try {
    // Check if table exists
    const tableCheck = await pgConfig.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'employees'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Tables do not exist in PostgreSQL. Creating tables...');
      
      // Create Enum types (catch if already exists)
      try {
        await pgConfig.query(`CREATE TYPE leave_type AS ENUM ('casual', 'sick', 'annual', 'unpaid');`);
      } catch (e) { /* ignore if already exists */ }
      
      try {
        await pgConfig.query(`CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');`);
      } catch (e) { /* ignore if already exists */ }

      // Create Tables
      await pgConfig.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id          SERIAL PRIMARY KEY,
          name        VARCHAR(100) NOT NULL,
          email       VARCHAR(150) UNIQUE NOT NULL,
          password    VARCHAR(255) NOT NULL,
          role        VARCHAR(20) NOT NULL DEFAULT 'employee',
          created_at  TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pgConfig.query(`
        CREATE TABLE IF NOT EXISTS leave_requests (
          id           SERIAL PRIMARY KEY,
          employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          leave_type   leave_type NOT NULL,
          start_date   DATE NOT NULL,
          end_date     DATE NOT NULL,
          reason       TEXT NOT NULL,
          status       leave_status NOT NULL DEFAULT 'pending',
          duration     INTEGER NOT NULL,
          requires_approval BOOLEAN NOT NULL DEFAULT false,
          reviewed_by  INTEGER REFERENCES employees(id),
          reviewed_at  TIMESTAMPTZ,
          created_at   TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pgConfig.query(`
        CREATE INDEX IF NOT EXISTS idx_leave_employee_dates
          ON leave_requests(employee_id, start_date, end_date)
          WHERE status != 'rejected';
      `);

      console.log('PostgreSQL tables created successfully.');
    }
    
    // Seed default manager and employee in PG if database is empty
    const empCount = await pgConfig.query('SELECT COUNT(*) FROM employees');
    if (parseInt(empCount.rows[0].count, 10) === 0) {
      console.log('Seeding default users in PostgreSQL...');
      const adminPass = await bcrypt.hash('admin123', 10);
      const userPass = await bcrypt.hash('password123', 10);

      // Seed Manager
      await pgConfig.query(`
        INSERT INTO employees (name, email, password, role)
        VALUES ('Admin Manager', 'admin@leaveflow.com', $1, 'manager');
      `, [adminPass]);

      // Seed Employee
      await pgConfig.query(`
        INSERT INTO employees (name, email, password, role)
        VALUES ('John Doe', 'john@leaveflow.com', $1, 'employee');
      `, [userPass]);
      
      console.log('PostgreSQL seeded successfully.');
    }
  } catch (error) {
    console.error('Failed to setup PG tables', error);
  }
}

// Ensure JSON file database is initialized
async function setupJsonDb() {
  try {
    let exists = true;
    try {
      await fs.access(FALLBACK_PATH);
    } catch (e) {
      exists = false;
    }

    if (!exists) {
      // Create empty DB with seeded admin manager and employee
      const adminPass = await bcrypt.hash('admin123', 10);
      const userPass = await bcrypt.hash('password123', 10);

      jsonDbCache = {
        employees: [
          {
            id: 1,
            name: 'Admin Manager',
            email: 'admin@leaveflow.com',
            password: adminPass,
            role: 'manager',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'John Doe',
            email: 'john@leaveflow.com',
            password: userPass,
            role: 'employee',
            created_at: new Date().toISOString()
          }
        ],
        leave_requests: []
      };
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(FALLBACK_PATH), { recursive: true });
      await fs.writeFile(FALLBACK_PATH, JSON.stringify(jsonDbCache, null, 2), 'utf8');
      console.log('Local JSON database created and seeded.');
    } else {
      const content = await fs.readFile(FALLBACK_PATH, 'utf8');
      jsonDbCache = JSON.parse(content || '{"employees":[],"leave_requests":[]}');
    }
  } catch (error) {
    console.error('Failed to setup JSON File DB', error);
    jsonDbCache = { employees: [], leave_requests: [] };
  }
}

// Save memory cache back to JSON file
async function saveJsonDb() {
  if (usePg) return;
  try {
    await fs.writeFile(FALLBACK_PATH, JSON.stringify(jsonDbCache, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save JSON Database', error);
  }
}

// DB Operations
const employees = {
  async findByEmail(email) {
    if (usePg) {
      const res = await pgConfig.query('SELECT * FROM employees WHERE email = $1', [email]);
      return res.rows[0] || null;
    } else {
      return jsonDbCache.employees.find(e => e.email.toLowerCase() === email.toLowerCase()) || null;
    }
  },

  async findById(id) {
    const numericId = parseInt(id, 10);
    if (usePg) {
      const res = await pgConfig.query('SELECT id, name, email, role, created_at FROM employees WHERE id = $1', [numericId]);
      return res.rows[0] || null;
    } else {
      const emp = jsonDbCache.employees.find(e => e.id === numericId);
      if (!emp) return null;
      const { password, ...safeEmp } = emp;
      return safeEmp;
    }
  },

  async create({ name, email, password, role }) {
    const hashedPass = await bcrypt.hash(password, 10);
    if (usePg) {
      const res = await pgConfig.query(
        'INSERT INTO employees (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
        [name, email.toLowerCase(), hashedPass, role || 'employee']
      );
      return res.rows[0];
    } else {
      const nextId = jsonDbCache.employees.reduce((max, e) => Math.max(max, e.id), 0) + 1;
      const newEmployee = {
        id: nextId,
        name,
        email: email.toLowerCase(),
        password: hashedPass,
        role: role || 'employee',
        created_at: new Date().toISOString()
      };
      jsonDbCache.employees.push(newEmployee);
      await saveJsonDb();
      const { password: _, ...safeEmp } = newEmployee;
      return safeEmp;
    }
  },

  async findAll() {
    if (usePg) {
      const res = await pgConfig.query('SELECT id, name, email, role, created_at FROM employees ORDER BY id ASC');
      return res.rows;
    } else {
      return jsonDbCache.employees.map(({ password, ...safeEmp }) => safeEmp);
    }
  },

  async delete(id) {
    const numericId = parseInt(id, 10);
    if (usePg) {
      await pgConfig.query('DELETE FROM employees WHERE id = $1', [numericId]);
      return true;
    } else {
      const idx = jsonDbCache.employees.findIndex(e => e.id === numericId);
      if (idx === -1) return false;
      jsonDbCache.employees.splice(idx, 1);
      jsonDbCache.leave_requests = jsonDbCache.leave_requests.filter(r => r.employee_id !== numericId);
      await saveJsonDb();
      return true;
    }
  }
};

const leaveRequests = {
  async create({ employee_id, leave_type, start_date, end_date, reason, duration, requires_approval }) {
    const empId = parseInt(employee_id, 10);
    const reqApproval = !!requires_approval;
    const dur = parseInt(duration, 10);
    
    if (usePg) {
      const res = await pgConfig.query(
        `INSERT INTO leave_requests 
         (employee_id, leave_type, start_date, end_date, reason, status, duration, requires_approval) 
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7) 
         RETURNING *`,
        [empId, leave_type, start_date, end_date, reason, dur, reqApproval]
      );
      return res.rows[0];
    } else {
      const nextId = jsonDbCache.leave_requests.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const newRequest = {
        id: nextId,
        employee_id: empId,
        leave_type,
        start_date,
        end_date,
        reason,
        status: 'pending',
        duration: dur,
        requires_approval: reqApproval,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString()
      };
      jsonDbCache.leave_requests.push(newRequest);
      await saveJsonDb();
      return newRequest;
    }
  },

  async findById(id) {
    const numericId = parseInt(id, 10);
    if (usePg) {
      const res = await pgConfig.query('SELECT * FROM leave_requests WHERE id = $1', [numericId]);
      return res.rows[0] || null;
    } else {
      return jsonDbCache.leave_requests.find(r => r.id === numericId) || null;
    }
  },

  async findByEmployeeId(employee_id) {
    const empId = parseInt(employee_id, 10);
    if (usePg) {
      const res = await pgConfig.query(`
        SELECT l.*, e.name as reviewer_name 
        FROM leave_requests l
        LEFT JOIN employees e ON l.reviewed_by = e.id
        WHERE l.employee_id = $1 
        ORDER BY l.created_at DESC
      `, [empId]);
      return res.rows;
    } else {
      return jsonDbCache.leave_requests
        .filter(r => r.employee_id === empId)
        .map(r => {
          let reviewer_name = null;
          if (r.reviewed_by) {
            const rev = jsonDbCache.employees.find(e => e.id === r.reviewed_by);
            reviewer_name = rev ? rev.name : null;
          }
          return { ...r, reviewer_name };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  },

  async findAll(filters = {}) {
    if (usePg) {
      let queryText = `
        SELECT l.*, emp.name as employee_name, emp.email as employee_email, rev.name as reviewer_name 
        FROM leave_requests l
        JOIN employees emp ON l.employee_id = emp.id
        LEFT JOIN employees rev ON l.reviewed_by = rev.id
      `;
      const params = [];
      const whereClauses = [];

      if (filters.status) {
        params.push(filters.status);
        whereClauses.push(`l.status = $${params.length}`);
      }

      if (filters.employee_id) {
        params.push(parseInt(filters.employee_id, 10));
        whereClauses.push(`l.employee_id = $${params.length}`);
      }

      if (whereClauses.length > 0) {
        queryText += ' WHERE ' + whereClauses.join(' AND ');
      }

      queryText += ' ORDER BY l.created_at DESC';
      const res = await pgConfig.query(queryText, params);
      return res.rows;
    } else {
      let list = jsonDbCache.leave_requests;
      if (filters.status) {
        list = list.filter(r => r.status === filters.status);
      }
      if (filters.employee_id) {
        const empId = parseInt(filters.employee_id, 10);
        list = list.filter(r => r.employee_id === empId);
      }
      return list.map(r => {
        const emp = jsonDbCache.employees.find(e => e.id === r.employee_id);
        let reviewer_name = null;
        if (r.reviewed_by) {
          const rev = jsonDbCache.employees.find(e => e.id === r.reviewed_by);
          reviewer_name = rev ? rev.name : null;
        }
        return {
          ...r,
          employee_name: emp ? emp.name : 'Unknown',
          employee_email: emp ? emp.email : 'Unknown',
          reviewer_name
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  },

  async checkOverlap(employee_id, start_date, end_date) {
    const empId = parseInt(employee_id, 10);
    const startStr = new Date(start_date).toISOString().split('T')[0];
    const endStr = new Date(end_date).toISOString().split('T')[0];

    if (usePg) {
      // Find overlap: status is not rejected, and employee matches, and ranges overlap
      const queryText = `
        SELECT COUNT(*) FROM leave_requests 
        WHERE employee_id = $1 
          AND status != 'rejected'
          AND NOT (end_date < $2 OR start_date > $3)
      `;
      const res = await pgConfig.query(queryText, [empId, startStr, endStr]);
      return parseInt(res.rows[0].count, 10) > 0;
    } else {
      const overlapCount = jsonDbCache.leave_requests.filter(r => {
        if (r.employee_id !== empId || r.status === 'rejected') return false;
        
        // Format dates as YYYY-MM-DD for lexical comparison
        const rStart = new Date(r.start_date).toISOString().split('T')[0];
        const rEnd = new Date(r.end_date).toISOString().split('T')[0];
        
        // Overlap logic: NOT (rEnd < startStr OR rStart > endStr)
        return !(rEnd < startStr || rStart > endStr);
      }).length;
      return overlapCount > 0;
    }
  },

  async updateStatus(id, { status, reviewed_by, reviewed_at }) {
    const reqId = parseInt(id, 10);
    const revId = parseInt(reviewed_by, 10);
    const revAt = reviewed_at || new Date().toISOString();

    if (usePg) {
      const res = await pgConfig.query(
        `UPDATE leave_requests 
         SET status = $1, reviewed_by = $2, reviewed_at = $3 
         WHERE id = $4 
         RETURNING *`,
        [status, revId, revAt, reqId]
      );
      return res.rows[0] || null;
    } else {
      const req = jsonDbCache.leave_requests.find(r => r.id === reqId);
      if (!req) return null;
      req.status = status;
      req.reviewed_by = revId;
      req.reviewed_at = revAt;
      await saveJsonDb();
      return req;
    }
  },

  async getStats(employee_id = null) {
    let leaves = [];
    if (usePg) {
      let queryText = 'SELECT * FROM leave_requests';
      const params = [];
      if (employee_id) {
        queryText += ' WHERE employee_id = $1';
        params.push(parseInt(employee_id, 10));
      }
      const res = await pgConfig.query(queryText, params);
      leaves = res.rows;
    } else {
      leaves = jsonDbCache.leave_requests;
      if (employee_id) {
        const empId = parseInt(employee_id, 10);
        leaves = leaves.filter(r => r.employee_id === empId);
      }
    }

    // Compute stats
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total_days_approved: 0,
      by_type: {
        casual: { taken: 0, total: 12 },
        sick: { taken: 0, total: 15 },
        annual: { taken: 0, total: 20 },
        unpaid: { taken: 0, total: 999 } // virtually unlimited
      }
    };

    leaves.forEach(req => {
      // Count statuses
      if (req.status === 'pending') stats.pending++;
      else if (req.status === 'approved') {
        stats.approved++;
        stats.total_days_approved += req.duration;
        
        // Sum by type if approved
        const type = req.leave_type;
        if (stats.by_type[type]) {
          stats.by_type[type].taken += req.duration;
        }
      } else if (req.status === 'rejected') {
        stats.rejected++;
      }
    });

    return stats;
  }
};

module.exports = {
  initDb,
  employees,
  leaveRequests,
  isPgConnected: () => usePg,
};
