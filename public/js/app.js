(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = value => window.FlorLayout.escapeHtml(value);
  const money = value => '$' + Number(value || 0).toLocaleString('es-AR');
  const icon = (name, cls = 'icon') => `<svg class="${cls}"><use href="/img/icons.svg#${name}"></use></svg>`;

  const typeLabels = {
    natural: 'Naturales', limpiapipas: 'Limpiapipas',
    cinta_raso: 'Cinta de raso', crochet: 'Crochet'
  };
  const statusLabels = {
    pendiente: 'Pendiente', 'en preparacion': 'En preparación',
    enviado: 'Enviado', entregado: 'Entregado'
  };

  function errorMessage(err) {
    window.FlorLayout.showToast(err.message || 'Ocurrió un error.');
  }

  function productCard(product) {
    const image = product.images && product.images[0] ? product.images[0] : '/img/logo.svg';
    return `
      <article class="card product-card">
        <div class="thumb"><img src="${esc(image)}" alt="${esc(product.name)}"></div>
        <div class="body">
          <div class="row" style="gap:6px">
            <span class="badge celeste">${esc(typeLabels[product.type] || product.type)}</span>
            ${product.promo ? '<span class="badge promo">Promo</span>' : ''}
            ${product.prearmado ? '<span class="badge">Prearmado</span>' : ''}
          </div>
          <h3>${esc(product.name)}</h3>
          <p>${esc(product.description)}</p>
          <div><span class="price">${money(product.price)}</span>
            ${product.oldPrice ? `<span class="old-price">${money(product.oldPrice)}</span>` : ''}</div>
          <a class="btn btn-primary btn-block btn-small" href="/producto.html?id=${encodeURIComponent(product.id)}">${icon('flower')} Personalizar</a>
        </div>
      </article>`;
  }

  // ---------- Inicio ----------
  async function initHome() {
    try {
      const [promos, all] = await Promise.all([
        window.api('/api/products?promo=1'),
        window.api('/api/products')
      ]);
      $('#promos').innerHTML = promos.length ? promos.map(productCard).join('') : '<p class="muted">Pronto vas a encontrar promos acá.</p>';
      $('#destacados').innerHTML = all.slice(0, 4).map(productCard).join('');
    } catch (err) { errorMessage(err); }
  }

  // ---------- Catálogo ----------
  async function initCatalogo() {
    const params = new URLSearchParams(location.search);
    const typeInput = $('#typeFilter');
    const searchInput = $('#searchInput');
    const promoInput = $('#promoFilter');
    if (typeInput) typeInput.value = params.get('type') || '';
    if (searchInput) searchInput.value = params.get('search') || '';
    if (promoInput) promoInput.checked = params.get('promo') === '1';

    async function load() {
      const query = new URLSearchParams();
      if (typeInput.value) query.set('type', typeInput.value);
      if (searchInput.value.trim()) query.set('search', searchInput.value.trim());
      if (promoInput.checked) query.set('promo', '1');
      try {
        const products = await window.api('/api/products?' + query.toString());
        $('#resultCount').textContent = `${products.length} producto${products.length === 1 ? '' : 's'}`;
        $('#catalogGrid').innerHTML = products.length
          ? products.map(productCard).join('')
          : `<div class="empty">${icon('flower', 'empty-icon')}<h3>No encontramos flores con esos filtros</h3><p>Probá con otra búsqueda.</p></div>`;
      } catch (err) { errorMessage(err); }
    }

    [typeInput, promoInput].forEach(el => el && el.addEventListener('change', load));
    if (searchInput) searchInput.addEventListener('input', load);
    await load();
  }

  // ---------- Producto ----------
  async function initProducto() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { $('#productoRoot').innerHTML = '<p class="error">No se indicó un ramo.</p>'; return; }

    let product;
    try { product = await window.api('/api/products/' + encodeURIComponent(id)); }
    catch (err) { $('#productoRoot').innerHTML = `<p class="error">${esc(err.message)}</p>`; return; }

    const state = {
      qty: 1,
      color: (product.options.colors[0] || {}).name || '',
      wrapping: (product.options.wrappings[0] || {}).name || '',
      bow: (product.options.bows[0] || {}).name || '',
      extras: []
    };

    const galleryImg = $('#galleryImg');
    galleryImg.src = product.images[0] || '/img/logo.svg';
    $('#productTitle').textContent = product.name;
    $('#productType').textContent = typeLabels[product.type] || product.type;
    $('#productDescription').textContent = product.description;
    $('#galleryThumbs').innerHTML = product.images.map((img, index) =>
      `<img src="${esc(img)}" class="${index === 0 ? 'active' : ''}" data-image="${esc(img)}" alt="Vista ${index + 1}">`
    ).join('');
    $$('#galleryThumbs img').forEach(img => img.addEventListener('click', () => {
      galleryImg.src = img.dataset.image;
      $$('#galleryThumbs img').forEach(i => i.classList.remove('active'));
      img.classList.add('active');
    }));

    function chips(group, options, key, multiple) {
      return options.map(option => {
        const selected = multiple
          ? state.extras.includes(option.name)
          : state[key] === option.name;
        return `<button type="button" class="chip ${selected ? 'selected' : ''}"
          data-group="${key}" data-value="${esc(option.name)}" data-price="${Number(option.price || 0)}">${esc(option.name)}
          ${Number(option.price) ? `<small> +${money(option.price)}</small>` : ''}</button>`;
      }).join('');
    }

    $('#optionGroups').innerHTML = `
      <div class="option-group">
        <h4>Cantidad de flores por ramo</h4>
        <div class="qty">
          <button type="button" id="qtyMinus">−</button>
          <input id="flowerQty" type="number" min="1" max="99" value="12" style="width:80px;text-align:center">
          <button type="button" id="qtyPlus">+</button>
          <span class="muted">flores</span>
        </div>
      </div>
      <div class="option-group"><h4>Color de las flores</h4><div class="chips">${chips('colors', product.options.colors, 'color', false)}</div></div>
      <div class="option-group"><h4>Envoltorio</h4><div class="chips">${chips('wrappings', product.options.wrappings, 'wrapping', false)}</div></div>
      <div class="option-group"><h4>Moño</h4><div class="chips">${chips('bows', product.options.bows, 'bow', false)}</div></div>
      <div class="option-group"><h4>Extras</h4><div class="chips">${chips('extras', product.options.extras, 'extras', true)}</div></div>
      <div class="field">
        <label for="cardText">Carta o frase (opcional)</label>
        <textarea id="cardText" maxlength="200" placeholder="Escribí un mensaje para acompañar el ramo..."></textarea>
      </div>`;

    function unitPrice() {
      return Number(product.price) + state.extras.reduce((sum, name) => {
        const extra = product.options.extras.find(e => e.name === name);
        return sum + Number(extra ? extra.price || 0 : 0);
      }, 0);
    }

    function updatePrice() {
      $('#unitPrice').textContent = money(unitPrice());
      $('#totalPrice').textContent = money(unitPrice() * state.qty);
      $('#qtyLabel').textContent = state.qty;
    }

    $('#optionGroups').addEventListener('click', event => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      const group = chip.dataset.group;
      const value = chip.dataset.value;
      if (group === 'extras') {
        state.extras = state.extras.includes(value)
          ? state.extras.filter(v => v !== value)
          : [...state.extras, value];
      } else {
        state[group] = value;
        $$(`#optionGroups .chip[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
      }
      chip.classList.toggle('selected', group === 'extras' ? state.extras.includes(value) : true);
      if (group !== 'extras') chip.classList.add('selected');
      updatePrice();
    });

    $('#qtyMinus').addEventListener('click', () => { state.qty = Math.max(1, state.qty - 1); updatePrice(); });
    $('#qtyPlus').addEventListener('click', () => { state.qty = Math.min(99, state.qty + 1); updatePrice(); });
    updatePrice();

    $('#addToCart').addEventListener('click', () => {
      const item = {
        productId: product.id, name: product.name,
        image: product.images[0] || '/img/logo.svg',
        price: Number(product.price), unitPrice: unitPrice(), qty: state.qty,
        options: {
          color: state.color, envoltorio: state.wrapping, moño: state.bow,
          cantidadFlores: Number($('#flowerQty').value || 12),
          carta: $('#cardText').value.trim(), extras: [...state.extras]
        }
      };
      window.Cart.addItem(item);
      window.FlorLayout.showToast('Ramo agregado al carrito');
    });

    async function loadReviews() {
      try {
        const reviews = await window.api('/api/reviews?productId=' + encodeURIComponent(product.id));
        $('#reviewsList').innerHTML = reviews.length ? reviews.map(review => `
          <div class="review">
            <div class="head"><span class="author">${esc(review.author)}</span><span class="muted">${new Date(review.createdAt).toLocaleDateString('es-AR')}</span></div>
            <p>${esc(review.text)}</p>
            ${review.photos.length ? `<div class="review-photos">${review.photos.map(photo => `<img src="${esc(photo)}" alt="Foto de la reseña">`).join('')}</div>` : ''}
          </div>`).join('') : '<p class="muted">Todavía no hay reseñas. ¡Podés ser el primero!</p>';
      } catch (err) { errorMessage(err); }
    }

    const reviewText = $('#reviewText');
    if (reviewText) reviewText.addEventListener('input', () => {
      const counter = $('#reviewCounter');
      counter.textContent = `${reviewText.value.length}/400 caracteres`;
      counter.classList.toggle('over', reviewText.value.length > 400);
    });

    $('#reviewForm').addEventListener('submit', async event => {
      event.preventDefault();
      if (!window.currentUser) {
        window.FlorLayout.showToast('Iniciá sesión para dejar una reseña.');
        location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
        return;
      }
      if ($('#reviewText').value.length > 400) {
        window.FlorLayout.showToast('La reseña no puede superar los 400 caracteres.');
        return;
      }
      const formData = new FormData(event.target);
      formData.set('productId', product.id);
      try {
        await window.api('/api/reviews', { method: 'POST', body: formData });
        event.target.reset();
        $('#reviewCounter').textContent = '0/400 caracteres';
        $('#reviewCounter').classList.remove('over');
        window.FlorLayout.showToast('¡Gracias por tu reseña!');
        await loadReviews();
      } catch (err) { errorMessage(err); }
    });

    await loadReviews();
  }

  // ---------- Carrito ----------
  function optionsSummary(options) {
    if (!options) return '';
    return [
      options.color && `Color: ${options.color}`,
      options.envoltorio && `Envoltorio: ${options.envoltorio}`,
      options.moño && `Moño: ${options.moño}`,
      options.cantidadFlores && `${options.cantidadFlores} flores`,
      options.extras && options.extras.length && `Extras: ${options.extras.join(', ')}`,
      options.carta && `Carta: "${options.carta}"`
    ].filter(Boolean).join(' · ');
  }

  function initCarrito() {
    const cart = window.Cart.getCart();
    if (!cart.length) {
      $('#cartContent').innerHTML = `<div class="empty">${icon('cart', 'empty-icon')}<h3>Tu carrito está vacío</h3><p>Elegí un ramo y personalizalo a tu gusto.</p><a class="btn btn-primary" href="/catalogo.html">Ver catálogo</a></div>`;
      return;
    }
    $('#cartContent').innerHTML = `
      <div class="grid two" style="grid-template-columns:1fr 320px;align-items:start">
        <div class="card">
          ${cart.map((item, index) => `
            <div class="cart-item">
              <img src="${esc(item.image || '/img/logo.svg')}" alt="${esc(item.name)}">
              <div>
                <strong>${esc(item.name)}</strong>
                <div class="opts">${esc(optionsSummary(item.options))}</div>
                <div class="price">${money(item.unitPrice)} c/u</div>
              </div>
              <div class="qty-col" style="text-align:right">
                <div class="qty" style="justify-content:flex-end">
                  <button data-index="${index}" data-delta="-1">−</button>
                  <span>${item.qty}</span>
                  <button data-index="${index}" data-delta="1">+</button>
                </div>
                <div style="margin-top:6px">${money(item.unitPrice * item.qty)}</div>
                <button class="btn btn-danger btn-small" data-remove="${index}" style="margin-top:6px">Quitar</button>
              </div>
            </div>`).join('')}
        </div>
        <div class="card summary">
          <h3>Resumen</h3>
          <div class="summary-line"><span>Productos</span><span>${cart.length}</span></div>
          <div class="summary-line total"><span>Total</span><span>${money(window.Cart.total())}</span></div>
          <p class="muted" style="font-size:.82rem">El envío se elige en el siguiente paso.</p>
          <a class="btn btn-primary btn-block" href="/checkout.html">Continuar compra</a>
          <a class="btn btn-outline btn-block" href="/catalogo.html" style="margin-top:8px">Seguir comprando</a>
        </div>
      </div>`;

    $$('[data-delta]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      window.Cart.updateQty(index, window.Cart.getCart()[index].qty + Number(button.dataset.delta));
      initCarrito();
    }));
    $$('[data-remove]').forEach(button => button.addEventListener('click', () => {
      window.Cart.removeItem(Number(button.dataset.remove));
      initCarrito();
    }));
  }

  // ---------- Checkout ----------
  function initCheckout() {
    if (!window.currentUser) {
      $('#checkoutContent').innerHTML = '<div class="card"><h2>Ingresá para comprar</h2><p class="muted">Necesitás una cuenta para confirmar tu pedido.</p><a class="btn btn-primary" href="/login.html?next=/checkout.html">Ingresar</a></div>';
      return;
    }
    const cart = window.Cart.getCart();
    if (!cart.length) {
      $('#checkoutContent').innerHTML = `<div class="empty">${icon('cart', 'empty-icon')}<h3>No hay productos para comprar</h3><a class="btn btn-primary" href="/catalogo.html">Ir al catálogo</a></div>`;
      return;
    }
    $('#checkoutContent').innerHTML = `
      <div class="grid two" style="grid-template-columns:1fr 320px;align-items:start">
        <form class="card" id="checkoutForm">
          <h2>Entrega y pago</h2>
          <div class="option-group">
            <h4>¿Cómo querés recibir tu pedido?</h4>
            <label class="check"><input type="radio" name="delivery" value="pickup" checked> Retirar en la tienda</label>
            <label class="check"><input type="radio" name="delivery" value="delivery"> Envío a domicilio</label>
          </div>
          <div class="field hidden" id="addressField">
            <label for="address">Dirección de envío</label>
            <input id="address" name="address" placeholder="Calle, número, localidad">
          </div>
          <div class="field">
            <label for="payment">Método de pago</label>
            <select id="payment" name="payment">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
            <small>Los pagos son simulados en esta versión.</small>
          </div>
          <button class="btn btn-primary btn-block" type="submit">Confirmar pedido</button>
        </form>
        <div class="card summary">
          <h3>Tu pedido</h3>
          ${cart.map(item => `<div class="summary-line"><span>${item.qty} × ${esc(item.name)}</span><span>${money(item.unitPrice * item.qty)}</span></div>`).join('')}
          <div class="summary-line total"><span>Total</span><span>${money(window.Cart.total())}</span></div>
        </div>
      </div>`;

    const form = $('#checkoutForm');
    $$('input[name="delivery"]').forEach(radio => radio.addEventListener('change', () => {
      $('#addressField').classList.toggle('hidden', radio.value !== 'delivery' || !radio.checked);
    }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const order = await window.api('/api/orders', {
          method: 'POST',
          body: {
            items: cart,
            delivery: form.querySelector('input[name="delivery"]:checked').value,
            address: $('#address').value,
            payment: $('#payment').value
          }
        });
        window.Cart.clear();
        $('#checkoutContent').innerHTML = `
          <div class="card center">
            <div style="color:var(--gold)">${icon('check', 'empty-icon')}</div>
            <h2>¡Pedido confirmado!</h2>
            <p>Tu número de pedido es <strong>${esc(order.id)}</strong>.</p>
            <p class="muted">Podés seguir su estado desde Mis pedidos.</p>
            <a class="btn btn-primary" href="/mis-pedidos.html">Ver mis pedidos</a>
          </div>`;
      } catch (err) {
        errorMessage(err);
        submit.disabled = false;
      }
    });
  }

  // ---------- Login / Registro ----------
  function initLogin() {
    $('#loginForm').addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const { user } = await window.api('/api/login', { method: 'POST', body: Object.fromEntries(new FormData(event.target)) });
        const next = new URLSearchParams(location.search).get('next');
        location.href = next || (['admin', 'superadmin'].includes(user.role) ? '/panel/index.html' : '/index.html');
      } catch (err) { errorMessage(err); }
    });
  }

  async function initRegistro() {
    try {
      const companies = await window.api('/api/companies');
      $('#companySelect').innerHTML = companies.map(c => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('');
    } catch (err) { errorMessage(err); }
    $('#registerForm').addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await window.api('/api/register', { method: 'POST', body: Object.fromEntries(new FormData(event.target)) });
        location.href = '/index.html';
      } catch (err) { errorMessage(err); }
    });
  }

  // ---------- Mis pedidos ----------
  async function initPedidos() {
    if (!window.currentUser) {
      $('#pedidosRoot').innerHTML = '<div class="card"><h2>Ingresá para ver tus pedidos</h2><a class="btn btn-primary" href="/login.html?next=/mis-pedidos.html">Ingresar</a></div>';
      return;
    }
    try {
      const orders = await window.api('/api/orders/mine');
      $('#pedidosRoot').innerHTML = orders.length ? orders.map(order => `
        <div class="card" style="margin-bottom:16px">
          <div class="section-head" style="margin-bottom:10px">
            <div><h3>Pedido ${esc(order.id)}</h3><span class="muted">${new Date(order.createdAt).toLocaleString('es-AR')}</span></div>
            <span class="badge ${esc(order.status)}">${esc(statusLabels[order.status] || order.status)}</span>
          </div>
          ${order.items.map(item => `<p style="margin:4px 0">${item.qty} × ${esc(item.name)} — ${money(item.unitPrice * item.qty)}</p>`).join('')}
          <p class="muted" style="font-size:.85rem">Entrega: ${order.delivery === 'pickup' ? 'Retiro en tienda' : esc(order.address)} · Pago: ${esc(order.payment)}</p>
          <div class="summary-line total"><span>Total</span><span>${money(order.total)}</span></div>
        </div>`).join('') : `<div class="empty">${icon('box', 'empty-icon')}<h3>Todavía no hiciste pedidos</h3><a class="btn btn-primary" href="/catalogo.html">Ver catálogo</a></div>`;
    } catch (err) { errorMessage(err); }
  }

  // ---------- Panel ----------
  async function initPanel() {
    const user = window.currentUser;
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      $('#panelRoot').innerHTML = '<div class="card"><h2>Acceso restringido</h2><p>Solo los administradores pueden entrar al panel.</p><a class="btn btn-primary" href="/login.html">Ingresar como administrador</a></div>';
      return;
    }

    const panel = document.body.dataset.panel || 'index';
    $$('.sidebar a').forEach(a => {
      if (a.getAttribute('href').endsWith('/' + (panel === 'index' ? 'index.html' : panel + '.html'))) a.classList.add('active');
    });

    if (panel === 'index') {
      try {
        const stats = await window.api('/api/stats');
        $('#stats').innerHTML = `
          <div class="stat"><strong>${stats.products}</strong><span>Productos</span></div>
          <div class="stat"><strong>${stats.orders}</strong><span>Pedidos</span></div>
          <div class="stat"><strong>${stats.pending}</strong><span>Pendientes</span></div>
          <div class="stat"><strong>${stats.reviews}</strong><span>Reseñas</span></div>
          <div class="stat"><strong>${stats.users}</strong><span>Usuarios</span></div>`;
      } catch (err) { errorMessage(err); }
    }

    if (panel === 'productos') {
      let editingId = null;
      let products = [];
      async function loadProducts() {
        products = await window.api('/api/products');
        $('#productList').innerHTML = products.map(p => `
          <tr>
            <td><img class="thumb-small" src="${esc((p.images[0] || '/img/logo.svg'))}" alt=""></td>
            <td>${esc(p.name)}<br><small class="muted">${esc(typeLabels[p.type])}</small></td>
            <td>${money(p.price)}</td><td>${p.stock}</td>
            <td>${p.promo ? '<span class="badge promo">Promo</span>' : ''} ${p.prearmado ? '<span class="badge">Prearmado</span>' : ''}</td>
            <td>
              <button class="btn btn-light btn-small" data-edit="${esc(p.id)}">Editar</button>
              <button class="btn btn-danger btn-small" data-delete="${esc(p.id)}">Borrar</button>
            </td>
          </tr>`).join('') || '<tr><td colspan="6" class="muted">No cargaste productos todavía.</td></tr>';
      }
      try { await loadProducts(); } catch (err) { errorMessage(err); }

      $('#productForm').addEventListener('submit', async event => {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          if (editingId) await window.api('/api/products/' + encodeURIComponent(editingId), { method: 'PUT', body: formData });
          else await window.api('/api/products', { method: 'POST', body: formData });
          event.target.reset();
          editingId = null;
          $('#formTitle').textContent = 'Cargar flor o ramo';
          $('#editingInfo').textContent = '';
          await loadProducts();
          window.FlorLayout.showToast('Producto guardado');
        } catch (err) { errorMessage(err); }
      });
      $('#productList').addEventListener('click', async event => {
        const edit = event.target.closest('[data-edit]');
        const del = event.target.closest('[data-delete]');
        if (edit) {
          const product = products.find(p => p.id === edit.dataset.edit);
          editingId = product.id;
          const form = $('#productForm');
          form.elements['name'].value = product.name;
          form.elements['type'].value = product.type;
          form.elements['description'].value = product.description;
          form.elements['price'].value = product.price;
          form.elements['oldPrice'].value = product.oldPrice || '';
          form.elements['stock'].value = product.stock;
          form.elements['promo'].checked = product.promo;
          form.elements['prearmado'].checked = product.prearmado;
          $('#formTitle').textContent = 'Editar producto';
          $('#editingInfo').textContent = 'Editando: ' + product.name;
          form.scrollIntoView({ behavior: 'smooth' });
        }
        if (del && confirm('¿Borrar este producto?')) {
          try {
            await window.api('/api/products/' + encodeURIComponent(del.dataset.delete), { method: 'DELETE' });
            await loadProducts();
          } catch (err) { errorMessage(err); }
        }
      });
    }

    if (panel === 'pedidos') {
      async function loadOrders() {
        try {
          const orders = await window.api('/api/orders');
          $('#orderList').innerHTML = orders.map(order => {
            const notes = (order.items || [])
              .filter(i => i.options && i.options.carta)
              .map(i => `<div class="card-note"><strong>${esc(i.name)}</strong><br>“${esc(i.options.carta)}”</div>`)
              .join('');
            return `
            <tr>
              <td>${esc(order.id)}<br><small class="muted">${new Date(order.createdAt).toLocaleDateString('es-AR')}</small></td>
              <td>${esc(order.customerName)}</td>
              <td>${order.items.map(i => `${i.qty} × ${esc(i.name)}`).join('<br>')}</td>
              <td>${notes || '<span class="muted">Sin carta</span>'}</td>
              <td>${order.delivery === 'pickup' ? 'Retiro' : esc(order.address)}<br><small class="muted">${esc(order.payment)}</small></td>
              <td><strong>${money(order.total)}</strong></td>
              <td>
                <span class="badge ${esc(order.status)}">${esc(statusLabels[order.status] || order.status)}</span>
                <select data-order="${esc(order.id)}" style="margin-top:6px">
                  ${Object.keys(statusLabels).map(status => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${statusLabels[status]}</option>`).join('')}
                </select>
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" class="muted">Todavía no hay pedidos.</td></tr>';
          $$('[data-order]').forEach(select => select.addEventListener('change', async () => {
            try {
              await window.api('/api/orders/' + encodeURIComponent(select.dataset.order) + '/status', {
                method: 'PATCH', body: { status: select.value }
              });
              window.FlorLayout.showToast('Estado actualizado');
              await loadOrders();
            } catch (err) { errorMessage(err); }
          }));
        } catch (err) { errorMessage(err); }
      }
      await loadOrders();
    }

    if (panel === 'usuarios') {
      async function loadUsers() {
        try {
          const users = await window.api('/api/users');
          $('#userList').innerHTML = users.map(u => `
            <tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><span class="badge celeste">${esc(u.role)}</span></td></tr>
          `).join('');
        } catch (err) { errorMessage(err); }
      }
      await loadUsers();
      $('#userForm').addEventListener('submit', async event => {
        event.preventDefault();
        try {
          await window.api('/api/users', { method: 'POST', body: Object.fromEntries(new FormData(event.target)) });
          event.target.reset();
          await loadUsers();
          window.FlorLayout.showToast('Usuario creado');
        } catch (err) { errorMessage(err); }
      });
    }

    if (panel === 'resenas') {
      async function loadReviews() {
        try {
          const reviews = await window.api('/api/reviews/admin');
          $('#reviewList').innerHTML = reviews.map(r => `
            <div class="review">
              <div class="head">
                <span class="author">${esc(r.author)} · ${esc(r.productId || 'General')}</span>
                <span class="muted">${new Date(r.createdAt).toLocaleDateString('es-AR')}</span>
              </div>
              <p>${esc(r.text)}</p>
              ${r.photos.length ? `<div class="review-photos">${r.photos.map(p => `<img src="${esc(p)}" alt="Foto">`).join('')}</div>` : ''}
              <button class="btn ${r.approved ? 'btn-danger' : 'btn-light'} btn-small" data-review="${esc(r.id)}" data-approved="${!r.approved}">
                ${r.approved ? 'Ocultar' : 'Aprobar'}
              </button>
            </div>`).join('') || '<p class="muted">No hay reseñas todavía.</p>';
          $$('[data-review]').forEach(button => button.addEventListener('click', async () => {
            try {
              await window.api('/api/reviews/' + encodeURIComponent(button.dataset.review), {
                method: 'PATCH', body: { approved: button.dataset.approved === 'true' }
              });
              await loadReviews();
            } catch (err) { errorMessage(err); }
          }));
        } catch (err) { errorMessage(err); }
      }
      await loadReviews();
    }

    if (panel === 'empresas') {
      if (user.role !== 'superadmin') {
        $('#empresasRoot').innerHTML = '<div class="card"><h2>Solo superadministradores</h2><p>Solo el superadmin puede crear nuevas empresas.</p></div>';
        return;
      }
      async function loadCompanies() {
        const companies = await window.api('/api/companies');
        $('#companyList').innerHTML = companies.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.slug)}</td><td><span class="badge">Activa</span></td></tr>`).join('');
      }
      await loadCompanies();
      $('#companyForm').addEventListener('submit', async event => {
        event.preventDefault();
        try {
          await window.api('/api/companies', { method: 'POST', body: Object.fromEntries(new FormData(event.target)) });
          event.target.reset();
          await loadCompanies();
          window.FlorLayout.showToast('Empresa creada con su administrador');
        } catch (err) { errorMessage(err); }
      });
    }
  }

  const pages = {
    home: initHome,
    catalogo: initCatalogo,
    producto: initProducto,
    carrito: initCarrito,
    checkout: initCheckout,
    login: initLogin,
    registro: initRegistro,
    pedidos: initPedidos,
    panel: initPanel
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await window.FlorLayout.init();
    const init = pages[document.body.dataset.page];
    if (init) await init();
  });
})();
