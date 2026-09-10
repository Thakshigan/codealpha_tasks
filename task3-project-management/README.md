# CodeAlpha_Project_Management_Tool

A full-stack real-time collaborative Kanban & project management web application (similar to Trello and Asana) built for the **CodeAlpha Full Stack Development Internship (Task 3)**.

![Project Banner](https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80)

---

## 🌟 Key Features

1. **Workspaces & Project Management**:
   - Create custom team projects with customizable accent colors and descriptions.
   - Live dashboard metrics showing project completion percentages and progress bars.

2. **Interactive Kanban Boards**:
   - 4-Column Agile Kanban layout: `To Do`, `In Progress`, `In Review`, `Done`.
   - Native HTML5 Drag-and-Drop for moving task cards across columns.
   - Dynamic card counters on each column header.

3. **Task Cards & Assignments**:
   - Set priority levels (`Urgent`, `High`, `Medium`, `Low`) with visual badges.
   - Assign tasks to team members with avatar badges.
   - Set target due dates and deadlines.

4. **Task Communication & Discussion**:
   - In-depth task modal with threaded comments and discussion logs.
   - Real-time comment submission and instant view update.

5. **Real-Time WebSocket Synchronization (Socket.IO)**:
   - Live synchronization across multiple browser windows / tabs.
   - Moving cards, creating tasks, and adding comments broadcasts instantly to all active team members in the room.

6. **Activity Log & Audit Trail**:
   - Collapsible activity drawer tracking all actions (task moves, task creation, project updates).

---

## 🛠️ Tech Stack

- **Frontend**: HTML5 (Drag and Drop API), CSS3 (Flexbox/Grid, Glassmorphism, animations), Vanilla JavaScript (ES6 Modules, Socket.io Client).
- **Backend**: Node.js, Express.js, Socket.IO.
- **Database**: SQLite3 / JSON DB schema for projects, tasks, comments, activity logs, and users.
- **Authentication**: JWT, bcryptjs.

---

## 🚀 Getting Started

### 1. Installation

```bash
cd CodeAlpha_Project_Management_Tool
npm install
```

### 2. Start the Server

```bash
npm start
# Or
node server.js
```

The application will run on:
👉 **`http://localhost:3003`**

---

## 🔑 Demo Credentials

| Name | Email | Password | Role |
|---|---|---|---|
| Emily Watson | `emily@team.com` | `team123` | Project Lead |
| Liam Davis | `liam@team.com` | `team123` | Full Stack Engineer |
| Sophia Martinez | `sophia@team.com` | `team123` | UI/UX Designer |

---

## 📁 Repository Structure

```
CodeAlpha_Project_Management_Tool/
├── db.js                 # SQLite / JSON DB schema & seed data
├── server.js             # Express + Socket.IO real-time server
├── package.json          # Dependencies & scripts
├── middleware/
│   └── auth.js           # JWT authentication
├── routes/
│   ├── auth.js           # Auth & team members endpoints
│   ├── projects.js       # Projects listing & creation
│   └── tasks.js          # Task CRUD, status movement, & comments
├── public/
│   ├── index.html        # Projects dashboard & creation modal
│   ├── board.html        # Live Kanban board with drag-and-drop
│   ├── css/
│   │   └── style.css     # Kanban layout & card styling
│   └── js/
│       ├── app.js        # Auth state & project dashboard
│       └── board.js      # Drag-and-drop, Socket.io live sync, task modal
└── README.md
```

---

## 🎓 CodeAlpha Internship Verification
- **Task**: Task 3 - Project Management Tool
- **Domain**: Full Stack Development
- **GitHub Repository**: `CodeAlpha_Project_Management_Tool`
