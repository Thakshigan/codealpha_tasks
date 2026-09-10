const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Create Order (Checkout)
router.post('/', async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      shipping_address,
      city,
      zip_code,
      items,
      total_amount,
      payment_method,
      user_id
    } = req.body;

    if (!customer_name || !customer_email || !shipping_address || !items || !items.length) {
      return res.status(400).json({ error: 'Please provide all required shipping and cart details.' });
    }

    const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);

    const result = await db.run(
      `INSERT INTO orders (
        order_number, user_id, customer_name, customer_email,
        shipping_address, city, zip_code, total_amount,
        payment_method, payment_status, order_status, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        user_id || null,
        customer_name,
        customer_email,
        shipping_address,
        city || '',
        zip_code || '',
        Number(total_amount),
        payment_method || 'Credit Card',
        'Paid',
        'Processing',
        itemsJson
      ]
    );

    res.status(201).json({
      message: 'Order placed successfully',
      orderId: result.id,
      orderNumber,
      totalAmount: total_amount
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// Get user orders
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    let orders = await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    
    // Also check for orders with same email if user_id was null
    if (orders.length === 0) {
      const allOrders = await db.all('SELECT * FROM orders ORDER BY id DESC');
      orders = allOrders.filter(o => o.customer_email && o.customer_email.toLowerCase() === req.user.email.toLowerCase());
    }

    orders = orders.map(o => {
      try {
        o.items = JSON.parse(o.items);
      } catch (e) {
        o.items = [];
      }
      return o;
    });

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order by order number or id
router.get('/:idOrNumber', async (req, res) => {
  try {
    const param = req.params.idOrNumber;
    let order;
    if (!isNaN(param)) {
      order = await db.get('SELECT * FROM orders WHERE id = ?', [Number(param)]);
    }
    if (!order) {
      order = await db.get('SELECT * FROM orders WHERE order_number = ?', [param]);
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    try {
      order.items = JSON.parse(order.items);
    } catch (e) {
      order.items = [];
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Admin: Get all orders
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    let orders = await db.all('SELECT * FROM orders ORDER BY id DESC');
    orders = orders.map(o => {
      try {
        o.items = JSON.parse(o.items);
      } catch (e) {
        o.items = [];
      }
      return o;
    });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin orders' });
  }
});

// Admin: Update order status
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await db.run('UPDATE orders SET order_status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `Order status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
