-- Sagar Motors DSR — PostgreSQL schema
-- Run automatically by db.js on first boot; also usable manually.

CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  username  TEXT UNIQUE NOT NULL,
  pin_hash  TEXT NOT NULL,           -- scrypt hash (never store raw PIN)
  name      TEXT NOT NULL,
  role      TEXT NOT NULL CHECK (role IN ('admin','tl','sales')),
  tl        TEXT,                    -- team-leader scope (role=tl)
  cp        TEXT,                    -- sales-person scope (role=sales)
  loc       TEXT DEFAULT 'All'
);

CREATE TABLE IF NOT EXISTS roster (
  id    SERIAL PRIMARY KEY,
  code  TEXT,
  name  TEXT NOT NULL,
  tl    TEXT,
  loc   TEXT
);
CREATE INDEX IF NOT EXISTS idx_roster_tl  ON roster(tl);
CREATE INDEX IF NOT EXISTS idx_roster_loc ON roster(loc);

CREATE TABLE IF NOT EXISTS sales (
  id          TEXT PRIMARY KEY,
  date        DATE NOT NULL,
  loc         TEXT,
  model       TEXT,
  chassis     TEXT,
  customer    TEXT,
  phone       TEXT,
  cp          TEXT,          -- sales person
  tl          TEXT,          -- team leader
  sale_type   TEXT,
  acc_work    TEXT,
  book_no     TEXT,
  paid        NUMERIC DEFAULT 0,
  foc         NUMERIC DEFAULT 0,
  total       NUMERIC DEFAULT 0,
  ew          BOOLEAN DEFAULT false,
  zero        BOOLEAN DEFAULT false,
  zero_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_tl   ON sales(tl);
CREATE INDEX IF NOT EXISTS idx_sales_cp   ON sales(cp);

CREATE TABLE IF NOT EXISTS stock (
  id       TEXT PRIMARY KEY,
  kind     TEXT,            -- 'Purchase' | 'Transfer'
  date     DATE NOT NULL,
  src      TEXT,            -- "from"
  dst      TEXT,            -- "to"
  part_no  TEXT,
  descr    TEXT,
  qty      INTEGER DEFAULT 1,
  acc_w    TEXT,
  cate     TEXT,
  remarks  TEXT
);
CREATE INDEX IF NOT EXISTS idx_stock_date ON stock(date);

CREATE TABLE IF NOT EXISTS attendance (
  date    DATE NOT NULL,
  code    TEXT NOT NULL,
  status  TEXT,
  marked_by TEXT,
  PRIMARY KEY (date, code)
);

CREATE TABLE IF NOT EXISTS offers (
  id     TEXT PRIMARY KEY,
  title  TEXT,
  body   TEXT,
  pdf    TEXT
);
