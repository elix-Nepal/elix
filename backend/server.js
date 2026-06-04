const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'elix_secret_key';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'elix@admin2024';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({ origin: ['https://elix-kappa.vercel.app', 'http://localhost:5173'] }));
app.use(express.json());

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    ['image/jpeg','image/png','image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG/PNG/WEBP allowed'));
  }
});

function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function genOrderNum() {
  return 'ELX' + Date.now().toString().slice(-7) + Math.floor(Math.random() * 10);
}

// Public routes
app.get('/api/products', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products WHERE is_active=1 ORDER BY created_at DESC');
  res.json(rows);
});

app.get('/api/products/:id/variants', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM product_variants WHERE product_id=$1', [req.params.id]);
  res.json(rows);
});

app.post('/api/orders', async (req, res) => {
  const { customer, items, payment_method, subtotal, discount_pct, discount_amount, total } = req.body;
  if (!customer?.name || !customer?.phone || !customer?.address || !customer?.city)
    return res.status(400).json({ error: 'Name, phone, address, and city are required.' });
  const num = genOrderNum();
  const { rows } = await pool.query(
    `INSERT INTO orders (order_number,customer_name,customer_phone,customer_email,delivery_address,city,notes,payment_method,subtotal,discount_pct,discount_amount,total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [num, customer.name, customer.phone, customer.email||'', customer.address, customer.city, customer.notes||'', payment_method, subtotal, discount_pct||0, discount_amount||0, total]
  );
  for (const i of items) {
    await pool.query(
      'INSERT INTO order_items (order_id,product_id,product_name,price,quantity,stone_color,size) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [rows[0].id, i.id, i.name, i.price, i.qty, i.stone_color||'', i.size||'']
    );
  }
  res.json({ success: true, order_number: num });
});

app.post('/api/custom', async (req, res) => {
  const { name, email, phone, type, description, budget } = req.body;
  if (!name || !phone || !description) return res.status(400).json({ error: 'Name, phone, description required.' });
  await pool.query(
    'INSERT INTO custom_requests (customer_name,customer_email,customer_phone,piece_type,description,budget) VALUES ($1,$2,$3,$4,$5,$6)',
    [name, email||'', phone, type||'other', description, budget||'']
  );
  res.json({ success: true });
});

// Admin routes
app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD)
    res.json({ token: jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '30d' }) });
  else res.status(401).json({ error: 'Wrong password' });
});

app.get('/api/admin/stats', auth, async (req, res) => {
  const totalOrders = (await pool.query('SELECT COUNT(*) c FROM orders')).rows[0].c;
  const revenue = (await pool.query("SELECT COALESCE(SUM(total),0) s FROM orders WHERE order_status!='cancelled'")).rows[0].s;
  const pending = (await pool.query("SELECT COUNT(*) c FROM orders WHERE order_status='new'")).rows[0].c;
  const products = (await pool.query('SELECT COUNT(*) c FROM products WHERE is_active=1')).rows[0].c;
  const customNew = (await pool.query("SELECT COUNT(*) c FROM custom_requests WHERE status='new'")).rows[0].c;
  res.json({ totalOrders, revenue, pending, products, customNew });
});

app.get('/api/admin/orders', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT o.*, STRING_AGG(oi.product_name || ' x' || oi.quantity, ' | ') items_list
    FROM orders o LEFT JOIN order_items oi ON o.id=oi.order_id
    GROUP BY o.id ORDER BY o.created_at DESC
  `);
  res.json(rows);
});

app.get('/api/admin/orders/:id', auth, async (req, res) => {
  const order = (await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id])).rows[0];
  if (!order) return res.status(404).json({ error: 'Not found' });
  order.items = (await pool.query('SELECT * FROM order_items WHERE order_id=$1', [req.params.id])).rows;
  res.json(order);
});

app.patch('/api/admin/orders/:id', auth, async (req, res) => {
  await pool.query('UPDATE orders SET order_status=$1, payment_status=$2 WHERE id=$3', [req.body.order_status, req.body.payment_status, req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/custom', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM custom_requests ORDER BY created_at DESC');
  res.json(rows);
});

app.patch('/api/admin/custom/:id', auth, async (req, res) => {
  await pool.query('UPDATE custom_requests SET status=$1, admin_notes=$2 WHERE id=$3', [req.body.status, req.body.admin_notes||'', req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/products', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/admin/products', auth, async (req, res) => {
  const { name, category, price, description, image_url, stock, has_stone, has_size } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO products (name,category,price,description,image_url,stock,has_stone,has_size) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
    [name, category, Number(price), description||'', image_url||'', Number(stock)||100, has_stone||0, has_size||0]
  );
  res.json({ id: rows[0].id, success: true });
});

app.put('/api/admin/products/:id', auth, async (req, res) => {
  const { name, category, price, description, image_url, stock, is_active, has_stone, has_size } = req.body;
  await pool.query(
    'UPDATE products SET name=$1,category=$2,price=$3,description=$4,image_url=$5,stock=$6,is_active=$7,has_stone=$8,has_size=$9 WHERE id=$10',
    [name, category, Number(price), description, image_url, Number(stock), is_active??1, has_stone||0, has_size||0, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, async (req, res) => {
  await pool.query('UPDATE products SET is_active=0 WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/admin/products/:id/variants', auth, async (req, res) => {
  const { variants } = req.body;
  await pool.query('DELETE FROM product_variants WHERE product_id=$1', [req.params.id]);
  for (const v of variants) {
    await pool.query(
      'INSERT INTO product_variants (product_id,stone_color,size,stock) VALUES ($1,$2,$3,$4)',
      [req.params.id, v.stone_color||'', v.size||'', Number(v.stock)||0]
    );
  }
  res.json({ success: true });
});

app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`✦ Elix backend running → http://localhost:${PORT}`);
});