import pg from "pg";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Most hosted Postgres (Neon, Render, Supabase, Railway) require SSL.
const ssl = process.env.PGSSL === "off" ? false : { rejectUnauthorized: false };
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost") ? false : ssl,
});

export const q = (text, params) => pool.query(text, params);

/* ---------- password hashing (Node built-in scrypt; no native deps) ---------- */
export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(pin), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPin(pin, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(String(pin), salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
}

/* ---------- init + seed ---------- */
export async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  if (rows[0].n === 0) {
    console.log("Empty database — seeding starter data…");
    await seed();
    console.log("Seed complete.");
  }
}

const LOCATIONS = ["Dilshad Garden","Patparganj","Gr. Noida","Jewar","Ecotech-GNW","Sec-63 Noida","Sec-5 Noida","Sahibabad"];
const MODELS = ["Nexon","Punch","Tiago","Tigor","Altroz","Curvv","Harrier","Safari","Sierra","Nexon EV","Punch EV","Tiago EV","Tigor EV","Harrier EV","Curvv EV"];
const SALE_TYPES = ["Showroom","Counter"];
const ZERO_REASONS = ["Not Interested","Marriage Car","Customer Says Next Service","Last Month Retail Case","Budget Constraint","Commercial / Fleet","Other"];

const SEED_ROSTER = [
  ["4101","Aakash","Atul Mishra","Dilshad Garden"],["4102","Vijay Prakash","Atul Mishra","Dilshad Garden"],
  ["4103","Sangeeta Gupta","Atul Mishra","Dilshad Garden"],["4104","Puneet Goel","Atul Mishra","Dilshad Garden"],
  ["4110","Shubham Singal","Majid Khan","Dilshad Garden"],["4111","Rahul Verma","Majid Khan","Dilshad Garden"],
  ["4150","Nitin Sharma","Sachin Sharma","Patparganj"],["4151","Vikas Chauhan","Sachin Sharma","Patparganj"],
  ["4152","Akash Sahlot","Sachin Sharma","Patparganj"],
  ["4201","Aanchal Kundra","Abhinav Teootia","Sec-63 Noida"],["4202","Ashwani Kumar","Abhinav Teootia","Sec-63 Noida"],
  ["4203","Siddharth","Abhinav Teootia","Sec-63 Noida"],
  ["4210","Gagan Yadav","Shivam Saini","Sec-63 Noida"],["4211","Ranjeet","Shivam Saini","Sec-63 Noida"],
  ["4250","Aamir Khan","Rohit Shakya","Sec-5 Noida"],["4251","Rahul Singh","Rohit Shakya","Sec-5 Noida"],
  ["4301","Sandeep Singh","Abdul Aleem","Ecotech-GNW"],["4302","Nikhil Baisoya","Abdul Aleem","Ecotech-GNW"],
  ["4303","Sanjeev Tyagi","Abdul Aleem","Ecotech-GNW"],
  ["4310","Anil Bhati","Mohit Garg","Ecotech-GNW"],["4311","Gaurav Kasturia","Mohit Garg","Ecotech-GNW"],
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const monthKey = () => new Date().toISOString().slice(0, 7);

async function seed() {
  // users
  const users = [
    ["admin","1234","Group Manager","admin",null,null,"All"],
    ["atul","1111","Atul Mishra","tl","Atul Mishra",null,"Dilshad Garden"],
    ["aakash","2222","Aakash","sales",null,"Aakash","Dilshad Garden"],
  ];
  for (const [u,p,n,r,tl,cp,loc] of users)
    await q("INSERT INTO users(username,pin_hash,name,role,tl,cp,loc) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [u, hashPin(p), n, r, tl, cp, loc]);

  // roster
  for (const [code,name,tl,loc] of SEED_ROSTER)
    await q("INSERT INTO roster(code,name,tl,loc) VALUES($1,$2,$3,$4)", [code,name,tl,loc]);

  // sample sales for current month
  const m = monthKey();
  const cust = ["Vijay Prakash","Sangeeta Gupta","Sures Kumar","Ashutosh Singh","Mamta Rani","Apurv Goel","Dorothy Joseph","Siddharth","Vikas Chauhan","Amandeep Narang","Gaurav Kumar","Ragini Kumari","Anshika Singh"];
  let book = 980;
  for (let i = 0; i < SEED_ROSTER.length; i++) {
    const [, name, tl, loc] = SEED_ROSTER[i];
    const nCars = 2 + (i % 5);
    for (let c = 0; c < nCars; c++) {
      const isZero = ((i + c) % 5 === 0);
      const paid = isZero ? 0 : [500,2000,2100,6000,12500,18555,25000,37000][(i + c) % 8];
      const foc = isZero ? 0 : ((i + c) % 7 === 0 ? 5000 : 0);
      const day = 1 + ((i * 2 + c) % 27);
      const ew = ((i + c) % 6 === 0);
      await q(`INSERT INTO sales(id,date,loc,model,chassis,customer,phone,cp,tl,sale_type,acc_work,book_no,paid,foc,total,ew,zero,zero_reason)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [uid(), `${m}-${String(day).padStart(2,"0")}`, loc, MODELS[(i*3+c)%MODELS.length],
         "MAT"+(620000+i*137+c).toString().slice(0,6)+"S"+(1000+i), cust[(i+c)%cust.length],
         "9"+(700000000+i*111111+c*7).toString().slice(0,9), name, tl, SALE_TYPES[(i+c)%2],
         String(13000+i+c), String(book++), paid, foc, paid+foc, ew, isZero,
         isZero ? ZERO_REASONS[(i+c)%ZERO_REASONS.length] : null]);
    }
  }

  // stock
  const stock = [
    ["Transfer",`${m}-02`,"Patparganj","Sec-5 Noida","13076","D TO N","885732003109","Door Visors Punch",1,"ISAGCC2526002582"],
    ["Transfer",`${m}-02`,"Patparganj","Sec-63 Noida","13078","D TO N","885732003097","Seatcover Punch LhtGr&Blk A/L",2,"ISAGCC2526002457"],
    ["Purchase",`${m}-03`,"Vendor (Purchase)","Patparganj","-","Purchase","885732003259","Air Purifier AP 1.1",10,"PO-2526-0091"],
    ["Purchase",`${m}-06`,"Vendor (Purchase)","Dilshad Garden","-","Purchase","885732003606","Spoiler Piano Black Curvv",6,"PO-2526-0093"],
  ];
  for (const [kind,date,src,dst,accw,cate,pn,descr,qty,rem] of stock)
    await q(`INSERT INTO stock(id,kind,date,src,dst,part_no,descr,qty,acc_w,cate,remarks)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [uid(),kind,date,src,dst,pn,descr,qty,accw,cate,rem]);

  // offers
  const offers = [
    ["Monsoon Accessories Bonanza","Dear {name}, enjoy up to 25% OFF on TATA Genuine Accessories this month at Sagar Motors! Floor mats, seat covers, 7D mats & more. Visit us or reply YES to book a slot.","https://sagarmotors.example/offers/monsoon.pdf"],
    ["Extended Warranty Offer","Hi {name}, secure your {model} with TATA Extended Warranty at a special price this week only. Limited slots — reply to know more.",""],
  ];
  for (const [t,b,p] of offers)
    await q("INSERT INTO offers(id,title,body,pdf) VALUES($1,$2,$3,$4)", [uid(),t,b,p]);
}
