const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, authenticateToken } = require('../middleware/auth');

// Get all products (with optional filtering, search, sorting)
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, featured } = req.query;
    let products = await db.all('SELECT * FROM products');

    if (category && category !== 'All') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (featured === 'true' || featured === '1') {
      products = products.filter(p => p.featured === 1);
    }

    if (sort === 'price-low') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      products.sort((a, b) => b.rating - a.rating);
    } else {
      // default newest
      products.sort((a, b) => b.id - a.id);
    }

    res.json({ count: products.length, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get unique categories
router.get('/categories', async (req, res) => {
  try {
    const products = await db.all('SELECT DISTINCT category FROM products');
    const categories = products.map(p => p.category).filter(Boolean);
    res.json({ categories: ['All', ...categories] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single product with reviews
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const reviews = await db.all('SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC', [productId]);
    res.json({ product: { ...product, reviews } });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// Add review to product
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ error: 'Rating and comment are required.' });
    }

    const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await db.run(
      'INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)',
      [productId, req.user.name, Number(rating), comment]
    );

    // Update product rating and review count
    const allReviews = await db.all('SELECT rating FROM reviews WHERE product_id = ?', [productId]);
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await db.run(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?',
      [Number(avgRating.toFixed(1)), allReviews.length, productId]
    );

    res.status(201).json({ message: 'Review added successfully', reviewId: result.id });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Admin: Create Product
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, price, original_price, category, image, stock, featured } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required.' });
    }

    const result = await db.run(
      `INSERT INTO products (name, description, price, original_price, category, image, rating, review_count, stock, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        Number(price),
        original_price ? Number(original_price) : Number(price),
        category,
        image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=60',
        5.0,
        0,
        stock ? Number(stock) : 50,
        featured ? 1 : 0
      ]
    );

    res.status(201).json({ message: 'Product created successfully', productId: result.id });
  } catch (error) {
    console.error('Admin create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Admin: Delete Product
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
