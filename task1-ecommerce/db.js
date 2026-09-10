const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn('sqlite3 native module not available, using JSON database');
}

const dbPath = path.join(__dirname, 'ecommerce.db');

class DatabaseService {
  constructor() {
    this.isSqlite = !!sqlite3;
    this.jsonDbPath = path.join(__dirname, 'ecommerce_data.json');
    this.ready = false;
    this.init();
  }

  async init() {
    if (this.isSqlite) {
      this.db = new sqlite3.Database(dbPath);
      await this.runSchema();
    } else {
      this.loadJsonDb();
    }
    await this.seedData();
    this.ready = true;
    console.log('E-Commerce Database ready.');
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.isSqlite && this.db) {
        this.db.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, changes: this.changes });
        });
      } else {
        // Fallback for json store
        resolve(this.runJson(sql, params));
      }
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.isSqlite && this.db) {
        this.db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      } else {
        resolve(this.allJson(sql, params));
      }
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.isSqlite && this.db) {
        this.db.get(sql, params, (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        });
      } else {
        resolve(this.getJson(sql, params));
      }
    });
  }

  async runSchema() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        original_price REAL,
        category TEXT NOT NULL,
        image TEXT,
        rating REAL DEFAULT 4.5,
        review_count INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 50,
        featured INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        city TEXT NOT NULL,
        zip_code TEXT NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'Credit Card',
        payment_status TEXT DEFAULT 'Paid',
        order_status TEXT DEFAULT 'Processing',
        items TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`
    ];

    for (const q of queries) {
      await this.run(q);
    }
  }

  loadJsonDb() {
    if (fs.existsSync(this.jsonDbPath)) {
      this.jsonData = JSON.parse(fs.readFileSync(this.jsonDbPath, 'utf8'));
    } else {
      this.jsonData = { users: [], products: [], orders: [], reviews: [] };
      this.saveJsonDb();
    }
  }

  saveJsonDb() {
    if (this.jsonDbPath && this.jsonData) {
      fs.writeFileSync(this.jsonDbPath, JSON.stringify(this.jsonData, null, 2));
    }
  }

  runJson(sql, params = []) {
    this.loadJsonDb();
    const cleanSql = sql.trim().toUpperCase();
    if (cleanSql.startsWith('INSERT INTO USERS')) {
      const id = (this.jsonData.users.length ? Math.max(...this.jsonData.users.map(u => u.id)) : 0) + 1;
      const user = { id, name: params[0], email: params[1], password: params[2], role: params[3] || 'customer', created_at: new Date().toISOString() };
      this.jsonData.users.push(user);
      this.saveJsonDb();
      return { id };
    }
    if (cleanSql.startsWith('INSERT INTO PRODUCTS')) {
      const id = (this.jsonData.products.length ? Math.max(...this.jsonData.products.map(p => p.id)) : 0) + 1;
      const prod = {
        id, name: params[0], description: params[1], price: Number(params[2]), original_price: Number(params[3]),
        category: params[4], image: params[5], rating: Number(params[6]), review_count: Number(params[7]),
        stock: Number(params[8]), featured: Number(params[9]), created_at: new Date().toISOString()
      };
      this.jsonData.products.push(prod);
      this.saveJsonDb();
      return { id };
    }
    if (cleanSql.startsWith('INSERT INTO ORDERS')) {
      const id = (this.jsonData.orders.length ? Math.max(...this.jsonData.orders.map(o => o.id)) : 0) + 1;
      const ord = {
        id, order_number: params[0], user_id: params[1], customer_name: params[2], customer_email: params[3],
        shipping_address: params[4], city: params[5], zip_code: params[6], total_amount: Number(params[7]),
        payment_method: params[8], payment_status: params[9], order_status: params[10], items: params[11],
        created_at: new Date().toISOString()
      };
      this.jsonData.orders.push(ord);
      this.saveJsonDb();
      return { id };
    }
    if (cleanSql.startsWith('INSERT INTO REVIEWS')) {
      const id = (this.jsonData.reviews.length ? Math.max(...this.jsonData.reviews.map(r => r.id)) : 0) + 1;
      const rev = { id, product_id: Number(params[0]), user_name: params[1], rating: Number(params[2]), comment: params[3], created_at: new Date().toISOString() };
      this.jsonData.reviews.push(rev);
      this.saveJsonDb();
      return { id };
    }
    if (cleanSql.startsWith('UPDATE ORDERS SET ORDER_STATUS')) {
      const order = this.jsonData.orders.find(o => o.id === Number(params[1]));
      if (order) order.order_status = params[0];
      this.saveJsonDb();
      return { changes: 1 };
    }
    if (cleanSql.startsWith('DELETE FROM PRODUCTS')) {
      this.jsonData.products = this.jsonData.products.filter(p => p.id !== Number(params[0]));
      this.saveJsonDb();
      return { changes: 1 };
    }
    return { id: 1, changes: 1 };
  }

  allJson(sql, params = []) {
    this.loadJsonDb();
    const cleanSql = sql.trim().toUpperCase();
    if (cleanSql.includes('FROM USERS')) return this.jsonData.users;
    if (cleanSql.includes('FROM PRODUCTS')) {
      let prods = [...this.jsonData.products];
      if (params.length > 0 && typeof params[0] === 'string' && params[0].startsWith('%')) {
        const query = params[0].replace(/%/g, '').toLowerCase();
        prods = prods.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
      }
      return prods;
    }
    if (cleanSql.includes('FROM ORDERS')) {
      if (params.length > 0) {
        return this.jsonData.orders.filter(o => o.user_id === Number(params[0])).reverse();
      }
      return [...this.jsonData.orders].reverse();
    }
    if (cleanSql.includes('FROM REVIEWS')) {
      if (params.length > 0) {
        return this.jsonData.reviews.filter(r => r.product_id === Number(params[0])).reverse();
      }
      return this.jsonData.reviews;
    }
    return [];
  }

  getJson(sql, params = []) {
    this.loadJsonDb();
    const cleanSql = sql.trim().toUpperCase();
    if (cleanSql.includes('FROM USERS WHERE EMAIL = ?')) {
      return this.jsonData.users.find(u => u.email.toLowerCase() === params[0].toLowerCase()) || null;
    }
    if (cleanSql.includes('FROM USERS WHERE ID = ?')) {
      return this.jsonData.users.find(u => u.id === Number(params[0])) || null;
    }
    if (cleanSql.includes('FROM PRODUCTS WHERE ID = ?')) {
      return this.jsonData.products.find(p => p.id === Number(params[0])) || null;
    }
    if (cleanSql.includes('FROM ORDERS WHERE ID = ?')) {
      return this.jsonData.orders.find(o => o.id === Number(params[0])) || null;
    }
    if (cleanSql.includes('FROM ORDERS WHERE ORDER_NUMBER = ?')) {
      return this.jsonData.orders.find(o => o.order_number === params[0]) || null;
    }
    return null;
  }

  async seedData() {
    const existingUsers = await this.all('SELECT * FROM users');
    if (existingUsers.length === 0) {
      const adminPass = await bcrypt.hash('admin123', 10);
      const userPass = await bcrypt.hash('user123', 10);

      await this.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin User', 'admin@store.com', adminPass, 'admin']
      );
      await this.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Demo Customer', 'customer@store.com', userPass, 'customer']
      );
    }

    const existingProducts = await this.all('SELECT * FROM products');
    if (existingProducts.length === 0) {
      const sampleProducts = [
        {
          name: 'Pro Wireless Noise-Cancelling Headphones',
          description: 'Immersive sound with active noise cancellation, 40-hour battery life, and ultra-soft memory foam ear cushions.',
          price: 199.99,
          original_price: 249.99,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60',
          rating: 4.8,
          review_count: 142,
          stock: 35,
          featured: 1
        },
        {
          name: 'Ultra-Slim Mechanical Gaming Keyboard',
          description: 'RGB customizable backlighting, tactile switches, aircraft-grade aluminum alloy body, and detachable USB-C cable.',
          price: 129.50,
          original_price: 159.00,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=60',
          rating: 4.7,
          review_count: 98,
          stock: 24,
          featured: 1
        },
        {
          name: 'Classic Minimalist Leather Watch',
          description: 'Sleek sapphire glass dial with genuine Italian leather strap. Water-resistant up to 50 meters.',
          price: 149.00,
          original_price: 180.00,
          category: 'Accessories',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60',
          rating: 4.9,
          review_count: 210,
          stock: 18,
          featured: 1
        },
        {
          name: 'Smart Fitness Tracker & Heart Monitor',
          description: 'Tracks SpO2, sleep, 24/7 heart rate, and 30+ workout modes. Full AMOLED touchscreen with 10-day battery.',
          price: 79.99,
          original_price: 99.99,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&auto=format&fit=crop&q=60',
          rating: 4.6,
          review_count: 85,
          stock: 40,
          featured: 0
        },
        {
          name: 'Ergonomic Executive Office Chair',
          description: 'High-back mesh breathable chair with adjustable lumbar support, 3D armrests, and smooth silent casters.',
          price: 289.00,
          original_price: 349.00,
          category: 'Home & Living',
          image: 'https://images.unsplash.com/photo-1580481077195-c22ae2499d63?w=800&auto=format&fit=crop&q=60',
          rating: 4.9,
          review_count: 67,
          stock: 12,
          featured: 1
        },
        {
          name: 'Ceramic Pour-Over Coffee Maker Set',
          description: 'Handcrafted matte ceramic dripper with heat-resistant glass carafe and stainless steel reusable filter.',
          price: 45.00,
          original_price: 55.00,
          category: 'Home & Living',
          image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=60',
          rating: 4.7,
          review_count: 53,
          stock: 60,
          featured: 0
        },
        {
          name: 'Vintage Denim Trucker Jacket',
          description: '100% premium heavyweight denim with reinforced stitching, sherpa fleece collar, and relaxed modern fit.',
          price: 89.95,
          original_price: 119.00,
          category: 'Fashion',
          image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=60',
          rating: 4.5,
          review_count: 74,
          stock: 25,
          featured: 1
        },
        {
          name: 'Urban Water-Resistant Laptop Backpack',
          description: 'TSA-friendly 16-inch laptop compartment, hidden anti-theft pocket, USB charging port, and breathable back padding.',
          price: 64.99,
          original_price: 79.99,
          category: 'Accessories',
          image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=60',
          rating: 4.8,
          review_count: 130,
          stock: 45,
          featured: 0
        }
      ];

      for (const p of sampleProducts) {
        const res = await this.run(
          `INSERT INTO products (name, description, price, original_price, category, image, rating, review_count, stock, featured)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.name, p.description, p.price, p.original_price, p.category, p.image, p.rating, p.review_count, p.stock, p.featured]
        );

        await this.run(
          `INSERT INTO reviews (product_id, user_name, rating, comment)
           VALUES (?, ?, ?, ?)`,
          [res.id, 'Alex Johnson', 5, 'Exceptional quality, super fast shipping! Will definitely buy again.']
        );
      }
    }
  }
}

const dbService = new DatabaseService();
module.exports = dbService;
