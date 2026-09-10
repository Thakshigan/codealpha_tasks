// Checkout Page Logic
let checkoutTotal = 0;

function initCheckoutPage() {
  const items = Cart.getItems();
  if (items.length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  const subtotal = Cart.getTotal();
  const shipping = subtotal > 150 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  checkoutTotal = subtotal + shipping + tax;

  const itemsContainer = document.getElementById('checkout-items-summary');
  if (itemsContainer) {
    itemsContainer.innerHTML = items.map(item => `
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding-bottom: 0.8rem; border-bottom: 1px solid #f1f5f9;">
        <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--dark);">${item.name}</div>
          <div style="font-size: 0.8rem; color: var(--muted);">Qty: ${item.quantity} × $${item.price.toFixed(2)}</div>
        </div>
        <div style="font-weight: 700; font-size: 0.95rem; color: var(--dark);">$${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `).join('');
  }

  const summaryContainer = document.getElementById('checkout-cost-breakdown');
  if (summaryContainer) {
    summaryContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
        <span style="color: var(--slate);">Subtotal</span>
        <span style="font-weight: 600;">$${subtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
        <span style="color: var(--slate);">Shipping</span>
        <span style="font-weight: 600;">${shipping === 0 ? '<span style="color:var(--success)">FREE</span>' : '$' + shipping.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; font-size: 0.9rem;">
        <span style="color: var(--slate);">Tax (8%)</span>
        <span style="font-weight: 600;">$${tax.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 800; border-top: 2px solid var(--border); padding-top: 0.8rem;">
        <span>Total Due</span>
        <span style="color: var(--primary);">$${checkoutTotal.toFixed(2)}</span>
      </div>
    `;
  }

  // Pre-fill user data if logged in
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    const nameInput = document.getElementById('ship-name');
    const emailInput = document.getElementById('ship-email');
    if (nameInput && !nameInput.value) nameInput.value = user.name || '';
    if (emailInput && !emailInput.value) emailInput.value = user.email || '';
  }
}

async function handlePlaceOrder(event) {
  event.preventDefault();

  const name = document.getElementById('ship-name').value.trim();
  const email = document.getElementById('ship-email').value.trim();
  const address = document.getElementById('ship-address').value.trim();
  const city = document.getElementById('ship-city').value.trim();
  const zip = document.getElementById('ship-zip').value.trim();
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'Credit Card';

  const items = Cart.getItems();
  const user = Auth.getUser();

  const placeOrderBtn = document.getElementById('place-order-btn');
  placeOrderBtn.disabled = true;
  placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Secure Payment...';

  try {
    const payload = {
      customer_name: name,
      customer_email: email,
      shipping_address: address,
      city: city,
      zip_code: zip,
      payment_method: paymentMethod,
      items: items,
      total_amount: checkoutTotal,
      user_id: user ? user.id : null
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place order');

    // Clear cart on success
    Cart.clear();

    // Show order success modal / view
    showOrderSuccess(data.orderNumber, name, email, checkoutTotal);
  } catch (err) {
    Toast.show(err.message, 'error');
    placeOrderBtn.disabled = false;
    placeOrderBtn.innerHTML = '<i class="fas fa-lock"></i> Place Order Now';
  }
}

function showOrderSuccess(orderNumber, name, email, total) {
  const checkoutBox = document.getElementById('checkout-box');
  checkoutBox.innerHTML = `
    <div style="text-align: center; padding: 3rem 1.5rem;">
      <div style="width: 80px; height: 80px; background: #ecfdf5; color: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.5rem;">
        <i class="fas fa-check"></i>
      </div>
      <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--dark); margin-bottom: 0.5rem;">Thank You For Your Order!</h2>
      <p style="color: var(--muted); margin-bottom: 1.5rem;">Your order has been received and is now being processed.</p>

      <div style="background: var(--light); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); max-width: 450px; margin: 0 auto 2rem; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-size: 0.9rem;">
          <span style="color: var(--muted);">Order Number:</span>
          <strong>${orderNumber}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-size: 0.9rem;">
          <span style="color: var(--muted);">Customer:</span>
          <span>${name}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-size: 0.9rem;">
          <span style="color: var(--muted);">Confirmation Sent To:</span>
          <span>${email}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 800; border-top: 1px solid var(--border); padding-top: 0.6rem; margin-top: 0.6rem;">
          <span>Total Paid:</span>
          <span style="color: var(--primary);">$${Number(total).toFixed(2)}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: center; gap: 1rem;">
        <a href="/orders.html" class="auth-btn" style="text-decoration: none; padding: 0.75rem 1.5rem;">
          <i class="fas fa-truck"></i> View My Orders
        </a>
        <a href="/" class="auth-btn" style="text-decoration: none; background: var(--slate); padding: 0.75rem 1.5rem;">
          <i class="fas fa-arrow-left"></i> Continue Shopping
        </a>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  initCheckoutPage();
});
