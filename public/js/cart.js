(function () {
  const KEY = 'florDeSaladaCart';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
    if (window.FlorLayout) window.FlorLayout.updateCartCount();
  }

  function addItem(item) {
    const cart = getCart();
    const signature = JSON.stringify({ id: item.productId, options: item.options });
    const existing = cart.find(i => JSON.stringify({ id: i.productId, options: i.options }) === signature);
    if (existing) existing.qty += item.qty;
    else cart.push(item);
    saveCart(cart);
  }

  function updateQty(index, qty) {
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].qty = Math.max(1, Number(qty) || 1);
    saveCart(cart);
  }

  function removeItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  }

  function clear() {
    saveCart([]);
  }

  function count() {
    return getCart().reduce((sum, i) => sum + Number(i.qty || 0), 0);
  }

  function total() {
    return getCart().reduce((sum, i) => sum + Number(i.unitPrice || i.price || 0) * Number(i.qty || 0), 0);
  }

  window.Cart = { getCart, saveCart, addItem, updateQty, removeItem, clear, count, total };
})();
