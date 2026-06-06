-- Sagar Motors DSR — PostgreSQL schema
-- Run automatically by db.js on first boot; also usable manually.

CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  username  TEXT UNIQUE NOT NULL,
  pin_hash  TEXT NOT NULL,           -- scrypt hash (never store raw PIN)
  name      TEXT NOT NULL,
  role      TEXT NOT NULL CHECK (role IN ('admin','tl','sales')),
  tl          TEXT,                    -- team-leader scope (role=tl)
  cp          TEXT,                    -- sales-person scope (role=sales)
  loc         TEXT DEFAULT 'All',
  designation TEXT
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE roster ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE roster ADD COLUMN IF NOT EXISTS dms_id     TEXT;

CREATE TABLE IF NOT EXISTS roster (
  id     SERIAL PRIMARY KEY,
  code   TEXT,
  name   TEXT NOT NULL,
  tl     TEXT,
  loc    TEXT,
  dms_id TEXT
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
  zero_reason TEXT,
  foc_reason  TEXT,
  vas_name    TEXT,
  vas_billing NUMERIC DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_tl   ON sales(tl);
CREATE INDEX IF NOT EXISTS idx_sales_cp   ON sales(cp);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS foc_reason  TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vas_name    TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vas_billing NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS stock (
  id                TEXT PRIMARY KEY,
  kind              TEXT,            -- 'Purchase' | 'Transfer'
  date              TIMESTAMP NOT NULL,
  src               TEXT,            -- "from"
  dst               TEXT,            -- "to"
  part_no           TEXT,
  descr             TEXT,
  qty               INTEGER DEFAULT 1,
  acc_w             TEXT,
  cate              TEXT,
  remarks           TEXT,
  location          TEXT,
  part_order_desc   TEXT,
  delivery_status   TEXT DEFAULT 'No'
);
CREATE INDEX IF NOT EXISTS idx_stock_date ON stock(date);

-- live migrations for existing databases
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='stock' AND column_name='date' AND data_type='date'
  ) THEN
    ALTER TABLE stock ALTER COLUMN date TYPE TIMESTAMP USING date::timestamp;
  END IF;
END $$;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS location         TEXT;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS part_order_desc  TEXT;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS delivery_status  TEXT DEFAULT 'No';

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
