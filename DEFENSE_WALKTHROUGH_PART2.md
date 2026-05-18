# QuizCraft System — Thesis Defense Walkthrough (Part 2)
## File-by-File Breakdown, Functions to Memorize, Defense Q&A

---

## 10. File-by-File Deep Dive

### 🔵 `server.js` — The Brain (718 lines)

This is the **single most important file**. It contains ALL backend logic:

| Section | Lines | What It Does |
|---------|-------|-------------|
| Imports & Setup | 1-14 | Loads Express, Mongoose, bcrypt, JWT, Gemini AI |
| `seedAdmin()` | 17-53 | Auto-creates admin account from .env on first boot |
| DB Connection | 63-68 | Connects to MongoDB Atlas via `MONGO_URI` |
| `authenticateToken` | 71-82 | **Middleware**: Extracts JWT from `Authorization` header, verifies it, attaches `req.user` |
| `requireAdmin` | 84-90 | **Middleware**: Blocks non-admin users |
| `sendError()` | 93-99 | Hides error details in production |
| `/api/register` | 114-160 | Registration with bcrypt password hashing |
| `/api/login` | 163-191 | Login with JWT token generation (1hr expiry) |
| `/api/user` | 194-204 | Returns current user profile (excludes password_hash) |
| `/api/user/settings` | 207-235 | Updates Smart Review preference |
| `/api/quizzes/community` | 240-263 | Lists admin-created quizzes with question counts |
| `/api/quizzes/my-quizzes` | 266-285 | Lists current user's quizzes |
| `/api/quizzes/:shareCode/edit` | 288-303 | Returns quiz WITH answers (creator/admin only) |
| `/api/quizzes/:shareCode` GET | 306-340 | Returns quiz WITHOUT answers (answer stripping) |
| `/api/quizzes/:shareCode` DELETE | 343-366 | Deletes quiz + associated questions |
| `/api/quizzes/:shareCode` PUT | 369-410 | Updates quiz + replaces all questions |
| `/api/quizzes/:shareCode/submit` | 414-563 | **THE SMART REVIEW ENGINE** — Grades quiz + calls Gemini AI |
| `/api/quizzes/create` | 566-608 | Creates new quiz with random share code |
| `/api/user/history` | 611-619 | Fetches user's past attempts |
| `/api/admin/stats` | 622-633 | Returns total users/quizzes/attempts counts |
| `/api/admin/quizzes` | 636-646 | Returns ALL quizzes for admin table |
| Static files & Page routes | 648-712 | Maps clean URLs to HTML files |
| Server start | 715-717 | Listens on PORT (default 3000) |

---

### 🔵 `api.js` — The Gatekeeper (48 lines)

**One function: `fetchWithAuth(url, options)`**

Purpose: Wraps the native `fetch()` API to automatically inject the JWT token.

```
Every authenticated page calls fetchWithAuth() instead of fetch().
This ensures the Authorization header is always present.
If server returns 401, it auto-clears the token and redirects to /login.
```

**Why this exists**: Without it, every single fetch call would need 5+ lines of token handling code. This is a **DRY (Don't Repeat Yourself)** utility.

---

### 🔵 `auth.js` — Login & Registration (70 lines)

**One function: `handleAuth(event, type)`**

- Called from both `login.html` and `register.html` via inline `<script>`:
  - `login.html`: `handleAuth(e, 'login')` → calls `POST /api/login`
  - `register.html`: `handleAuth(e, 'register')` → calls `POST /api/register`
- On login success: stores JWT in `localStorage`, decodes role, redirects
- On register success: shows message, redirects to `/login`
- Client-side validation: checks password match for registration

---

### 🔵 `navbar.js` — Shared Component (270 lines)

This file does THREE things:
1. **Injects the navbar HTML** into `<div id="navbar-container">` on every page
2. **Quiz Type Selection Modal**: MCQ or Identification choice → redirects to `/create_quiz?type=`
3. **Settings Modal**: Smart Review toggle → calls `PUT /api/user/settings`

Key functions:
- `hydrateNavbar()` — Fetches user data, displays username/email in navbar
- Settings save → `fetchWithAuth('/api/user/settings', { method: 'PUT', body: { smartReview: true/false } })`

---

### 🔵 `dashboard.js` — User Home (380 lines)

The main user interface after login. Handles:

| Feature | Function | API Called |
|---------|----------|-----------|
| Display username | Reads JWT payload via `atob()` | None (client-side decode) |
| Join Quiz by code | `handleJoinQuiz()` | `GET /api/quizzes/:code` |
| Load quizzes | `loadQuizzes()` | `GET /api/quizzes/community` + `GET /api/quizzes/my-quizzes` |
| Render quiz cards | `createQuizCard(quiz)` | None (DOM manipulation) |
| View quiz details | `openViewModal(quiz, shareCode)` | None (fills modal from data) |
| Take quiz | Click handler | Redirects to `/take_quiz?code=` |
| Edit quiz | Click handler | Redirects to `/edit_quiz?code=` |
| Delete quiz | Click handler | `DELETE /api/quizzes/:shareCode` |
| Tab switching | Event listeners on tab buttons | None (CSS display toggle) |
| Copy share code | Clipboard API | None |
| Admin role check | Reads JWT role | Hides "My Quizzes" tab for admins |

---

### 🔵 `admin.js` — Admin Command Center (305 lines)

| Feature | Function | API Called |
|---------|----------|-----------|
| Display admin name | JWT decode | None |
| KPI stats | `loadAdminStats()` | `GET /api/admin/stats` |
| Quiz table | `loadAllQuizzes()` → `renderQuizTable()` | `GET /api/admin/quizzes` |
| Pagination | `updatePaginatedView()` | None (client-side) |
| Edit quiz | Event delegation | Redirects to `/edit_quiz?code=` |
| Delete quiz | Modal confirm → `fetchWithAuth(DELETE)` | `DELETE /api/quizzes/:shareCode` |
| Create quiz | Quiz type modal | Redirects to `/create_quiz?type=` |

---

### 🔵 `create_quiz.js` — Quiz Builder (321 lines)

Key behaviors:
- Reads `?type=mcq` or `?type=id` from URL to determine question format
- Admin role detected → hides privacy dropdown (always public)
- `"Add Question"` button dynamically creates DOM question blocks
- MCQ: 4 radio buttons + 4 text inputs per question
- ID: 1 text input for correct answer per question
- Thumbnail: FileReader converts image to Base64 string
- `escapeHTML()` sanitizes all user input before sending
- Validation: MCQ requires a selected correct answer per question
- Save: `POST /api/quizzes/create` with `{ title, isPublic, questions, thumbnail }`

---

### 🔵 `edit_quiz.js` — Quiz Editor (335 lines)

Almost identical to `create_quiz.js` but:
- Fetches existing quiz data from `GET /api/quizzes/:shareCode/edit` (WITH answers)
- Pre-fills title, privacy, and all question fields
- Uses `generateQuestionBlock(qData)` to create pre-filled blocks
- Save: `PUT /api/quizzes/:shareCode` instead of POST create

---

### 🔵 `take_quiz.js` — Quiz Taking Engine (253 lines)

The core quiz experience:
- `renderQuestion(index)` — Displays one question at a time (MCQ options or text input)
- `userAnswers[]` — Array that stores `{ questionId, answer }` for each question
- Navigation: Previous/Next buttons with answer validation
- `submitQuiz()` — Sends answers to server with 120-second timeout
- Results rendered inline (score + Smart Review cards)

---

### 🔵 `quiz_result.js` — Results Page (221 lines)

- Fetches attempt data from `GET /api/user/history`
- Finds specific attempt by `?id=` URL parameter (or latest)
- Renders animated score circle using CSS `conic-gradient`
- Paginates Smart Review cards (5 per page)
- Shows AI explanation + Google search link for each wrong answer

---

### 🔵 `quiz_history.js` — History Page (150 lines)

- Fetches all attempts from `GET /api/user/history`
- Renders paginated cards (8 per page) with score rings
- Each card clickable → navigates to `/quiz_result?id=`

---

## 11. The Smart Review Engine (Your Thesis Differentiator)

This is the **AI-powered feature** that makes QuizCraft unique. Here's exactly how it works:

```
User submits quiz
       │
       ▼
Server grades answers (case-insensitive string comparison)
       │
       ▼
Builds wrongAnswers[] array with { questionText, userAnswer, correctAnswer }
       │
       ▼
Checks user's Smart Review preference (User.smartReview field)
       │
       ├── If DISABLED → skip AI, return score only
       │
       ▼ If ENABLED + wrong answers exist
       │
Builds a SINGLE BATCHED PROMPT for ALL wrong answers
       │
       ▼
Sends to Google Gemini 2.5 Flash API with 30-second timeout
       │
Prompt: "As an IT instructor, review these incorrect answers.
         For EACH question provide:
         1. A 2-sentence explanation
         2. A Google search query"
       │
       ▼
Parses JSON response from Gemini
       │
       ▼
Maps explanations back to wrong answers + generates Google search links
       │
       ├── If Gemini FAILS → fallback to search links without AI explanation
       │
       ▼
Saves complete Attempt to MongoDB (including smartReviewData)
       │
       ▼
Returns { score, totalQuestions, smartReviewData, smartReviewEnabled }
```

**Why batch prompting?** One API call for ALL wrong answers instead of one per question. This is faster and cheaper.

---

## 12. Important Functions to Memorize

| Function | File | Why It's Important |
|----------|------|-------------------|
| `fetchWithAuth(url, options)` | api.js | Every authenticated API call goes through this |
| `handleAuth(event, type)` | auth.js | Handles both login AND registration |
| `authenticateToken(req, res, next)` | server.js L71 | THE middleware that protects all routes |
| `requireAdmin(req, res, next)` | server.js L84 | Blocks non-admin users |
| `seedAdmin()` | server.js L17 | Auto-creates admin on first boot |
| `loadQuizzes()` | dashboard.js | Fetches both community + personal quizzes |
| `createQuizCard(quiz)` | dashboard.js | Builds the quiz card DOM element |
| `renderQuestion(index)` | take_quiz.js | Displays one question (MCQ or ID format) |
| `submitQuiz()` | take_quiz.js | Sends answers to Smart Review Engine |
| `generateQuestionBlock(qData)` | edit_quiz.js | Creates pre-filled question form blocks |
| `hydrateNavbar()` | navbar.js | Fetches user data for navbar display |
| `escapeHTML(str)` | create_quiz.js | Prevents XSS attacks |
| `sendError(res, error, context)` | server.js L93 | Production-safe error responses |

---

## 13. Possible Defense Questions & Suggested Answers

### Q: "How does the routing work in your system?"
> **A:** "We use Express.js for routing. There are two types of routes: **API routes** that handle data operations (prefixed with `/api/`) and **page routes** that serve HTML files. API routes are RESTful — we use GET to fetch data, POST to create, PUT to update, and DELETE to remove. Every API route except login and register requires a valid JWT token, enforced by our `authenticateToken` middleware."

### Q: "How does the frontend communicate with the backend?"
> **A:** "The frontend uses the browser's native Fetch API through our custom `fetchWithAuth()` wrapper in `api.js`. This wrapper automatically injects the JWT token from localStorage into the Authorization header of every request. Data is exchanged in JSON format. If the server returns a 401 Unauthorized, the wrapper automatically clears the stored token and redirects the user to the login page."

### Q: "How do you handle authentication and session management?"
> **A:** "We use stateless JWT authentication. When a user logs in, the server generates a JWT token containing their userId, username, and role, signed with a secret key and set to expire in one hour. This token is stored in the browser's localStorage. On every subsequent request, the token is sent in the Authorization header and verified by our middleware. There are no server-side sessions — the token itself contains all the user identity information."

### Q: "How is data stored and retrieved?"
> **A:** "We use MongoDB Atlas as our cloud database, accessed through the Mongoose ODM. We have four collections: Users, Quizzes, Questions, and Attempts. Mongoose schemas enforce data validation — for example, usernames must be unique, quiz types must be either 'mcq' or 'id', and all required fields are enforced at the database level. Relationships between collections use MongoDB ObjectId references."

### Q: "What makes the Smart Review feature work?"
> **A:** "When a user submits a quiz, the server grades each answer by comparing it with the stored correct answer. For all wrong answers, we build a single batched prompt and send it to Google's Gemini 2.5 Flash API. The prompt asks the AI to act as an IT instructor and provide a 2-sentence explanation for each mistake, plus a search query for further learning. We parse the JSON response and store it in the Attempt document. If the AI call fails, we gracefully fall back to Google search links without AI explanations."

### Q: "How do you handle security in your system?"
> **A:** "Security is implemented in multiple layers. Passwords are hashed with bcrypt using 10 salt rounds — we never store plain text passwords. Authentication uses JWT tokens with one-hour expiry. The server strips correct answers before sending quiz data to takers, preventing answer leakage. We have a privacy gate that blocks access to private quizzes. Admin routes require both authentication AND admin role verification. On the frontend, we sanitize user input with `escapeHTML()` to prevent XSS attacks. In production, our `sendError()` function hides internal error details from users."

### Q: "What happens if the AI service fails?"
> **A:** "We built graceful degradation into the system. The Gemini API call has a 30-second timeout. If it fails due to timeout, rate limiting, or any other error, the server catches the exception and falls back to providing Google search links without AI explanations. The quiz score is always calculated and saved regardless of the AI service status. We also log the specific error type for debugging."

### Q: "How does role-based access control work?"
> **A:** "We have two roles: 'user' and 'admin'. The role is stored in the User document and embedded in the JWT token. On the backend, our `requireAdmin` middleware checks `req.user.role === 'admin'` before allowing access to admin routes. On the frontend, JavaScript reads the role from the JWT payload to show/hide UI elements — for example, admins see the admin dashboard layout while regular users see the standard dashboard with Community and My Quizzes tabs. Admin-created quizzes are automatically flagged as community quizzes."

### Q: "Why did you choose this tech stack?"
> **A:** "We chose Node.js with Express for the backend because it uses JavaScript on both frontend and backend, reducing context switching. MongoDB was chosen because its document-based structure maps naturally to our quiz data — quizzes have nested questions with variable option counts, which fits better in a flexible document model than rigid SQL tables. Mongoose gives us schema validation while keeping MongoDB's flexibility. JWT was chosen for stateless authentication, which is simpler to deploy and scale. The Google Gemini API was selected for the Smart Review feature because it provides fast, cost-effective AI responses with structured JSON output."

### Q: "Why is everything in one server.js file?"
> **A:** "For a project of this scale, having a single server file keeps the architecture straightforward and easy to debug. All routes, middleware, and business logic are in one place, which makes it easy to trace the flow of any request from start to finish. In a larger production application, we would split this into separate route files, controllers, and middleware directories following the MVC pattern. This is a conscious trade-off between simplicity and scalability."

---

## 14. Weak Points to Prepare For

| Weak Point | How to Explain It |
|-----------|-------------------|
| **No input validation on question content** | "We validate at the schema level with Mongoose required fields, but we could add more granular validation like minimum question length. We focused on critical security validations like XSS prevention and role checking." |
| **JWT stored in localStorage** | "We chose localStorage for simplicity. In a higher-security application, we would use HTTP-only cookies to prevent XSS-based token theft. For our scope, we mitigate this with XSS sanitization and 1-hour token expiry." |
| **No rate limiting** | "We rely on Render.com's infrastructure-level protections. For production hardening, we would add express-rate-limit middleware to prevent brute-force login attempts." |
| **Thumbnail as Base64 in MongoDB** | "We store thumbnails as Base64 strings for simplicity. In production, we would use a cloud storage service like AWS S3 and store only the URL. The 5MB client-side guard prevents excessive database bloat." |
| **Single server.js file** | "This is a deliberate choice for our project scope. We could refactor into controllers/, routes/, and middleware/ directories. The current structure prioritizes readability and debugging speed." |
| **No password reset feature** | "This was out of scope for our current version but could be added using email-based token verification." |
| **No real-time features** | "Quiz taking is currently request-response based. WebSockets could enable live quiz sessions in a future version." |

---

## 15. Simplified Summary You Can Recite During Defense

> "QuizCraft is a full-stack web application built with Node.js, Express, MongoDB, and vanilla JavaScript. It allows users to create, share, and take quizzes with two question types: Multiple Choice and Identification. What makes it unique is the **Smart Review Engine** — when a user finishes a quiz, all incorrect answers are batched into a single prompt sent to Google's Gemini AI. The AI acts as an IT instructor, providing personalized explanations and study links for each mistake.
>
> The system uses **JWT-based stateless authentication** with bcrypt password hashing. We have **role-based access control** with admin and user roles. Admins manage community quizzes through a dedicated dashboard with KPI stats, while regular users can create private or public quizzes and share them via 6-character codes.
>
> Security features include answer stripping (quiz takers never receive correct answers), privacy gates for private quizzes, XSS sanitization, and production-safe error handling. The system is deployed on Render.com with automated health checks and environment-based configuration.
>
> The frontend communicates with the backend through our `fetchWithAuth()` utility, which automatically injects the JWT token into every request. All data flows through RESTful API endpoints and is persisted in MongoDB Atlas through Mongoose schemas with built-in validation."

---

## 16. Quick Reference: "Which File Handles That?"

| When the panel asks... | The answer is... |
|----------------------|-----------------|
| "Where is login handled?" | `auth.js` (frontend) → `server.js L163` (backend) |
| "Where are passwords hashed?" | `server.js L141` (bcrypt) |
| "Where is the JWT created?" | `server.js L180` (jwt.sign) |
| "Where is the token verified?" | `server.js L71` (authenticateToken middleware) |
| "Where is the token stored?" | `auth.js L37` (localStorage) |
| "Where is the token sent?" | `api.js L16` (fetchWithAuth injects it) |
| "Where are quizzes created?" | `create_quiz.js` → `server.js L566` |
| "Where are questions rendered?" | `take_quiz.js renderQuestion()` |
| "Where is grading done?" | `server.js L438-452` (the forEach loop) |
| "Where does the AI get called?" | `server.js L457-542` (Gemini API) |
| "Where are results saved?" | `server.js L547-556` (Attempt.save) |
| "Where is the score displayed?" | `quiz_result.js` + `take_quiz.js` |
| "Where are admin stats fetched?" | `admin.js loadAdminStats()` → `server.js L622` |
| "Where is access control?" | `server.js L84` (requireAdmin) + `L294` (creator check) |
| "Where is the navbar?" | `navbar.js` (injected into `#navbar-container`) |
| "Where is the database schema?" | `models/` folder (User.js, Quiz.js, Question.js, Attempt.js) |

---

**Good luck on your defense! 🎓 You've got this.**
