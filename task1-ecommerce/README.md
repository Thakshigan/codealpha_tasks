# CodeAlpha_Ecommerce_Store

A complete, modern, responsive full-stack E-Commerce web application built for the **CodeAlpha Full Stack Development Internship (Task 1)**.

![Project Banner](https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&auto=format&fit=crop&q=80)

---

## 🌟 Key Features

1. **User Authentication & Authorization**:
   - Secure registration & login with **bcrypt** password hashing and **JWT** (JSON Web Tokens).
   - Role-based authorization: **Customer** and **Administrator**.

2. **Dynamic Product Catalog & Filtering**:
   - Live category filtering (Electronics, Fashion, Home & Living, Accessories).
   - Real-time search query matching across names and descriptions.
   - Dynamic sorting (Price low-to-high, high-to-low, newest, highest rated).

3. **Detailed Product Pages & Reviews**:
   - High-resolution product images, discount badges, and stock counters.
   - Interactive star rating and customer review submission system.

4. **Shopping Cart & Checkout System**:
   - Persistent client-side cart management (local storage with instant count badges).
   - Promo code discounts (`CODEALPHA10`, `SAVE20`).
   - Multi-step checkout with real-time tax & shipping calculations.
   - Simulated payment gateways (Credit/Debit card, PayPal, COD).

5. **Order Processing & History Tracking**:
   - Order placement with unique tracking IDs (`ORD-...`).
   - Customer order timeline and fulfillment status (`Processing`, `Shipped`, `Delivered`).

6. **Admin Dashboard**:
   - Live sales analytics & revenue metrics.
   - Product inventory CRUD management (Add, view, delete).
   - Order fulfillment & status updates.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Modern Flexbox/Grid, Glassmorphism, CSS Variables), Vanilla JavaScript (ES6+ Modules, Fetch API).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite3 / Local File DB with automatic schema seeding.
- **Security**: Bcrypt.js, JSON Web Tokens (JWT), CORS.

---

## 🚀 Getting Started

### 1. Installation

```bash
cd CodeAlpha_Ecommerce_Store
npm install
```

### 2. Start the Application

```bash
npm start
# Or
node server.js
```

The application will launch on:
👉 **`http://localhost:3001`**

---

## 🔑 Demo Credentials

- **Admin Account**:
  - Email: `admin@store.com`
  - Password: `admin123`
- **Customer Account**:
  - Email: `customer@store.com`
  - Password: `user123`

---

## 📁 Repository Structure

```
CodeAlpha_Ecommerce_Store/
├── db.js                   # Database setup & schema initialization
├── server.js               # Express server entry point
├── package.json            # Node.js dependencies & scripts
├── middleware/
│   └── auth.js             # JWT verification & role validation
├── routes/
│   ├── auth.js             # Authentication endpoints
│   ├── products.js         # Products catalog & reviews API
│   └── orders.js           # Checkout & order processing API
├── public/
│   ├── index.html          # Main storefront & product catalog
│   ├── product.html        # Product detail & review submission
│   ├── cart.html           # Cart management & promo codes
│   ├── checkout.html       # Checkout & payment processing
│   ├── orders.html         # User order tracking
│   ├── admin.html          # Admin dashboard & management
│   ├── css/
│   │   └── style.css       # Responsive custom stylesheet
│   └── js/
│       ├── app.js          # Shared state & auth modal
│       ├── products.js     # Catalog rendering & filters
│       ├── product-detail.js # Product details & reviews
│       ├── cart.js         # Cart calculations
│       ├── checkout.js     # Order submission
│       ├── orders.js       # Order history fetching
│       └── admin.js        # Admin management logic
└── README.md
```

---

## 🎓 CodeAlpha Internship Verification
- **Task**: Task 1 - Simple E-commerce Store
- **Domain**: Full Stack Development
- **GitHub Repository**: `CodeAlpha_Ecommerce_Store`
