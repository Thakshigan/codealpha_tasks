# CodeAlpha_Social_Media_Platform

A rich, modern social media platform built for the **CodeAlpha Full Stack Development Internship (Task 2)**.

![Social Platform Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80)

---

## 🌟 Key Features

1. **User Profiles & Customization**:
   - Dynamic user profile pages (`@username`), cover banner, custom avatar, bio, location, and website links.
   - Live counters for Posts, Followers, and Following.
   - Profile edit modal with instant updates.

2. **Posts & Media Publishing**:
   - Create and publish text updates and image posts.
   - Real-time relative timestamps ("2m ago", "3h ago").
   - Syntax highlighting for hashtags (`#FullStack`) and mentions (`@alexrivera`).
   - Secure post deletion for content owners.

3. **Engagement System (Likes & Interactive Comments)**:
   - One-click Like / Unlike with heart animation and live counter sync.
   - Collapsible comment drawer with instant comment posting and threaded discussions.

4. **Follow / Unfollow Social Graph**:
   - Follow and unfollow creators with instant button toggle.
   - Dual Feed View: **Discover All** (Global community stream) vs **Following** (Personalized feed of followed users).

5. **Explore & User Discovery**:
   - Suggested creators sidebar widget.
   - Instant search and hashtag filtering on the Explore page.

6. **Authentication & Security**:
   - JWT-based authorization and bcrypt password hashing.
   - Protected routes and session persistence via LocalStorage.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Modern CSS3 (CSS Grid 3-column layout, Glassmorphism, animations), Vanilla JavaScript (ES6+ Modules, Fetch API).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite3 / JSON DB schema for users, posts, likes, comments, and follows.
- **Security**: JWT tokens, bcryptjs, CORS headers.

---

## 🚀 Getting Started

### 1. Installation

```bash
cd CodeAlpha_Social_Media_Platform
npm install
```

### 2. Start the Server

```bash
npm start
# Or
node server.js
```

The application will run at:
👉 **`http://localhost:3002`**

---

## 🔑 Demo Accounts

| Username | Email | Password |
|---|---|---|
| `alexrivera` | `alex@dev.com` | `password123` |
| `sarahchen` | `sarah@design.io` | `password123` |
| `marcusv` | `marcus@ai.org` | `password123` |

---

## 📁 Repository Structure

```
CodeAlpha_Social_Media_Platform/
├── db.js                 # SQLite / JSON database schema & seeding
├── server.js             # Express server setup
├── package.json          # Node dependencies & npm start script
├── middleware/
│   └── auth.js           # JWT authentication & optional tokens
├── routes/
│   ├── auth.js           # Register & login endpoints
│   ├── posts.js          # Posts, likes, and comments API
│   └── users.js          # Profiles, follow/unfollow, and explore API
├── public/
│   ├── index.html        # Main feed with 3-column layout
│   ├── profile.html      # User profile & posts stream
│   ├── explore.html      # Search & discovery page
│   ├── css/
│   │   └── style.css     # Responsive social media styling
│   └── js/
│       ├── app.js        # Global auth & toast notifications
│       ├── feed.js       # Live post streams, likes, comments
│       └── profile.js    # Profile data & follow graph
└── README.md
```

---

## 🎓 CodeAlpha Internship Verification
- **Task**: Task 2 - Social Media Platform
- **Domain**: Full Stack Development
- **GitHub Repository**: `CodeAlpha_Social_Media_Platform`
