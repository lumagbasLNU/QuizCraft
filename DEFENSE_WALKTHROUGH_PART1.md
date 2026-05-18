# QuizCraft System — Thesis Defense Walkthrough (Part 1)
## Architecture, Routing, Data Flow & File Map

---

## 1. Overall System Architecture (The Big Picture)

QuizCraft is a **full-stack web application** built on a **Client-Server architecture** using the **MEN stack** (MongoDB, Express.js, Node.js) with a vanilla HTML/CSS/JS frontend.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│  HTML Pages + CSS + Vanilla JavaScript                          │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐   │
│  │login.html│ │dashboard  │ │create_quiz │ │ take_quiz     │   │
│  │          │ │.html      │ │.html       │ │ .html         │   │
│  └────┬─────┘ └─────┬─────┘ └─────┬──────┘ └──────┬────────┘   │
│       │             │             │               │             │
│       ▼             ▼             ▼               ▼             │
│   auth.js      dashboard.js  create_quiz.js   take_quiz.js      │
│       │             │             │               │             │
│       └─────────────┴──────┬──────┴───────────────┘             │
│                            ▼                                    │
│                    ┌──────────────┐                              │
│                    │   api.js     │  ◄── Injects JWT token       │
│                    │ fetchWithAuth│      into every request      │
│                    └──────┬───────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │  HTTP Requests (fetch)
                            │  Authorization: Bearer <JWT>
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js + Express)                  │
│                         server.js                               │
│                                                                 │
│  Middleware:  cors → express.json → authenticateToken            │
│                                                                 │
│  API Routes:                                                    │
│  POST /api/register    POST /api/login                          │
│  GET  /api/user        PUT  /api/user/settings                  │
│  GET  /api/quizzes/community    GET /api/quizzes/my-quizzes     │
│  GET  /api/quizzes/:shareCode   POST /api/quizzes/create        │
│  POST /api/quizzes/:shareCode/submit                            │
│  PUT  /api/quizzes/:shareCode   DELETE /api/quizzes/:shareCode  │
│  GET  /api/user/history                                         │
│  GET  /api/admin/stats  GET /api/admin/quizzes                  │
│                                                                 │
│  Page Routes: /, /login, /register, /dashboard,                 │
│               /admin-dashboard, /create_quiz, /edit_quiz,       │
│               /take_quiz, /quiz_history, /quiz_result            │
└────────────────────────────┬────────────────────────────────────┘
                             │  Mongoose ODM
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB Atlas)                      │
│                                                                 │
│  Collections:                                                   │
│  ┌────────┐  ┌────────┐  ┌───────────┐  ┌──────────┐           │
│  │ users  │  │ quizzes│  │ questions │  │ attempts │           │
│  └────────┘  └────────┘  └───────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### How to explain this to the panel:
> "QuizCraft follows a Client-Server architecture. The **frontend** is built with vanilla HTML, CSS, and JavaScript. The **backend** is a single Node.js server using Express.js that exposes RESTful API endpoints. The **database** is MongoDB Atlas, accessed through the Mongoose ODM. Communication between frontend and backend uses the Fetch API with JWT-based authentication."

---

## 2. Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, Vanilla JS | User interface, forms, rendering |
| Backend | Node.js + Express.js v5 | API server, routing, business logic |
| Database | MongoDB Atlas + Mongoose v9 | Data persistence, schema validation |
| Auth | JSON Web Tokens (JWT) + bcrypt | Stateless authentication, password hashing |
| AI Engine | Google Gemini 2.5 Flash | Smart Review explanations for wrong answers |
| Deployment | Render.com | Cloud hosting with health checks |
| Design | Glassmorphism + Inter font | Modern, premium UI aesthetic |

---

## 3. Project File Structure & Purpose of Every File

```
Quiz-App-With-AI--main/
│
├── server.js              ★ THE BRAIN — All backend logic in one file
├── package.json           ★ Dependencies & start script
├── .env                   ★ Secret keys (never commit this)
├── render.yaml            ★ Render.com deployment blueprint
│
├── models/                ★ DATABASE SCHEMAS (Mongoose)
│   ├── User.js            → User accounts (username, email, password_hash, role, smartReview)
│   ├── Quiz.js            → Quiz metadata (title, shareCode, creatorId, isCommunity, thumbnail)
│   ├── Question.js        → Individual questions (text, type, options, correctAnswer)
│   └── Attempt.js         → Quiz attempt records (score, percent, smartReviewData)
│
└── QuizCraft/             ★ FRONTEND (served as static files)
    ├── css/
    │   ├── style.css      → Main stylesheet (62KB — all pages except admin)
    │   └── admin.css      → Admin dashboard specific styles
    │
    ├── js/
    │   ├── api.js          ★ fetchWithAuth() — JWT injection wrapper
    │   ├── auth.js         ★ handleAuth() — Login & Registration logic
    │   ├── navbar.js       ★ Shared navbar + Settings modal + Quiz type modal
    │   ├── dashboard.js    → User dashboard (quiz cards, tabs, join quiz)
    │   ├── admin.js        → Admin dashboard (stats, quiz table, CRUD)
    │   ├── create_quiz.js  → Dynamic question builder for new quizzes
    │   ├── edit_quiz.js    → Pre-fills existing quiz data for editing
    │   ├── take_quiz.js    → Quiz taking engine (render questions, submit)
    │   ├── quiz_result.js  → Results page with score circle + AI review cards
    │   ├── quiz_history.js → Paginated history of all past attempts
    │   └── manage-quizzes.js → Legacy admin table (redirected to admin dashboard)
    │
    ├── templates/
    │   ├── login.html         → Login form page
    │   ├── register.html      → Registration form page
    │   ├── dashboard.html     → User home (Community + My Quizzes tabs)
    │   ├── admin-dashboard.html → Admin command center
    │   ├── create_quiz.html   → Quiz creation form
    │   ├── edit_quiz.html     → Quiz editing form
    │   ├── take_quiz.html     → Quiz taking interface
    │   ├── quiz_result.html   → Score display + Smart Review
    │   ├── quiz_history.html  → Past attempt records
    │   └── manage-quizzes.html → Legacy page (unused, redirects)
    │
    └── assets/             → SVG logos, icons, backgrounds
```

---

## 4. HTML ↔ JS File Connection Map

Every HTML page loads specific JS files via `<script>` tags at the bottom of `<body>`:

| HTML Page | JS Files Loaded | Purpose |
|-----------|----------------|---------|
| `login.html` | `auth.js` | Handles login form submission |
| `register.html` | `auth.js` | Handles registration form submission |
| `dashboard.html` | `api.js` → `navbar.js` → `dashboard.js` | User home with quiz browsing |
| `admin-dashboard.html` | `api.js` → `admin.js` | Admin stats + quiz management table |
| `create_quiz.html` | `api.js` → `navbar.js` → `create_quiz.js` | Dynamic quiz builder |
| `edit_quiz.html` | `api.js` → `navbar.js` → `edit_quiz.js` | Edit existing quiz |
| `take_quiz.html` | `api.js` → `navbar.js` → `take_quiz.js` | Quiz taking engine |
| `quiz_result.html` | `quiz_result.js` | Score display (no navbar) |
| `quiz_history.html` | `navbar.js` → `quiz_history.js` | Past attempts list |

> **Key insight**: `api.js` is ALWAYS loaded first because `navbar.js` and all other scripts call `fetchWithAuth()` which is defined in `api.js`. The load order matters!

---

## 5. Database Schema (4 Collections)

### User Collection
```
{
  username:      String (unique, required)
  email:         String (unique, required)
  password_hash: String (required) — bcrypt hashed, NEVER plain text
  role:          String — 'user' or 'admin'
  smartReview:   Boolean — default true (AI feature toggle)
  created_at:    Date — auto-set on creation
}
```

### Quiz Collection
```
{
  title:       String (required)
  shareCode:   String (unique) — 6-character random code like "A7X9TQ"
  creatorId:   ObjectId → references User
  isCommunity: Boolean — true ONLY for admin-created quizzes
  isPublic:    Boolean — controls share code accessibility
  thumbnail:   String — Base64 encoded image or default SVG path
  createdAt:   Date
}
```

### Question Collection
```
{
  quizId:        ObjectId → references Quiz
  type:          String — 'mcq' or 'id' (multiple choice / identification)
  text:          String — the question text
  options:       [String] — array of 4 choices (MCQ only)
  correctAnswer: String — the correct answer
}
```

### Attempt Collection
```
{
  userId:          ObjectId → references User
  quizId:          ObjectId → references Quiz
  quizTitle:       String
  score:           Number
  totalQuestions:  Number
  percent:         Number
  smartReviewData: [{             ← Array of AI-generated explanations
    questionText:  String,
    userAnswer:    String,
    explanation:   String,        ← From Gemini AI
    searchQuery:   String,
    searchLink:    String         ← Google search link
  }]
  completedAt:     Date
}
```

### Entity Relationship:
```
User (1) ──────── creates ──────── (*) Quiz
Quiz (1) ──────── has ─────────── (*) Question
User (1) ──────── attempts ────── (*) Attempt
Quiz (1) ──────── recorded in ── (*) Attempt
```

---

## 6. Complete API Route Map

### Authentication Routes (No token required)
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| `POST` | `/api/register` | server.js L114 | Create new user account |
| `POST` | `/api/login` | server.js L163 | Authenticate & return JWT |

### User Routes (Token required)
| Method | Endpoint | Middleware | Purpose |
|--------|----------|-----------|---------|
| `GET` | `/api/user` | `authenticateToken` | Get current user profile |
| `PUT` | `/api/user/settings` | `authenticateToken` | Update Smart Review preference |
| `GET` | `/api/user/history` | `authenticateToken` | Get all quiz attempts |

### Quiz Routes (Token required)
| Method | Endpoint | Middleware | Purpose |
|--------|----------|-----------|---------|
| `GET` | `/api/quizzes/community` | `authenticateToken` | List admin-created public quizzes |
| `GET` | `/api/quizzes/my-quizzes` | `authenticateToken` | List current user's quizzes |
| `GET` | `/api/quizzes/:shareCode` | `authenticateToken` | Get quiz WITHOUT answers (for takers) |
| `GET` | `/api/quizzes/:shareCode/edit` | `authenticateToken` | Get quiz WITH answers (creator only) |
| `POST` | `/api/quizzes/create` | `authenticateToken` | Create new quiz + questions |
| `PUT` | `/api/quizzes/:shareCode` | `authenticateToken` | Update quiz + replace questions |
| `DELETE` | `/api/quizzes/:shareCode` | `authenticateToken` | Delete quiz + its questions |
| `POST` | `/api/quizzes/:shareCode/submit` | `authenticateToken` | Submit answers → grade → AI review |

### Admin Routes (Token + Admin role required)
| Method | Endpoint | Middleware | Purpose |
|--------|----------|-----------|---------|
| `GET` | `/api/admin/stats` | `authenticateToken` + `requireAdmin` | Get total users/quizzes/attempts |
| `GET` | `/api/admin/quizzes` | `authenticateToken` + `requireAdmin` | Get ALL quizzes for management |

### Utility Routes
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/status` | API alive check |
| `GET` | `/api/health` | Render.com health check |

---

## 7. Authentication & Security Flow

### Registration Flow:
```
User fills form → auth.js handleAuth('register')
    → POST /api/register { username, email, password }
    → server.js checks if user exists (User.findOne)
    → bcrypt.genSalt(10) + bcrypt.hash(password)
    → new User({ password_hash: hashedPassword })
    → user.save() → 201 "User registered successfully!"
    → Frontend redirects to /login after 1.5 seconds
```

### Login Flow:
```
User fills form → auth.js handleAuth('login')
    → POST /api/login { username, password }
    → server.js finds user (User.findOne)
    → bcrypt.compare(password, user.password_hash)
    → jwt.sign({ userId, username, role }, JWT_SECRET, { expiresIn: '1h' })
    → Returns { token: "eyJhbG..." }
    → Frontend stores token in localStorage
    → Decodes token payload (atob) to check role
    → role === 'admin' ? redirect /admin-dashboard : redirect /dashboard
```

### How Every Subsequent Request is Authenticated:
```
1. api.js fetchWithAuth() reads token from localStorage
2. Sets header: Authorization: "Bearer <token>"
3. server.js authenticateToken middleware extracts token
4. jwt.verify(token, JWT_SECRET) → attaches decoded user to req.user
5. Route handler can now access req.user.userId, req.user.role
```

### Security Layers:
| Security Feature | Implementation | Location |
|-----------------|---------------|----------|
| Password hashing | bcrypt with 10 salt rounds | server.js L141 |
| Stateless auth | JWT with 1-hour expiry | server.js L180 |
| Token injection | fetchWithAuth auto-injects Bearer token | api.js L15 |
| Auto-redirect on 401 | Clears token, redirects to /login | api.js L35 |
| Answer stripping | Removes `correctAnswer` before sending to quiz takers | server.js L327 |
| XSS prevention | `escapeHTML()` function sanitizes user input | create_quiz.js, edit_quiz.js |
| Privacy gate | Blocks non-owners from accessing private quizzes | server.js L316 |
| Admin-only routes | `requireAdmin` middleware checks role | server.js L84 |
| Role-based visibility | Only admin quizzes appear in Community tab | server.js L251 |
| Input size limits | 50MB JSON limit, 5MB thumbnail client guard | server.js L60, create_quiz.js L269 |
| Production error hiding | `sendError()` hides stack traces in production | server.js L93 |

---

## 8. Step-by-Step Execution Flows

### Flow A: User Takes a Quiz (Most Important for Defense)

```
Step 1: User clicks quiz card on dashboard
         → dashboard.js openViewModal() shows quiz details

Step 2: User clicks "Take Quiz" button
         → dashboard.js redirects to /take_quiz?code=A7X9TQ

Step 3: take_quiz.html loads
         → Loads api.js → navbar.js → take_quiz.js
         → take_quiz.js reads ?code= from URL
         → fetchWithAuth('/api/quizzes/A7X9TQ')

Step 4: Server receives GET /api/quizzes/:shareCode
         → authenticateToken verifies JWT
         → Privacy gate checks access rights
         → Finds quiz + questions from MongoDB
         → STRIPS correctAnswer from questions  ← CRITICAL SECURITY
         → Returns { quiz, questions: safeQuestions }

Step 5: take_quiz.js receives data
         → Hides loading screen, shows quiz UI
         → renderQuestion(0) displays first question
         → MCQ: renders clickable option cards
         → ID: renders text input field

Step 6: User answers questions, clicks Next/Previous
         → Answers stored in local userAnswers[] array
         → Progress bar updates via progressFill.style.width

Step 7: User clicks "Submit Quiz" on last question
         → submitQuiz() fires
         → POST /api/quizzes/A7X9TQ/submit { answers: userAnswers }

Step 8: Server grades the quiz (server.js L414-563)
         → Fetches ALL questions WITH correctAnswer
         → Compares each answer (case-insensitive)
         → Builds wrongAnswers[] array
         → Checks user's Smart Review preference
         → If enabled + wrong answers exist:
             → Builds batched prompt for Gemini AI
             → Sends single API call to gemini-2.5-flash
             → Parses JSON response for explanations
             → Falls back to Google search links if AI fails
         → Saves Attempt document to MongoDB
         → Returns { score, totalQuestions, smartReviewData }

Step 9: take_quiz.js displays results inline
         → Shows score text
         → Renders Smart Review cards with AI explanations
         → Each card has "Learn More on Google" link
```

### Flow B: Admin Creates a Quiz

```
Step 1: Admin clicks "Create Quiz" on admin-dashboard
         → admin.js opens quiz type modal (MCQ or ID)

Step 2: Admin selects type → redirects to /create_quiz?type=mcq

Step 3: create_quiz.js reads ?type= from URL
         → Sets quizType variable
         → Detects admin role from JWT → hides privacy dropdown

Step 4: Admin fills title, uploads thumbnail, adds questions
         → "Add Question" button dynamically creates question blocks
         → Each block has remove button + auto-numbering

Step 5: Admin clicks "Save Quiz" → confirmation modal → "Yes"
         → Collects all question data from DOM
         → Converts thumbnail to Base64 via FileReader
         → POST /api/quizzes/create with full payload

Step 6: Server creates quiz (server.js L566-608)
         → Generates random 6-char shareCode
         → Sets isCommunity=true (admin role detected)
         → Saves Quiz document
         → Question.insertMany() saves all questions in one DB call
         → Returns { shareCode }

Step 7: Frontend shows success alert with share code
         → Redirects to /admin-dashboard
```

---

## 9. Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────┐
│                 ADMIN ROLE                       │
│  • Sees admin-dashboard with sidebar layout      │
│  • KPI cards (total users, total quizzes)        │
│  • Full quiz management table (all quizzes)      │
│  • Can edit/delete ANY quiz                      │
│  • Quizzes auto-set to isCommunity=true          │
│  • Quizzes always public (no privacy dropdown)   │
│  • Access to /api/admin/* routes                 │
│  • Auto-seeded from .env on first startup        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 USER ROLE                        │
│  • Sees dashboard with navbar layout             │
│  • Two tabs: Community Quizzes + My Quizzes      │
│  • Can create quizzes (private or public)        │
│  • Can edit/delete only OWN quizzes              │
│  • Can take any public/community quiz            │
│  • Can join private quizzes via share code        │
│  • Quiz history + Smart Review results           │
│  • Settings modal to toggle Smart Review         │
└─────────────────────────────────────────────────┘
```

---

*Continued in Part 2...*
