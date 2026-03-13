# 🎮 Roster Moment - Project Documentation (Hackathon MVP)

## 1. Motivation and Vision
**Roster Moment** is an application designed to elevate the fan experience at in-person esports events (specifically for **Giantx**). The idea arises from the need to emotionally connect followers with their idols in an innovative and shareable way.

The application allows a fan to take a photograph and, through state-of-the-art generative Artificial Intelligence, be integrated into an epic poster alongside the team's professional players, receiving the result instantly on their mobile and by email.

---

## 2. Technology Stack
To build this MVP in record time and with high fidelity, we have selected leading technologies:

*   **Generative AI:** `Google Gemini 3 Pro Image Preview` (Nano Banana Pro). Chosen for its unique ability to process up to 8 reference images simultaneously, allowing for the mixing of the fan's face with those of 5 real players.
*   **Frontend:** Vanilla JavaScript (SPA), HTML5, and CSS3 (Mobile-first). Optimized for speed and simplicity.
*   **Backend:** Node.js with Express. Orchestrates AI generation, file management, and email services.
*   **Database:** `SQLite` (better-sqlite3). Efficiently stores subscriber data, consent logs, and generated image references.
*   **Emailing:** `Brevo (Sendinblue)` via HTTPS API. robust HTML templates with embedded logos and attachments.
*   **Hosting:**
    *   **Render:** Full stack deployment (Node.js server + Static Frontend serving).
*   **Visualization:** `Chart.js` for real-time analytics on the dashboard.

---

## 3. Key Features Delivered

### 📸 AI Roster Generation
- users upload their photo and get seamlessly integrated into a Giantx roster.
- Multiple styles: "Painted Hype" (Artistic), "Match Day" (Realistic), and "Social Media Avatar".

### 📊 Live Event Dashboard
- Real-time analytics for event organizers.
- Displays "Total Posters Generated" with high-visibility typography for large screens.
- Breakdowns by Role (Top, Jungle, etc.), Style, and Fan Favorite Player.
- **TV Mode:** Optimized with large logos and clean UI for public display.

### 🖼️ Public Event Gallery
- A rotating showcase of the latest generated posters.
- **TV Optimization:** Removed all navigation links ("Back to App") for a pure, distraction-free visual experience.
- Auto-refresh logic to keep the display dynamic during the event.

### 📧 Branded Email Delivery
- Automated email dispatch with the generated poster as an attachment.
- Rich HTML template featuring the official **Giantx logo** (converted to PNG for maximum compatibility).
- GDPR-compliant consent tracking.

---

## 4. Technical Challenges and "Bulletproof" Solutions

### A. The AI Infinite Loop & Image Persistence
*   **Problem:** The Pro model sometimes took long to process, and occasionally file writing failed silently, causing the frontend to hang.
*   **Solution:** We implemented **Robust Error Handling** and restored explicit `fs.writeFileSync` calls with directory verification/creation logic to ensure every generated image is safely stored before confirming success.

### B. Static File Serving & Gallery 404s
*   **Problem:** The hosting environment (Render) struggled with serving dynamically generated static files immediately via standard middleware.
*   **Solution:** **Explicit Express Routes**. We implemented a specific `GET /generated/:filename` route that forces a file system lookup, guaranteeing that the image is served correctly to the gallery and front-end immediately after generation.

### C. Cloud Email Blocking
*   **Problem:** Render servers block standard SMTP traffic.
*   **Solution:** Migrated to **Brevo REST API**. By sending the email through HTTPS, we bypass port blocks. We also secured the Giantx logo by serving it as a static PNG asset from our own server to prevent broken image links in emails.

### D. Visual Consistency & Artefacts
*   **Problem:** Emojis in page titles caused rendering artifacts (blue boxes) on some displays.
*   **Solution:** Cleaned up all typography, removing non-standard characters and enforcing a "Rajdhani" font stack for a premium esports aesthetic.

---

## 5. Asset Generation & Brand Identity
Using Gemini, we created a complete suite of promotional materials to support the product launch:
*   **Hero Banners:** Cinematic compositions of the Giantx roster.
*   **Social Media Kit:** Avatars and headers optimized for Twitter/X.
*   **Brand Styling:** A cohesive dark-mode palette (`#0a192f` background, `#00aeef` accents) applied consistently across the App, Dashboard, and Gallery.

---

## 6. Development Methodology: Junie + WebStorm
This project relied on **Junie** (Agentic AI) integrated into **WebStorm**:
*   **Junie as Full-Stack Dev:** Handled everything from CSS refactoring to Backend API implementation and SQLite integration.
*   **Rapid Debugging:** Solved critical deployment issues (file paths, port binding) by analyzing real-time behaviors.
*   **Documentation:** Automatically maintained task lists and implementation plans to keep the workflow organized.

---

**Project developed for the Generative AI Hackathon - 2026**
