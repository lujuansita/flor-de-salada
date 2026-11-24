const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DB = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp|svg\+xml)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (PNG, JPG, GIF, WEBP, SVG)'));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'flor-de-salada-secreto-local',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

const STATUSES = ['pendiente', 'en preparacion', 'enviado', 'entregado'];
const PAYMENTS = ['efectivo', 'transferencia', 'mercadopago'];
const DELIVERIES = ['pickup', 'delivery'];
const TYPES = ['natural', 'limpiapipas', 'cinta_raso', 'crochet'];

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, companyId: u.companyId };
}

function productView(p) {
  return {
    ...p,
    images: (p.images || []).map(img => img.startsWith('/') ? img : `/uploads/${img}`)
  };
}

function reviewView(r) {
  return {
    ...r,
    photos: (r.photos || []).map(img => img.startsWith('/') ? img : `/uploads/${img}`)
  };
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Tenés que iniciar sesión.' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Tenés que iniciar sesión.' });
    if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: 'No tenés permiso para hacer esto.' });
    next();
  };
}

function companyProducts(companyId) {
  return DB.get().products.filter(p => p.companyId === companyId);
}

function findCompany(req) {
  const data = DB.get();
  const slug = req.query.companySlug;
  if (slug) return data.companies.find(c => c.slug === slug && c.active);
  if (req.session.user && req.session.user.companyId) {
    return data.companies.find(c => c.id === req.session.user.companyId);
  }
  return data.companies.find(c => c.active);
}

// ---------- Sesión y cuentas ----------

app.get('/api/session', (req, res) => res.json({ user: publicUser(req.session.user) }));

app.get('/api/companies', (req, res) => {
  res.json(DB.get().companies.filter(c => c.active).map(c => ({
    id: c.id, name: c.name, slug: c.slug, logo: c.logo
  })));
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = DB.get().users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if (!DB.verifyPassword(password, user)) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
  }
  req.session.user = publicUser(user);
  res.json({ user: publicUser(user) });
});

app.post('/api/register', (req, res) => {
  const { name, email, password, companySlug } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Completá nombre, email y contraseña.' });
  const data = DB.get();
  const company = data.companies.find(c => c.slug === companySlug && c.active) || data.companies.find(c => c.active);
  if (!company) return res.status(400).json({ error: 'No hay una empresa disponible.' });
  if (data.users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).json({ error: 'Ese email ya está registrado.' });
  }
  const pass = DB.hashPassword(password);
  const user = {
    id: DB.uid('usr'), companyId: company.id, name: String(name).trim(),
    email: String(email).trim().toLowerCase(), role: 'buyer',
    salt: pass.salt, hash: pass.hash, createdAt: new Date().toISOString()
  };
  data.users.push(user);
  DB.save();
  req.session.user = publicUser(user);
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post('/api/companies', requireRole('superadmin'), (req, res) => {
  const { name, slug, adminName, adminEmail, adminPassword } = req.body || {};
  if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Completá todos los datos de la empresa y su administrador.' });
  }
  const data = DB.get();
  const cleanSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (data.companies.some(c => c.slug === cleanSlug)) {
    return res.status(400).json({ error: 'Ese slug de empresa ya existe.' });
  }
  if (data.users.some(u => u.email.toLowerCase() === String(adminEmail).toLowerCase())) {
    return res.status(400).json({ error: 'Ese email de administrador ya existe.' });
  }
  const company = {
    id: DB.uid('emp'), name: String(name).trim(), slug: cleanSlug,
    logo: '/img/logo.svg', active: true, createdAt: new Date().toISOString()
  };
  const pass = DB.hashPassword(adminPassword);
  const admin = {
    id: DB.uid('usr'), companyId: company.id, name: String(adminName).trim(),
    email: String(adminEmail).trim().toLowerCase(), role: 'admin',
    salt: pass.salt, hash: pass.hash, createdAt: new Date().toISOString()
  };
  data.companies.push(company);
  data.users.push(admin);
  DB.save();
  res.status(201).json({ company, admin: publicUser(admin) });
});

// ---------- Productos ----------

app.get('/api/products', (req, res) => {
  const company = findCompany(req);
  if (!company) return res.json([]);
  const { type, search, promo } = req.query;
  let list = companyProducts(company.id).filter(p => p.active);
  if (type && TYPES.includes(type)) list = list.filter(p => p.type === type);
  if (promo === '1') list = list.filter(p => p.promo);
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  res.json(list.map(productView));
});

app.get('/api/products/:id', (req, res) => {
  const company = findCompany(req);
  const product = DB.get().products.find(p => p.id === req.params.id && (!company || p.companyId === company.id));
  if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json(productView(product));
});

function parseOptions(body) {
  const defaults = DB.defaultOptions();
  if (!body.options) return defaults;
  try {
    const parsed = typeof body.options === 'string' ? JSON.parse(body.options) : body.options;
    return {
      colors: Array.isArray(parsed.colors) ? parsed.colors : defaults.colors,
      wrappings: Array.isArray(parsed.wrappings) ? parsed.wrappings : defaults.wrappings,
      bows: Array.isArray(parsed.bows) ? parsed.bows : defaults.bows,
      extras: Array.isArray(parsed.extras) ? parsed.extras : defaults.extras
    };
  } catch {
    return defaults;
  }
}

function productFields(body) {
  return {
    name: String(body.name || '').trim(),
    type: TYPES.includes(body.type) ? body.type : 'natural',
    description: String(body.description || '').trim(),
    price: Number(body.price) || 0,
    oldPrice: body.oldPrice ? Number(body.oldPrice) : null,
    stock: Number(body.stock) || 0,
    promo: body.promo === 'true' || body.promo === 'on' || body.promo === true,
    prearmado: body.prearmado === 'true' || body.prearmado === 'on' || body.prearmado === true,
    active: body.active === undefined ? true : (body.active === 'true' || body.active === 'on')
  };
}

app.post('/api/products', requireRole('admin', 'superadmin'), upload.array('images', 5), (req, res) => {
  const fields = productFields(req.body);
  if (!fields.name || !fields.price) return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
  const product = {
    id: DB.uid('prod'), companyId: req.session.user.companyId,
    ...fields, options: parseOptions(req.body),
    images: (req.files || []).map(f => f.filename), createdAt: new Date().toISOString()
  };
  DB.get().products.push(product);
  DB.save();
  res.status(201).json(productView(product));
});

app.put('/api/products/:id', requireRole('admin', 'superadmin'), upload.array('images', 5), (req, res) => {
  const data = DB.get();
  const product = data.products.find(p => p.id === req.params.id && p.companyId === req.session.user.companyId);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
  const fields = productFields(req.body);
  Object.assign(product, fields, { options: parseOptions(req.body) });
  if (req.files && req.files.length) product.images = req.files.map(f => f.filename);
  DB.save();
  res.json(productView(product));
});

app.delete('/api/products/:id', requireRole('admin', 'superadmin'), (req, res) => {
  const data = DB.get();
  const index = data.products.findIndex(p => p.id === req.params.id && p.companyId === req.session.user.companyId);
  if (index === -1) return res.status(404).json({ error: 'Producto no encontrado.' });
  data.products.splice(index, 1);
  DB.save();
  res.json({ ok: true });
});

// ---------- Pedidos ----------

function extrasCost(product, selected) {
  const names = Array.isArray(selected) ? selected : [];
  return (product.options.extras || []).reduce((sum, e) => sum + (names.includes(e.name) ? Number(e.price || 0) : 0), 0);
}

app.post('/api/orders', requireAuth, (req, res) => {
  const { items, delivery, address, payment } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'El carrito está vacío.' });
  if (!DELIVERIES.includes(delivery)) return res.status(400).json({ error: 'Elegí retiro o envío.' });
  if (!PAYMENTS.includes(payment)) return res.status(400).json({ error: 'Elegí un método de pago.' });
  if (delivery === 'delivery' && !String(address || '').trim()) {
    return res.status(400).json({ error: 'Ingresá la dirección de envío.' });
  }

  const data = DB.get();
  const company = data.companies.find(c => c.id === req.session.user.companyId) || data.companies.find(c => c.active);
  if (!company) return res.status(400).json({ error: 'No hay empresa configurada.' });

  const normalized = [];
  let total = 0;
  for (const item of items) {
    const product = data.products.find(p => p.id === item.productId && p.companyId === company.id);
    if (!product) return res.status(400).json({ error: 'Hay un producto que ya no está disponible.' });
    const qty = Math.max(1, Number(item.qty) || 1);
    const unit = Number(product.price) + extrasCost(product, item.extras);
    total += unit * qty;
    normalized.push({
      productId: product.id, name: product.name, qty,
      unitPrice: unit, image: (product.images || [])[0], options: item.options || {}
    });
  }

  const order = {
    id: DB.uid('ord'), companyId: company.id, userId: req.session.user.id,
    customerName: req.session.user.name, email: req.session.user.email,
    items: normalized, delivery, address: delivery === 'delivery' ? String(address).trim() : 'Retiro en tienda',
    payment, paymentStatus: payment === 'mercadopago' ? 'pendiente (simulado)' : 'pendiente',
    status: 'pendiente', total, createdAt: new Date().toISOString()
  };
  data.orders.push(order);
  DB.save();
  res.status(201).json(order);
});

app.get('/api/orders/mine', requireAuth, (req, res) => {
  const orders = DB.get().orders
    .filter(o => o.userId === req.session.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(orders);
});

app.get('/api/orders', requireRole('admin', 'superadmin'), (req, res) => {
  const orders = DB.get().orders
    .filter(o => o.companyId === req.session.user.companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(orders);
});

app.patch('/api/orders/:id/status', requireRole('admin', 'superadmin'), (req, res) => {
  const order = DB.get().orders.find(o => o.id === req.params.id && o.companyId === req.session.user.companyId);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Estado no válido.' });
  order.status = req.body.status;
  DB.save();
  res.json(order);
});

// ---------- Reseñas ----------

app.get('/api/reviews', (req, res) => {
  const company = findCompany(req);
  let list = DB.get().reviews.filter(r => (!company || r.companyId === company.id) && r.approved);
  if (req.query.productId) list = list.filter(r => r.productId === req.query.productId);
  res.json(list.map(reviewView).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

app.post('/api/reviews', requireAuth, upload.array('photos', 3), (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Escribí una reseña.' });
  if (text.length > 400) return res.status(400).json({ error: 'La reseña no puede superar los 400 caracteres.' });
  const data = DB.get();
  const company = data.companies.find(c => c.id === req.session.user.companyId) || data.companies.find(c => c.active);
  const review = {
    id: DB.uid('rev'), companyId: company.id, productId: req.body.productId || null,
    userId: req.session.user.id, author: req.session.user.name, text,
    photos: (req.files || []).map(f => f.filename), approved: true,
    createdAt: new Date().toISOString()
  };
  data.reviews.push(review);
  DB.save();
  res.status(201).json(reviewView(review));
});

app.get('/api/reviews/admin', requireRole('admin', 'superadmin'), (req, res) => {
  res.json(DB.get().reviews
    .filter(r => r.companyId === req.session.user.companyId)
    .map(reviewView)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

app.patch('/api/reviews/:id', requireRole('admin', 'superadmin'), (req, res) => {
  const review = DB.get().reviews.find(r => r.id === req.params.id && r.companyId === req.session.user.companyId);
  if (!review) return res.status(404).json({ error: 'Reseña no encontrada.' });
  review.approved = !!req.body.approved;
  DB.save();
  res.json(reviewView(review));
});

// ---------- Usuarios y panel ----------

app.get('/api/users', requireRole('admin', 'superadmin'), (req, res) => {
  res.json(DB.get().users
    .filter(u => u.companyId === req.session.user.companyId)
    .map(publicUser));
});

app.post('/api/users', requireRole('admin', 'superadmin'), (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Completá nombre, email y contraseña.' });
  const allowed = req.session.user.role === 'superadmin' ? ['buyer', 'admin', 'superadmin'] : ['buyer', 'admin'];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Rol no permitido.' });
  const data = DB.get();
  if (data.users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).json({ error: 'Ese email ya existe.' });
  }
  const pass = DB.hashPassword(password);
  const user = {
    id: DB.uid('usr'), companyId: req.session.user.companyId, name: String(name).trim(),
    email: String(email).trim().toLowerCase(), role,
    salt: pass.salt, hash: pass.hash, createdAt: new Date().toISOString()
  };
  data.users.push(user);
  DB.save();
  res.status(201).json(publicUser(user));
});

app.get('/api/stats', requireRole('admin', 'superadmin'), (req, res) => {
  const data = DB.get();
  const cid = req.session.user.companyId;
  res.json({
    products: data.products.filter(p => p.companyId === cid).length,
    orders: data.orders.filter(o => o.companyId === cid).length,
    pending: data.orders.filter(o => o.companyId === cid && o.status === 'pendiente').length,
    reviews: data.reviews.filter(r => r.companyId === cid && r.approved).length,
    users: data.users.filter(u => u.companyId === cid).length
  });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta no encontrada.' });
  res.status(404).send('Página no encontrada');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Error inesperado.' });
});

app.listen(PORT, () => {
  console.log(`Flor de Salada corriendo en http://localhost:${PORT}`);
});
