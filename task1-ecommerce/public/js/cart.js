// Cart Page Logic
let discountAmount = 0;
let appliedPromo = '';

function renderCartPage() {
  const items = Cart.getItems();
  const tableContainer = document.getElementById('cart-items-container');
  const summaryContainer = document.getElementById('cart-summary-container');
  const emptyCartState = document.getElementById('empty-cart-state');
  const fullCartState = document.getElementById('full-cart-state');

  if (!tableContainer) return;

  if (items.length === 0) {
    if (emptyCartState) emptyCartState.style.display = 'block';
    if (fullCartState) fullCartState.style.display = 'none';
    return;
  }

  if (emptyCartState) emptyCartState.style.display = 'none';
  if (fullCartState) fullCartState.style.display = 'grid';

  const subtotal = Cart.getTotal();
  const shipping = subtotal > 150 ? 0 : 9.99;
  const tax = subtotal * 0.08; // 8% sales tax
  const finalTotal = Math.max(0, subtotal - discountAmount + (subtotal > 0 ? shipping : 0) + tax);

  tableContainer.innerHTML = items.map(item => `
    <div class="cart-item-row">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'">
      <div>
        <a href="/product.html?id=${item.id}" style="font-weight: 700; color: var(--dark); text-decoration: none; font-size: 1rem; display: block; margin-bottom: 0.2rem;">${item.name}</a>
        <span style="font-size: 0.8rem; color: var(--muted); text-transform: uppercase;">${item.category}</span>
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--primary); margin-top: 0.3rem;">$${item.price.toFixed(2)} each</div>
      </div>
      <div>
        <div class="quantity-control" style="margin: 0;">
          <button class="qty-btn" onclick="updateItemQty(${item.id}, ${item.quantity - 1})">-</button>
          <span style="width: 30px; text-align: center; font-weight: 700;">${item.quantity}</span>
          <button class="qty-btn" onclick="updateItemQty(${item.id}, ${item.quantity + 1})">+</button>
        </div>
      </div>
      <div style="font-weight: 800; font-size: 1.1rem; color: var(--dark); text-align: right;">
        $${(item.price * item.quantity).toFixed(2)}
      </div>
      <div style="text-align: right;">
        <button onclick="Cart.removeItem(${item.id}); renderCartPage();" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem; padding: 0.4rem;">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
  `).join('');

  summaryContainer.innerHTML = `
    <h3 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.8rem;">Order Summary</h3>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; font-size: 0.95rem; color: var(--slate);">
      <span>Subtotal (${Cart.getCount()} items)</span>
      <span style="font-weight: 700; color: var(--dark);">$${subtotal.toFixed(2)}</span>
    </div>

    ${discountAmount > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; font-size: 0.95rem; color: var(--success);">
        <span>Discount (${appliedPromo})</span>
        <span style="font-weight: 700;">-$${discountAmount.toFixed(2)}</span>
      </div>
    ` : ''}

    <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; font-size: 0.95rem; color: var(--slate);">
      <span>Estimated Shipping</span>
      <span style="font-weight: 700; color: var(--dark);">${shipping === 0 ? '<span style="color:var(--success)">FREE</span>' : '$' + shipping.toFixed(2)}</span>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 1.2rem; font-size: 0.95rem; color: var(--slate);">
      <span>Estimated Tax (8%)</span>
      <span style="font-weight: 700; color: var(--dark);">$${tax.toFixed(2)}</span>
    </div>

    <!-- Promo Code Input -->
    <div style="margin: 1.2rem 0; padding-top: 1rem; border-top: 1px solid var(--border);">
      <label style="font-size: 0.82rem; font-weight: 700; color: var(--muted); display: block; margin-bottom: 0.4rem;">PROMO CODE</label>
      <div style="display: flex; gap: 0.5rem;">
        <input type="text" id="promo-input" class="form-control" placeholder="Try CODEALPHA10" value="${appliedPromo}" style="text-transform: uppercase;">
        <button onclick="applyPromoCode()" class="auth-btn" style="white-space: nowrap; padding: 0 1rem;">Apply</button>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin: 1.5rem 0 1.8rem; font-size: 1.3rem; font-weight: 800; border-top: 2px solid var(--border); padding-top: 1rem;">
      <span>Total Amount</span>
      <span style="color: var(--primary);">$${finalTotal.toFixed(2)}</span>
    </div>

    <a href="/checkout.html" class="btn-block" style="text-align: center; text-decoration: none; display: block; font-size: 1.05rem;">
      Proceed to Checkout <i class="fas fa-arrow-right" style="margin-left: 0.5rem;"></i>
    </a>

    <div style="margin-top: 1.2rem; text-align: center; font-size: 0.8rem; color: var(--muted);">
      <i class="fas fa-shield-alt" style="color: var(--success);"></i> Guaranteed Safe & Secure Checkout
    </div>
  `;
}

function updateItemQty(id, qty) {
  Cart.updateQuantity(id, qty);
  renderCartPage();
}

function applyPromoCode() {
  const code = document.getElementById('promo-input').value.trim().toUpperCase();
  if (code === 'CODEALPHA10' || code === 'DISCOUNT10') {
    discountAmount = Cart.getTotal() * 0.10;
    appliedPromo = code;
    Toast.show('10% Promo Code Applied!', 'success');
  } else if (code === 'SAVE20') {
    discountAmount = Cart.getTotal() * 0.20;
    appliedPromo = code;
    Toast.show('20% Discount Applied!', 'success');
  } else {
    Toast.show('Invalid promo code. Try "CODEALPHA10"', 'error');
    discountAmount = 0;
    appliedPromo = '';
  }
  renderCartPage();
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();
});
