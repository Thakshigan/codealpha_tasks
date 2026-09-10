// Admin Dashboard Logic
async function initAdminPage() {
  if (!Auth.isAdmin()) {
    document.getElementById('admin-content').innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; background: white; border-radius: 12px; border: 1px solid var(--border);">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
        <h2>Admin Access Required</h2>
        <p style="color: var(--muted); margin: 0.5rem 0 1.5rem;">Please log in with the administrator account to access this panel.</p>
        <p style="font-size: 0.85rem; color: var(--slate); margin-bottom: 1.5rem;">Admin Email: <code>admin@store.com</code> / Password: <code>admin123</code></p>
        <button onclick="Modal.openAuth('login')" class="auth-btn">Sign In as Admin</button>
      </div>
    `;
    return;
  }

  loadAdminStats();
  loadAdminProducts();
  loadAdminOrders();
}

async function loadAdminStats() {
  try {
    const resOrders = await fetch('/api/orders/admin/all', {
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
    });
    const dataOrders = await resOrders.json();
    const orders = dataOrders.orders || [];

    const resProds = await fetch('/api/products');
    const dataProds = await resProds.json();
    const products = dataProds.products || [];

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    document.getElementById('stat-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-products').textContent = products.length;
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

async function loadAdminProducts() {
  const container = document.getElementById('admin-products-table-body');
  if (!container) return;

  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    const products = data.products || [];

    container.innerHTML = products.map(p => `
      <tr>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 0.8rem;">
          <img src="${p.image}" alt="${p.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'">
          <div>
            <strong style="font-size: 0.95rem; color: var(--dark);">${p.name}</strong>
            <div style="font-size: 0.8rem; color: var(--muted);">${p.category}</div>
          </div>
        </td>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9; font-weight: 700;">$${p.price.toFixed(2)}</td>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9;">${p.stock}</td>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9;">⭐ ${p.rating.toFixed(1)} (${p.review_count})</td>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9; text-align: right;">
          <button onclick="deleteProduct(${p.id})" style="background: #fee2e2; color: var(--danger); border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
            <i class="fas fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" style="color:var(--danger); padding:1rem;">Failed to load products</td></tr>`;
  }
}

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-table-body');
  if (!container) return;

  try {
    const res = await fetch('/api/orders/admin/all', {
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
    });
    const data = await res.json();
    const orders = data.orders || [];

    container.innerHTML = orders.map(o => `
      <tr>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-weight: 700;">${o.order_number}</td>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9;">
          <div><strong>${o.customer_name}</strong></div>
          <div style="font-size: 0.8rem; color: var(--muted);">${o.customer_email}</div>
        </td>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9; font-weight: 700;">$${o.total_amount.toFixed(2)}</td>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9;">
          <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding: 0.35rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
            <option value="Processing" ${o.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Shipped" ${o.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${o.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td style="padding: 1rem 0.8rem; border-bottom: 1px solid #f1f5f9; font-size: 0.82rem; color: var(--muted);">
          ${new Date(o.created_at).toLocaleDateString()}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" style="color:var(--danger); padding:1rem;">Failed to load orders</td></tr>`;
  }
}

async function handleAddProduct(event) {
  event.preventDefault();
  const name = document.getElementById('new-prod-name').value.trim();
  const price = document.getElementById('new-prod-price').value.trim();
  const original_price = document.getElementById('new-prod-orig-price').value.trim();
  const category = document.getElementById('new-prod-cat').value.trim();
  const image = document.getElementById('new-prod-img').value.trim();
  const stock = document.getElementById('new-prod-stock').value.trim();
  const description = document.getElementById('new-prod-desc').value.trim();

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Auth.getToken()}`
      },
      body: JSON.stringify({ name, price, original_price, category, image, stock, description })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add product');

    Toast.show('Product created successfully!', 'success');
    document.getElementById('add-product-form').reset();
    document.getElementById('add-product-modal').style.display = 'none';
    loadAdminStats();
    loadAdminProducts();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
    });
    if (!res.ok) throw new Error('Failed to delete product');

    Toast.show('Product removed', 'info');
    loadAdminStats();
    loadAdminProducts();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Auth.getToken()}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');

    Toast.show(`Order updated to ${newStatus}`, 'success');
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminPage();
});
