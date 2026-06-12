CREATE TYPE leave_type AS ENUM ('casual', 'sick', 'annual', 'unpaid');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE employees (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'employee', -- 'employee' | 'manager'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_requests (
  id           SERIAL PRIMARY KEY,
  employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type   leave_type NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  reason       TEXT NOT NULL,
  status       leave_status NOT NULL DEFAULT 'pending',
  duration     INTEGER NOT NULL,          -- calendar days, computed on insert
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  reviewed_by  INTEGER REFERENCES employees(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for overlap queries (critical for the overlap business rule)
CREATE INDEX idx_leave_employee_dates
  ON leave_requests(employee_id, start_date, end_date)
  WHERE status != 'rejected';
