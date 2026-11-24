const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(String(password), salt, 64).toString('hex') };
}

function verifyPassword(password, user) {
  if (!user || !user.hash || !user.salt) return false;
  const actual = crypto.scryptSync(String(password), user.salt, 64);
  const expected = Buffer.from(user.hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function defaultOptions() {
  return {
    colors: [
      { name: 'Marfil', price: 0 },
      { name: 'Rosa viejo', price: 0 },
      { name: 'Ciruela', price: 0 },
      { name: 'Dorado', price: 100 },
      { name: 'Verde salvia', price: 100 }
    ],
    wrappings: [
      { name: 'Papel marfil', price: 0 },
      { name: 'Papel rosa viejo', price: 0 },
      { name: 'Tela lino', price: 250 },
      { name: 'Caja rígida', price: 500 }
    ],
    bows: [
      { name: 'Moño de raso', price: 0 },
      { name: 'Moño de yute', price: 0 },
      { name: 'Moño doble', price: 200 }
    ],
    extras: [
      { name: 'Carta', price: 300 },
      { name: 'Frase impresa', price: 200 },
      { name: 'Luces LED', price: 450 }
    ]
  };
}

function seed() {
  const company = {
    id: 'emp_flor_salada',
    name: 'Flor de Salada',
    slug: 'flor-de-salada',
    logo: '/img/logo.svg',
    active: true,
    createdAt: new Date().toISOString()
  };

  const superPass = hashPassword('super123');
  const adminPass = hashPassword('admin123');
  const buyerPass = hashPassword('cliente123');

  const users = [
    {
      id: 'usr_super', companyId: company.id, name: 'Super Admin', role: 'superadmin',
      email: 'super@flordesalada.com', salt: superPass.salt, hash: superPass.hash,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_admin', companyId: company.id, name: 'Admin Flor de Salada', role: 'admin',
      email: 'admin@flordesalada.com', salt: adminPass.salt, hash: adminPass.hash,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_cliente', companyId: company.id, name: 'Cliente demo', role: 'buyer',
      email: 'cliente@flordesalada.com', salt: buyerPass.salt, hash: buyerPass.hash,
      createdAt: new Date().toISOString()
    }
  ];

  const p = (id, name, type, price, image, description, extra = {}) => ({
    id, companyId: company.id, type, name, description, price,
    oldPrice: extra.oldPrice || null, stock: extra.stock ?? 20,
    images: [image], promo: !!extra.promo, prearmado: !!extra.prearmado,
    active: true, options: defaultOptions(), createdAt: new Date().toISOString()
  });

  const products = [
    p('prod_1', 'Ramo de rosas naturales', 'natural', 4500, '/img/flor-natural.svg',
      'Rosas frescas seleccionadas, armadas con césped y hojas verdes.'),
    p('prod_2', 'Ramo de lavanda y eucalipto', 'natural', 3900, '/img/flor-lavanda.svg',
      'Aroma suave y tonos ciruela, ideal para regalar.'),
    p('prod_3', 'Ramo de limpiapipas', 'limpiapipas', 3200, '/img/flor-limpiapipas.svg',
      'Flores de limpiapipas pintadas a mano, duraderas y originales.'),
    p('prod_4', 'Ramo de limpiapipas pastel', 'limpiapipas', 3600, '/img/flor-limpiapipas.svg',
      'Combinación de tonos pastel con envoltorio de papel marfil.'),
    p('prod_5', 'Ramo de cinta de raso', 'cinta_raso', 4200, '/img/flor-cinta.svg',
      'Flores de cinta de raso con brillo y terminación delicada.'),
    p('prod_6', 'Ramo de cinta de raso ciruela', 'cinta_raso', 4600, '/img/flor-cinta.svg',
      'Cintas de raso en tonos ciruela y marfil, con moño a juego.'),
    p('prod_7', 'Ramo de crochet', 'crochet', 5200, '/img/flor-crochet.svg',
      'Flores tejidas a crochet, una opción eterna y personalizada.'),
    p('prod_8', 'Ramo de crochet multicolor', 'crochet', 5800, '/img/flor-crochet.svg',
      'Mezcla de marfil, rosa viejo y dorado, tejido a mano.'),
    p('prod_9', 'Promo ramo prearmado Primavera', 'natural', 3900, '/img/flor-natural.svg',
      'Ramo prearmado con descuento: rosas, lavanda y eucalipto.',
      { oldPrice: 5200, promo: true, prearmado: true, stock: 12 }),
    p('prod_10', 'Promo ramo prearmado Crochet', 'crochet', 4900, '/img/flor-crochet.svg',
      'Ramo prearmado de crochet con carta y luces incluidas.',
      { oldPrice: 6500, promo: true, prearmado: true, stock: 8 })
  ];

  const orders = [
    {
      id: 'ord_demo_1', companyId: company.id, userId: 'usr_cliente',
      customerName: 'Cliente demo', email: 'cliente@flordesalada.com',
      items: [{ productId: 'prod_1', name: 'Ramo de rosas naturales', qty: 1, price: 4500, options: { color: 'Marfil', envoltorio: 'Papel marfil', moño: 'Moño de raso', extras: ['Carta'], cantidadFlores: 12, carta: 'Feliz cumple, mamá. Te quiero mucho.' } }],
      delivery: 'delivery', address: 'Av. Sarmiento 123, Luján',
      payment: 'mercadopago', status: 'pendiente', total: 4800,
      createdAt: new Date().toISOString()
    }
  ];

  const reviews = [
    {
      id: 'rev_demo_1', companyId: company.id, productId: 'prod_1', userId: 'usr_cliente',
      author: 'Cliente demo', text: 'Hermosas las flores, llegaron perfectas y el envoltorio marfil es precioso.',
      photos: [], approved: true, createdAt: new Date().toISOString()
    }
  ];

  return { companies: [company], users, products, orders, reviews };
}

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
      const initial = seed();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Error al cargar la base de datos:', err);
    const initial = seed();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

const state = { data: load() };

function get() {
  return state.data;
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(state.data, null, 2), 'utf8');
}

module.exports = { get, save, uid, hashPassword, verifyPassword, defaultOptions };
