// Product Detail Page Logic
let currentProduct = null;
let currentQuantity = 1;

async function loadProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    window.location.href = '/';
    return;
  }

  const container = document.getElementById('product-detail-container');
  try {
    const res = await fetch(`/api/products/${productId}`);
    if (!res.ok) throw new Error('Product not found');
    const data = await res.json();
    currentProduct = data.product;

    renderProductDetail(currentProduct);
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem; background: white; border-radius: 12px;">
        <h2>Product Not Found</h2>
        <p style="color: var(--muted); margin: 1rem 0;">The requested product does not exist or has been removed.</p>
        <a href="/" class="auth-btn" style="text-decoration: none; display: inline-block;">Back to Store</a>
      </div>
    `;
  }
}

function renderProductDetail(product) {
  document.title = `${product.name} — AlphaStore`;

  const container = document.getElementById('product-detail-container');
  const discountPercent = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  container.innerHTML = `
    <div class="detail-layout">
      <!-- Gallery -->
      <div class="detail-gallery">
        <img id="main-product-img" src="${product.image}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'">
      </div>

      <!-- Info -->
      <div class="detail-info">
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
          <span class="card-category">${product.category}</span>
          ${product.stock > 0 ? '<span style="font-size: 0.75rem; background: #ecfdf5; color: var(--success); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">IN STOCK (' + product.stock + ')</span>' : '<span style="font-size: 0.75rem; background: #fef2f2; color: var(--danger); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">OUT OF STOCK</span>'}
        </div>

        <h1>${product.name}</h1>

        <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1rem;">
          <div class="card-rating" style="margin: 0;">
            <i class="fas fa-star"></i>
            <strong style="font-size: 1rem;">${product.rating.toFixed(1)}</strong>
            <span style="font-size: 0.9rem;">(${product.review_count} verified reviews)</span>
          </div>
        </div>

        <div class="detail-price-box">
          <span style="font-size: 2.2rem; font-weight: 800; color: var(--primary);">$${product.price.toFixed(2)}</span>
          ${product.original_price && product.original_price > product.price ? `
            <span style="font-size: 1.2rem; color: var(--muted); text-decoration: line-through;">$${product.original_price.toFixed(2)}</span>
            <span style="background: #fef3c7; color: #b45309; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">SAVE ${discountPercent}%</span>
          ` : ''}
        </div>

        <p class="detail-desc">${product.description || 'No description provided.'}</p>

        <!-- Quantity & Add to Cart -->
        <div style="margin: 2rem 0;">
          <label style="font-weight: 700; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Quantity</label>
          <div class="quantity-control">
            <button class="qty-btn" onclick="changeQty(-1)">-</button>
            <input type="number" id="qty-input" class="qty-input" value="1" min="1" max="${product.stock}" readonly>
            <button class="qty-btn" onclick="changeQty(1)">+</button>
          </div>

          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button class="btn-block" style="flex: 1;" onclick="addCurrentToCart()">
              <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
            <button class="btn-block" style="flex: 1; background: var(--dark);" onclick="buyNow()">
              <i class="fas fa-bolt"></i> Buy Now
            </button>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border); padding-top: 1.5rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; font-size: 0.85rem; color: var(--slate);">
          <div><i class="fas fa-truck" style="color:var(--primary); margin-right:0.4rem;"></i> Free Express Delivery</div>
          <div><i class="fas fa-shield-alt" style="color:var(--primary); margin-right:0.4rem;"></i> 2 Year Warranty</div>
          <div><i class="fas fa-undo" style="color:var(--primary); margin-right:0.4rem;"></i> 30-Day Money Back</div>
          <div><i class="fas fa-lock" style="color:var(--primary); margin-right:0.4rem;"></i> Secure Checkout</div>
        </div>
      </div>
    </div>

    <!-- Reviews Section -->
    <div style="background: white; border-radius: var(--radius); border: 1px solid var(--border); padding: 2rem; margin-bottom: 3rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
        <div>
          <h2>Customer Reviews</h2>
          <p style="color: var(--muted); font-size: 0.9rem;">What real buyers are saying about this product</p>
        </div>
        <button onclick="toggleReviewForm()" class="auth-btn" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
          <i class="fas fa-pen"></i> Write a Review
        </button>
      </div>

      <!-- Add Review Form -->
      <div id="review-form-container" style="display: none; background: var(--light); padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; border: 1px solid var(--border);">
        <h4 style="margin-bottom: 1rem;">Write Your Review</h4>
        <form onsubmit="event.preventDefault(); submitReview();">
          <div class="form-group">
            <label class="form-label">Your Rating</label>
            <select id="review-rating" class="form-control" style="max-width: 200px;" required>
              <option value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
              <option value="4">⭐⭐⭐⭐ (4 - Very Good)</option>
              <option value="3">⭐⭐⭐ (3 - Average)</option>
              <option value="2">⭐⭐ (2 - Poor)</option>
              <option value="1">⭐ (1 - Terrible)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Review Comment</label>
            <textarea id="review-comment" class="form-control" rows="3" placeholder="Share your experience with this product..." required></textarea>
          </div>
          <button type="submit" class="auth-btn">Submit Review</button>
        </form>
      </div>

      <!-- Reviews List -->
      <div id="reviews-list">
        ${product.reviews && product.reviews.length > 0 ? product.reviews.map(r => `
          <div style="padding: 1.2rem 0; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
                  ${r.user_name ? r.user_name[0].toUpperCase() : 'U'}
                </div>
                <strong>${r.user_name || 'Anonymous Customer'}</strong>
              </div>
              <div style="color: #eab308; font-size: 0.85rem;">
                ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
              </div>
            </div>
            <p style="color: var(--slate); font-size: 0.95rem; margin-top: 0.4rem;">${r.comment}</p>
            <span style="font-size: 0.75rem; color: var(--muted); margin-top: 0.3rem; display: block;">${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
        `).join('') : '<p style="color: var(--muted); text-align: center; padding: 2rem;">No reviews yet. Be the first to review this product!</p>'}
      </div>
    </div>
  `;
}

function changeQty(amount) {
  const input = document.getElementById('qty-input');
  let val = parseInt(input.value) + amount;
  if (val < 1) val = 1;
  if (currentProduct && val > currentProduct.stock) val = currentProduct.stock;
  input.value = val;
  currentQuantity = val;
}

function addCurrentToCart() {
  if (!currentProduct) return;
  Cart.addItem(currentProduct, currentQuantity);
}

function buyNow() {
  if (!currentProduct) return;
  Cart.addItem(currentProduct, currentQuantity);
  window.location.href = '/checkout.html';
}

function toggleReviewForm() {
  if (!Auth.isLoggedIn()) {
    Toast.show('Please login to write a review', 'error');
    Modal.openAuth('login');
    return;
  }
  const form = document.getElementById('review-form-container');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function submitReview() {
  if (!Auth.isLoggedIn()) {
    Modal.openAuth('login');
    return;
  }
  const rating = document.getElementById('review-rating').value;
  const comment = document.getElementById('review-comment').value.trim();

  try {
    const res = await fetch(`/api/products/${currentProduct.id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Auth.getToken()}`
      },
      body: JSON.stringify({ rating, comment })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit review');

    Toast.show('Review submitted successfully!', 'success');
    loadProductDetail();
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProductDetail();
});
