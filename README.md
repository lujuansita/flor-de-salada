# 🌸 Flor de Salada

Tienda online de flores con **HTML + CSS puro**, JavaScript y un backend Node/Express con persistencia en JSON.

Paleta elegante: **marfil, ciruela profunda, rosa viejo y dorado**. Los emojis fueron reemplazados por ilustraciones e iconos SVG propios.

## Cómo correrlo

```bash
npm install
npm start
```

Abrí **http://localhost:3000**.

## Cuentas de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Cliente | cliente@flordesalada.com | cliente123 |
| Admin de empresa | admin@flordesalada.com | admin123 |
| Superadmin | super@flordesalada.com | super123 |

## Qué incluye

- Catálogo con flores **naturales, limpiapipas, cinta de raso y crochet**.
- Carga de productos con imágenes desde el panel (hasta 5 por producto).
- Promos y ramos prearmados.
- Personalización: cantidad de flores, color, envoltorio, moño, carta/frase y luces.
- Carrito con localStorage y checkout con **retiro en tienda** o **envío a domicilio**.
- Métodos de pago: **efectivo**, **transferencia bancaria** y **Mercado Pago** (simulado).
- Pedidos con estados: **pendiente → en preparación → enviado → entregado**.
- Reseñas de hasta **400 caracteres** con fotos.
- Multiempresa: cada empresa tiene sus propios productos, usuarios, pedidos y reseñas.
- Panel de administración y panel de superadmin para crear empresas.

## Estructura

```text
server.js          API y servidor estático
db.js              base de datos JSON + datos iniciales
data/db.json       datos persistidos (se crea automáticamente)
uploads/           imágenes subidas
public/index.html  y demás páginas HTML
public/css/styles.css
public/js/         api.js, cart.js, layout.js, app.js
public/img/        ilustraciones SVG iniciales
```

Los pagos son simulados: se guarda el método elegido, pero no se conecta con Mercado Pago real.
