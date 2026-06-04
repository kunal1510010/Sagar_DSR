import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { pool, q, initDb, hashPin, verifyPin } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SECRET = process.env.JWT_SECRET || "change-me-in-production";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------------- minimal HS256 token (no extra deps) ---------------- */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function sign(payload) {
  const body = { ...payload, iat: Date.now(), exp: Date.now() + 1000 * 60 * 60 * 12 }; // 12h
  const head = b64({ alg: "HS256", typ: "JWT" });
  const data = `${head}.${b64(body)}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verify(token) {
  try {
    const [h, p, sig] = token.split(".");
    const expect = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function auth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  const me = token && verify(token);
  if (!me) return res.status(401).json({ error: "Unauthorized" });
  req.me = me;
  next();
}
const adminOnly = (req, res, next) =>
  req.me.role === "admin" ? next() : res.status(403).json({ error: "Admins only" });

/* ---------------- scoping helpers ---------------- */
// returns extra WHERE clause + params for sales/stock based on role
function salesScope(me, params) {
  if (me.role === "tl") { params.push(me.tl); return ` AND tl = $${params.length}`; }
  if (me.role === "sales") { params.push(me.cp); return ` AND cp = $${params.length}`; }
  return "";
}

/* ---------------- AUTH ---------------- */
app.post("/api/login", async (req, res) => {
  const { username, pin } = req.body || {};
  const { rows } = await q("SELECT * FROM users WHERE username = $1", [String(username || "").toLowerCase()]);
  const u = rows[0];
  if (!u || !verifyPin(pin, u.pin_hash))
    return res.status(401).json({ error: "Invalid username or PIN" });
  const payload = { uid: u.id, u: u.username, name: u.name, role: u.role, tl: u.tl, cp: u.cp, loc: u.loc };
  res.json({ token: sign(payload), user: payload });
});
app.get("/api/me", auth, (req, res) => res.json({ user: req.me }));

/* ---------------- BOOTSTRAP (one call after login) ---------------- */
app.get("/api/bootstrap", auth, async (req, res) => {
  const me = req.me;
  const month = (req.query.month || new Date().toISOString().slice(0, 7)) + "";
  const today = new Date().toISOString().slice(0, 10);

  // roster scoped
  let rosterSQL = "SELECT code,name,tl,loc FROM roster", rp = [];
  if (me.role === "tl") { rp.push(me.tl); rosterSQL += ` WHERE tl=$1`; }
  if (me.role === "sales") { rp.push(me.cp); rosterSQL += ` WHERE name=$1`; }
  rosterSQL += " ORDER BY loc,tl,name";

  const sp = [month]; const sScope = salesScope(me, sp);
  const stp = [month]; const stScope = me.role === "admin" ? "" : ""; // stock visible to all staff

  const [roster, sales, stock, offers, todayAtt, users] = await Promise.all([
    q(rosterSQL, rp),
    q(`SELECT * FROM sales WHERE to_char(date,'YYYY-MM')=$1 ${sScope} ORDER BY date DESC`, sp),
    q(`SELECT * FROM stock WHERE to_char(date,'YYYY-MM')=$1 ORDER BY date DESC`, [month]),
    q("SELECT * FROM offers ORDER BY title"),
    q("SELECT code,status FROM attendance WHERE date=$1", [today]),
    me.role === "admin" ? q("SELECT id,username,name,role,tl,cp,loc FROM users ORDER BY role,username") : Promise.resolve({ rows: [] }),
  ]);
  res.json({
    roster: roster.rows,
    sales: sales.rows.map(mapSale),
    stock: stock.rows.map(mapStock),
    offers: offers.rows,
    todayAttendance: todayAtt.rows,
    users: users.rows,
  });
});

/* ---------------- mappers (db snake_case -> frontend camelCase) ---------------- */
const d = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : (x || "").slice ? x.slice(0, 10) : x);
const mapSale = (r) => ({ id: r.id, date: d(r.date), loc: r.loc, model: r.model, chassis: r.chassis,
  customer: r.customer, phone: r.phone, cp: r.cp, tl: r.tl, saleType: r.sale_type, accWork: r.acc_work,
  bookNo: r.book_no, paid: +r.paid, foc: +r.foc, total: +r.total, ew: r.ew, zero: r.zero, zeroReason: r.zero_reason || "" });
const mapStock = (r) => ({ id: r.id, kind: r.kind, date: d(r.date), from: r.src, to: r.dst, partNo: r.part_no,
  desc: r.descr, qty: r.qty, accW: r.acc_w, cate: r.cate, remarks: r.remarks });

/* ---------------- SALES ---------------- */
app.get("/api/sales", auth, async (req, res) => {
  const month = (req.query.month || "") + ""; const p = [month]; const scope = salesScope(req.me, p);
  const { rows } = await q(`SELECT * FROM sales WHERE to_char(date,'YYYY-MM')=$1 ${scope} ORDER BY date DESC`, p);
  res.json(rows.map(mapSale));
});
function saleParams(b, id) {
  const paid = +b.paid || 0, foc = +b.foc || 0;
  return [id, b.date, b.loc, b.model, b.chassis, b.customer, b.phone, b.cp, b.tl, b.saleType,
    b.accWork, b.bookNo, paid, foc, paid + foc, !!b.ew, paid === 0, paid === 0 ? (b.zeroReason || "") : null];
}
app.post("/api/sales", auth, async (req, res) => {
  const id = req.body.id || uid();
  const { rows } = await q(`INSERT INTO sales(id,date,loc,model,chassis,customer,phone,cp,tl,sale_type,acc_work,book_no,paid,foc,total,ew,zero,zero_reason)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`, saleParams(req.body, id));
  res.json(mapSale(rows[0]));
});
app.put("/api/sales/:id", auth, async (req, res) => {
  const { rows } = await q(`UPDATE sales SET date=$2,loc=$3,model=$4,chassis=$5,customer=$6,phone=$7,cp=$8,tl=$9,
    sale_type=$10,acc_work=$11,book_no=$12,paid=$13,foc=$14,total=$15,ew=$16,zero=$17,zero_reason=$18 WHERE id=$1 RETURNING *`,
    saleParams(req.body, req.params.id));
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(mapSale(rows[0]));
});
app.delete("/api/sales/:id", auth, async (req, res) => { await q("DELETE FROM sales WHERE id=$1", [req.params.id]); res.json({ ok: true }); });

/* ---------------- STOCK ---------------- */
app.get("/api/stock", auth, async (req, res) => {
  const { rows } = await q(`SELECT * FROM stock WHERE to_char(date,'YYYY-MM')=$1 ORDER BY date DESC`, [(req.query.month || "") + ""]);
  res.json(rows.map(mapStock));
});
function stockParams(b, id) {
  return [id, b.kind, b.date, b.from, b.to, b.partNo, b.desc, +b.qty || 1, b.accW, b.cate, b.remarks];
}
app.post("/api/stock", auth, async (req, res) => {
  const { rows } = await q(`INSERT INTO stock(id,kind,date,src,dst,part_no,descr,qty,acc_w,cate,remarks)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, stockParams(req.body, req.body.id || uid()));
  res.json(mapStock(rows[0]));
});
app.put("/api/stock/:id", auth, async (req, res) => {
  const { rows } = await q(`UPDATE stock SET kind=$2,date=$3,src=$4,dst=$5,part_no=$6,descr=$7,qty=$8,acc_w=$9,cate=$10,remarks=$11
    WHERE id=$1 RETURNING *`, stockParams(req.body, req.params.id));
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(mapStock(rows[0]));
});

/* ---------------- ATTENDANCE ---------------- */
app.get("/api/attendance", auth, async (req, res) => {
  const { rows } = await q("SELECT date::text,code,status FROM attendance WHERE date=$1", [(req.query.date || "") + ""]);
  res.json(rows.map(r => ({ date: r.date, code: r.code, status: r.status })));
});
app.post("/api/attendance", auth, async (req, res) => {
  const { date, code, status } = req.body || {};
  if (!status) { await q("DELETE FROM attendance WHERE date=$1 AND code=$2", [date, code]); return res.json({ ok: true }); }
  await q(`INSERT INTO attendance(date,code,status,marked_by) VALUES($1,$2,$3,$4)
           ON CONFLICT (date,code) DO UPDATE SET status=$3, marked_by=$4`, [date, code, status, req.me.name]);
  res.json({ ok: true });
});
app.post("/api/attendance/bulk", auth, async (req, res) => {
  const { date, codes, status } = req.body || {};
  for (const code of (codes || []))
    await q(`INSERT INTO attendance(date,code,status,marked_by) VALUES($1,$2,$3,$4)
             ON CONFLICT (date,code) DO UPDATE SET status=$3, marked_by=$4`, [date, code, status, req.me.name]);
  res.json({ ok: true });
});

/* ---------------- ROSTER (admin) ---------------- */
app.post("/api/roster", auth, adminOnly, async (req, res) => {
  const b = req.body;
  const { rows } = await q("INSERT INTO roster(code,name,tl,loc) VALUES($1,$2,$3,$4) RETURNING *", [b.code, b.name, b.tl, b.loc]);
  res.json(rows[0]);
});
app.post("/api/roster/bulk", auth, adminOnly, async (req, res) => {
  for (const r of (req.body.rows || []))
    await q("INSERT INTO roster(code,name,tl,loc) VALUES($1,$2,$3,$4)", [r.code, r.name, r.tl, r.loc]);
  const { rows } = await q("SELECT code,name,tl,loc FROM roster ORDER BY loc,tl,name");
  res.json(rows);
});
app.put("/api/roster/:code", auth, adminOnly, async (req, res) => {
  const b = req.body;
  await q("UPDATE roster SET code=$1,name=$2,tl=$3,loc=$4 WHERE code=$5", [b.code, b.name, b.tl, b.loc, req.params.code]);
  res.json({ ok: true });
});
app.delete("/api/roster/:code", auth, adminOnly, async (req, res) => { await q("DELETE FROM roster WHERE code=$1", [req.params.code]); res.json({ ok: true }); });

/* ---------------- OFFERS ---------------- */
app.post("/api/offers", auth, async (req, res) => {
  const b = req.body; const id = b.id || uid();
  await q("INSERT INTO offers(id,title,body,pdf) VALUES($1,$2,$3,$4)", [id, b.title, b.body, b.pdf]);
  res.json({ id, title: b.title, body: b.body, pdf: b.pdf });
});
app.put("/api/offers/:id", auth, async (req, res) => {
  const b = req.body;
  await q("UPDATE offers SET title=$1,body=$2,pdf=$3 WHERE id=$4", [b.title, b.body, b.pdf, req.params.id]);
  res.json({ ok: true });
});
app.delete("/api/offers/:id", auth, async (req, res) => { await q("DELETE FROM offers WHERE id=$1", [req.params.id]); res.json({ ok: true }); });

/* ---------------- USERS (admin) ---------------- */
app.post("/api/users", auth, adminOnly, async (req, res) => {
  const b = req.body;
  await q("INSERT INTO users(username,pin_hash,name,role,tl,cp,loc) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [b.u.toLowerCase(), hashPin(b.p), b.name, b.role, b.tl || null, b.cp || null, b.loc || "All"]);
  res.json({ ok: true });
});
app.put("/api/users/:id", auth, adminOnly, async (req, res) => {
  const b = req.body;
  if (b.p) await q("UPDATE users SET username=$1,pin_hash=$2,name=$3,role=$4,tl=$5,cp=$6,loc=$7 WHERE id=$8",
    [b.u.toLowerCase(), hashPin(b.p), b.name, b.role, b.tl || null, b.cp || null, b.loc || "All", req.params.id]);
  else await q("UPDATE users SET username=$1,name=$3,role=$4,tl=$5,cp=$6,loc=$7 WHERE id=$8",
    [b.u.toLowerCase(), null, b.name, b.role, b.tl || null, b.cp || null, b.loc || "All", req.params.id]);
  res.json({ ok: true });
});
app.delete("/api/users/:id", auth, adminOnly, async (req, res) => { await q("DELETE FROM users WHERE id=$1", [req.params.id]); res.json({ ok: true }); });

/* ---------------- health + SPA fallback ---------------- */
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 3000;
initDb()
  .then(() => app.listen(PORT, () => console.log(`Sagar DSR running on :${PORT}`)))
  .catch((e) => { console.error("DB init failed:", e); process.exit(1); });
