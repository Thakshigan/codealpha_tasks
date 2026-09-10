// Orders Tracking Page Logic
async function loadMyOrders() {
  const container = document.getElementById('orders-container');
  if (!container) return;

  if (!Auth.isLoggedIn()) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; background: white; border-radius: 12px; border: 1px solid var(--border);">
        <i class="fas fa-lock" style="font-size: 3rem; color: var(--muted); margin-bottom: 1rem;"></i>
        <h3>Please Sign In</h3>
        <p style="color: var(--muted); margin: 0.5rem 0 1.5rem;">You need to be logged in to view your order history.</p>
        <button onclick="Modal.openAuth('login')" class="auth-btn">Sign In to Account</button>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div style="text-align:center; padding:3rem;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i><p style="margin-top:0.5rem; color:var(--muted);">Loading orders...</p></div>';

  try {
    const res = await fetch('/api/orders/my-orders', {
      headers: {
        'Authorization': `Bearer ${Auth.getToken()}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch orders');

    renderOrdersList(data.orders || []);
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:2rem;">${err.message}</div>`;
  }
}

function renderOrdersList(orders) {
  const container = document.getElementById('orders-container');
  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; background: white; border-radius: 12px; border: 1px solid var(--border);">
        <i class="fas fa-box-open" style="font-size: 3rem; color: var(--muted); margin-bottom: 1rem;"></i>
        <h3>No Orders Placed Yet</h3>
        <p style="color: var(--muted); margin: 0.5rem 0 1.5rem;">Looks like you haven't placed any orders with us yet.</p>
        <a href="/" class="auth-btn" style="text-decoration: none; display: inline-block;">Start Shopping</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const statusColors = {
      'Processing': { bg: '#eff6ff', text: '#1d4ed8', icon: 'fa-cog fa-spin' },
      'Shipped': { bg: '#fef3c7', text: '#b45309', icon: 'fa-truck' },
      'Delivered': { bg: '#ecfdf5', text: '#047857', icon: 'fa-check-circle' },
      'Cancelled': { bg: '#fef2f2', text: '#b91c1c', icon: 'fa-times-circle' }
    };
    const s = statusColors[order.order_status] || statusColors['Processing'];

    return `
      <div style="background: white; border-radius: var(--radius); border: 1px solid var(--border); padding: 1.8rem; margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem;">
          <div>
            <div style="font-size: 0.82rem; color: var(--muted); text-transform: uppercase; font-weight: 700;">Order ID</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--dark); font-family: monospace;">${order.order_number}</div>
            <div style="font-size: 0.85rem; color: var(--muted); margin-top: 0.2rem;">Placed on ${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: ${s.bg}; color: ${s.text}; padding: 0.35rem 0.8rem; border-radius: 9999px; font-weight: 700; font-size: 0.85rem;">
              <i class="fas ${s.icon}"></i> ${order.order_status}
            </div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--dark); margin-top: 0.4rem;">$${Number(order.total_amount).toFixed(2)}</div>
          </div>
        </div>

        <!-- Items list -->
        <div style="margin-bottom: 1rem;">
          ${Array.isArray(order.items) ? order.items.map(item => `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px dashed #f1f5f9;">
              <img src="${item.image}" alt="${item.name}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'">
              <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 0.92rem;">${item.name}</div>
                <div style="font-size: 0.8rem; color: var(--muted);">Qty: ${item.quantity} × $${Number(item.price).toFixed(2)}</div>
              </div>
              <div style="font-weight: 700; font-size: 0.92rem;">$${(item.quantity * item.price).toFixed(2)}</div>
            </div>
          `).join('') : '<p style="color:var(--muted)">No item details</p>'}
        </div>

        <!-- Shipping & Tracking footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.85rem; color: var(--slate); background: var(--light); padding: 0.8rem 1rem; border-radius: 8px;">
          <div><i class="fas fa-map-marker-alt" style="color:var(--primary); margin-right:0.3rem;"></i> Ship to: <strong>${order.shipping_address}, ${order.city || ''}</strong></div>
          <div><i class="fas fa-credit-card" style="color:var(--primary); margin-right:0.3rem;"></i> Paid via: <strong>${order.payment_method || 'Credit Card'}</strong></div>
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  loadMyOrders();
});
