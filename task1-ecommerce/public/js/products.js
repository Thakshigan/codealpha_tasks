// Product Catalog Script
let currentCategory = 'All';
let currentSearch = '';
let currentSort = 'newest';
let allProducts = [];

async function loadCategories() {
  try {
    const res = await fetch('/api/products/categories');
    const data = await res.json();
    const container = document.getElementById('categories-container');
    if (!container) return;

    container.innerHTML = data.categories.map(cat => `
      <button class="category-chip ${cat === currentCategory ? 'active' : ''}" onclick="selectCategory('${cat}')">
        ${cat}
      </button>
    `).join('');
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

async function fetchProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary);"></i><p style="margin-top:0.5rem; color:var(--muted);">Loading products...</p></div>';

  try {
    const url = new URL('/api/products', window.location.origin);
    if (currentCategory !== 'All') url.searchParams.append('category', currentCategory);
    if (currentSearch) url.searchParams.append('search', currentSearch);
    if (currentSort) url.searchParams.append('sort', currentSort);

    const res = await fetch(url);
    const data = await res.json();
    allProducts = data.products || [];

    renderProducts(allProducts);
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger);">Failed to load products: ${err.message}</div>`;
  }
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  const countEl = document.getElementById('product-count');
  if (countEl) countEl.textContent = `Showing ${products.length} products`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; background: white; border-radius: 12px; border: 1px solid var(--border);">
        <i class="fas fa-search" style="font-size: 3rem; color: var(--muted); margin-bottom: 1rem;"></i>
        <h3>No products found</h3>
        <p style="color: var(--muted); margin-top: 0.5rem;">Try adjusting your category or search filter.</p>
        <button onclick="resetFilters()" style="margin-top: 1rem; padding: 0.6rem 1.2rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Reset Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(product => `
    <div class="product-card">
      <div class="card-img-wrap">
        <a href="/product.html?id=${product.id}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'">
        </a>
        ${product.featured ? '<span class="card-badge-feat">Featured</span>' : ''}
      </div>
      <div class="card-body">
        <span class="card-category">${product.category}</span>
        <a href="/product.html?id=${product.id}" class="card-title">${product.name}</a>
        <div class="card-rating">
          <i class="fas fa-star"></i>
          <strong>${product.rating.toFixed(1)}</strong>
          <span>(${product.review_count})</span>
        </div>
        <div class="card-footer">
          <div class="price-wrap">
            <span class="current-price">$${product.price.toFixed(2)}</span>
            ${product.original_price && product.original_price > product.price ? `<span class="original-price">$${product.original_price.toFixed(2)}</span>` : ''}
          </div>
          <button class="btn-add-cart" onclick="Cart.addItem(${JSON.stringify(product).replace(/"/g, '&quot;')})">
            <i class="fas fa-shopping-bag"></i> Add
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function selectCategory(cat) {
  currentCategory = cat;
  loadCategories();
  fetchProducts();
}

function handleSearch(event) {
  currentSearch = event.target.value.trim();
  fetchProducts();
}

function handleSortChange(event) {
  currentSort = event.target.value;
  fetchProducts();
}

function resetFilters() {
  currentCategory = 'All';
  currentSearch = '';
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  loadCategories();
  fetchProducts();
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  fetchProducts();
});
