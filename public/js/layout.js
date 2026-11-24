(function () {
  const path = location.pathname.replace(/\/+$/, '') || '/index.html';

  const titles = {
    '/index.html': 'Inicio',
    '/': 'Inicio',
    '/catalogo.html': 'Catálogo',
    '/producto.html': 'Ramo',
    '/carrito.html': 'Carrito',
    '/checkout.html': 'Checkout',
    '/login.html': 'Ingresar',
    '/registro.html': 'Registrarse',
    '/mis-pedidos.html': 'Mis pedidos',
    '/panel/index.html': 'Panel'
  };

  function isActive(href) {
    if (href === 'index.html') return path === '/' || path === '/index.html';
    return path === '/' + href;
  }

  function headerHTML(user) {
    const count = window.Cart ? window.Cart.count() : 0;
    const links = [
      ['index.html', 'Inicio'],
      ['catalogo.html', 'Catálogo'],
      ['mis-pedidos.html', 'Mis pedidos']
    ];
    if (user && ['admin', 'superadmin'].includes(user.role)) links.push(['panel/index.html', 'Panel']);

    const nav = links.map(([href, label]) =>
      `<a href="/${href}" class="${isActive(href) ? 'active' : ''}">${label}</a>`
    ).join('');

    const account = user
      ? `<span class="muted" style="font-size:.85rem">Hola, ${escapeHtml(user.name.split(' ')[0])}</span>
         <button class="btn btn-outline btn-small" id="logoutBtn">Salir</button>`
      : `<a class="btn btn-outline btn-small" href="/login.html">Ingresar</a>
         <a class="btn btn-light btn-small" href="/registro.html">Registrate</a>`;

    return `
      <header class="site-header">
        <div class="header-inner">
          <a class="brand" href="/index.html">
            <img src="/img/logo.svg" alt="Flor de Salada">
            <span>Flor de Salada<small>FLORES & DETALLES</small></span>
          </a>
          <nav class="nav">${nav}</nav>
          <div class="header-actions">
            ${account}
            <a class="cart-link" href="/carrito.html"><svg class="icon"><use href="/img/icons.svg#cart"></use></svg> Carrito <span class="cart-count" id="cartCount">${count}</span></a>
          </div>
        </div>
      </header>`;
  }

  function footerHTML() {
    return `
      <footer class="site-footer">
        <strong>Flor de Salada</strong> · Flores naturales, limpiapipas, cinta de raso y crochet.<br>
        Elegancia en cada detalle, en marfil, ciruela y dorado.
      </footer>`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (el && window.Cart) el.textContent = window.Cart.count();
  }

  function showToast(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.remove(), 3200);
  }

  async function init() {
    let user = null;
    try { user = (await window.api('/api/session')).user; } catch (e) { user = null; }
    window.currentUser = user;
    const header = document.getElementById('site-header');
    const footer = document.getElementById('site-footer');
    if (header) header.innerHTML = headerHTML(user);
    if (footer) footer.innerHTML = footerHTML();
    document.title = `${titles[path] || 'Flor de Salada'} · Flor de Salada`;
    const logout = document.getElementById('logoutBtn');
    if (logout) {
      logout.addEventListener('click', async () => {
        await window.api('/api/logout', { method: 'POST' });
        location.href = '/index.html';
      });
    }
    return user;
  }

  window.FlorLayout = { init, updateCartCount, showToast, escapeHtml };
})();
