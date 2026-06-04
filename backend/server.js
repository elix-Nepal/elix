const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'elix_secret_key';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'elix@admin2024';

// ─── SIMPLE JSON DATABASE (no compilation needed) ─────────────────────────────
if (!fs.existsSync('./data')) fs.mkdirSync('./data');

function readDB(name) {
  const file = `./data/${name}.json`;
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeDB(name, data) {
  fs.writeFileSync(`./data/${name}.json`, JSON.stringify(data, null, 2));
}

function nextId(arr) {
  return arr.length === 0 ? 1 : Math.max(...arr.map(i => i.id)) + 1;
}

// Seed default products if empty
if (readDB('products').length === 0) {
  writeDB('products', [
    {id:1, name:'Classic Band Ring',       category:'Ring',     price:2500, description:'Timeless sterling silver band ring.',            image_url:'', stock:100, is_active:1, created_at: new Date().toISOString()},
    {id:2, name:'Box Chain Necklace 18"',  category:'Necklace', price:3800, description:'Elegant box chain in .925 sterling silver.',     image_url:'', stock:100, is_active:1, created_at: new Date().toISOString()},
    {id:3, name:'Medium Hoop Earrings',    category:'Earrings', price:2200, description:'Classic medium hoops in polished silver.',       image_url:'', stock:100, is_active:1, created_at: new Date().toISOString()},
    {id:4, name:'Open Cuff Bracelet',      category:'Bracelet', price:3200, description:'Adjustable open cuff in pure .925 silver.',      image_url:'', stock:100, is_active:1, created_at: new Date().toISOString()},
    {id:5, name:'Crescent Moon Pendant',   category:'Necklace', price:4500, description:'Delicate crescent moon pendant with 20" chain.', image_url:'', stock:100, is_active:1, created_at: new Date().toISOString()},
    {id:6, name:'Stacking Rings Set×3',    category:'Ring',     price:5500, description:'Set of 3 minimalist stacking rings.',            image_url:'', stock:100, is_active:1, created_at: new Date().toISOString()},
    {id:7, name:'Leaf Drop Earrings',      category:'Earrings', price:2800, description:'Nature-inspired leaf drop earrings.',            image_url:'', stock:100, is_active:1, created_at: new Date().toISOString()},
    {id:8, name:'Twisted Bangle',          category:'Bracelet', price:2900, description:'Twisted rope design bangle in .925 silver.',     image_url:'', stock:100, is_active:1, created_at: new Date().toISOString()},
  ]);
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({ origin: ['https://elix-kappa.vercel.app', 'http://localhost:5173'] }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests.' }
});

app.use('/api/', limiter);
app.use('/api/admin/', adminLimiter);
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
    ['image/jpeg','image/png','image/webp'].includes(file.mimetype)
      ? cb(null, true) : cb(new Error('Only JPG/PNG/WEBP allowed'));
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

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

app.get('/api/products', (req, res) => {
  res.json(readDB('products').filter(p => p.is_active));
});

app.post('/api/orders', (req, res) => {
  const { customer, items, payment_method, subtotal, discount_pct, discount_amount, total } = req.body;
  if (!customer?.name || !customer?.phone || !customer?.address || !customer?.city)
    return res.status(400).json({ error: 'Name, phone, address, and city are required.' });

  const orders = readDB('orders');
  const orderItems = readDB('order_items');
  const newOrder = {
    id: nextId(orders),
    order_number: genOrderNum(),
    customer_name: customer.name,
    customer_phone: customer.phone,
    customer_email: customer.email || '',
    delivery_address: customer.address,
    city: customer.city,
    notes: customer.notes || '',
    payment_method,
    payment_status: 'pending',
    order_status: 'new',
    subtotal, discount_pct: discount_pct||0,
    discount_amount: discount_amount||0,
    total,
    created_at: new Date().toISOString()
  };
  orders.push(newOrder);
  writeDB('orders', orders);

  const allItems = readDB('order_items');
  items.forEach(i => {
    allItems.push({ id: nextId(allItems), order_id: newOrder.id, product_id: i.id, product_name: i.name, price: i.price, quantity: i.qty });
  });
  writeDB('order_items', allItems);

  res.json({ success: true, order_number: newOrder.order_number });
});

app.post('/api/custom', (req, res) => {
  const { name, email, phone, type, description, budget } = req.body;
  if (!name || !phone || !description)
    return res.status(400).json({ error: 'Name, phone, description required.' });
  const customs = readDB('custom_requests');
  customs.push({ id: nextId(customs), customer_name: name, customer_email: email||'', customer_phone: phone, piece_type: type||'other', description, budget: budget||'', status:'new', admin_notes:'', created_at: new Date().toISOString() });
  writeDB('custom_requests', customs);
  res.json({ success: true });
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD)
    res.json({ token: jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '30d' }) });
  else res.status(401).json({ error: 'Wrong password' });
});

app.get('/api/admin/stats', auth, (req, res) => {
  const orders = readDB('orders');
  const products = readDB('products');
  const customs = readDB('custom_requests');
  res.json({
    totalOrders: orders.length,
    revenue: orders.filter(o => o.order_status !== 'cancelled').reduce((s, o) => s + o.total, 0),
    pending: orders.filter(o => o.order_status === 'new').length,
    products: products.filter(p => p.is_active).length,
    customNew: customs.filter(c => c.status === 'new').length,
  });
});

app.get('/api/admin/orders', auth, (req, res) => {
  const orders = readDB('orders');
  const items = readDB('order_items');
  res.json(orders.map(o => ({
    ...o,
    items_list: items.filter(i => i.order_id === o.id).map(i => `${i.product_name} ×${i.quantity}`).join(' | ')
  })).reverse());
});

app.get('/api/admin/orders/:id', auth, (req, res) => {
  const order = readDB('orders').find(o => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Not found' });
  order.items = readDB('order_items').filter(i => i.order_id === order.id);
  res.json(order);
});

app.patch('/api/admin/orders/:id', auth, (req, res) => {
  const orders = readDB('orders');
  const idx = orders.findIndex(o => o.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  orders[idx].order_status = req.body.order_status;
  orders[idx].payment_status = req.body.payment_status;
  writeDB('orders', orders);
  res.json({ success: true });
});

app.get('/api/admin/custom', auth, (req, res) => {
  res.json(readDB('custom_requests').reverse());
});

app.patch('/api/admin/custom/:id', auth, (req, res) => {
  const customs = readDB('custom_requests');
  const idx = customs.findIndex(c => c.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  customs[idx].status = req.body.status;
  customs[idx].admin_notes = req.body.admin_notes || '';
  writeDB('custom_requests', customs);
  res.json({ success: true });
});

app.get('/api/admin/products', auth, (req, res) => {
  res.json(readDB('products').reverse());
});

app.post('/api/admin/products', auth, (req, res) => {
  const products = readDB('products');
  const p = { id: nextId(products), name: req.body.name, category: req.body.category, price: Number(req.body.price), description: req.body.description||'', image_url: req.body.image_url||'', stock: Number(req.body.stock)||100, is_active: 1, created_at: new Date().toISOString() };
  products.push(p);
  writeDB('products', products);
  res.json({ id: p.id, success: true });
});

app.put('/api/admin/products/:id', auth, (req, res) => {
  const products = readDB('products');
  const idx = products.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  products[idx] = { ...products[idx], ...req.body, id: products[idx].id };
  writeDB('products', products);
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, (req, res) => {
  const products = readDB('products');
  const idx = products.findIndex(p => p.id === Number(req.params.id));
  if (idx !== -1) { products[idx].is_active = 0; writeDB('products', products); }
  res.json({ success: true });
});

app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.get('/api/products/:id/variants', (req, res) => {
  const variants = readDB('product_variants').filter(v => v.product_id === Number(req.params.id));
  res.json(variants);
});

app.post('/api/admin/products/:id/variants', auth, (req, res) => {
  const { variants } = req.body;
  const all = readDB('product_variants').filter(v => v.product_id !== Number(req.params.id));
  const newVariants = variants.map((v, i) => ({
    id: Date.now() + i,
    product_id: Number(req.params.id),
    stone_color: v.stone_color || '',
    size: v.size || '',
    stock: Number(v.stock) || 0
  }));
  writeDB('product_variants', [...all, ...newVariants]);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`\n✦ Elix backend running → http://localhost:${PORT}`);
  console.log(`  Admin password: ${ADMIN_PASSWORD}\n`);
});