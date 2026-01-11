# Site Structure & Navigation

## A. Homepage Flow (Top → Bottom)

### 1. Hero Section (Above the Fold)
- **Headline** (from `docs/hero-section.md`)
- **Subheadline** (from `docs/hero-section.md`)
- **Context Line** (from `docs/hero-section.md`)
- **Call-to-Action Buttons**: "View Work" | "About My Approach"

**Purpose:** Immediate value proposition and positioning. Recruiter sees who you are and what you focus on in 5 seconds.

---

### 2. About Section (Scroll)
- **Full About Content** (from `docs/about-section.md`)
- **3 paragraphs** as written

**Purpose:** Explains how you think, not just what you've done. Shows systems thinking and product awareness.

---

### 3. Projects Section (Scroll)
- **Section Title:** "Selected Projects" or "Work"
- **2 Project Cards:**
  - SpaceFlow — Smart Workplace Platform
  - AI Knowledge Assistant
- **Each Card Shows:**
  - Project name
  - One-line description (extracted from case study overview)
  - "View Case Study" link/button

**Purpose:** Quick scan of your best work. Recruiters can see project names and decide if they want to dive deeper.

---

### 4. Contact Section (Scroll)
- **Simple contact information**
- **Links:** Email, LinkedIn, GitHub
- **Optional:** Contact form (if you want to keep the existing one)

**Purpose:** Clear path to reach out. Minimal, not cluttered.

---

## B. Navigation Structure

### Primary Navigation (Header, Always Visible)

**Items:**
1. **Home** (links to #hero)
2. **About** (links to #about)
3. **Work** (links to #projects)
4. **Contact** (links to #contact)

**Alternative (Minimal):**
- **Logo/Name** (links to home)
- **Work** (links to #projects)
- **About** (links to #about)
- **Contact** (links to #contact)

**Recommendation:** Use the minimal version. "Home" is redundant if logo links to home.

**Mobile Navigation:**
- Hamburger menu that expands to show same items
- Smooth scroll to sections on same page

---

### Secondary Navigation (Footer, Optional)

- **Links:** LinkedIn, GitHub, Email
- **Copyright/Attribution**

**Purpose:** Secondary access to social links, not primary navigation.

---

## C. Project Interaction Model

### Project Cards on Homepage

**Card Content:**
- **Project Name** (e.g., "SpaceFlow — Smart Workplace Platform")
- **One-Line Description** (e.g., "A system design exploration of space booking, occupancy analytics, and AI-assisted insights")
- **"View Case Study" Button/Link**

**Click Behavior:**
- Clicking card or "View Case Study" → Navigate to dedicated case study page
- **NOT** expand in place or show modal
- Full page navigation for focused reading

**Why Full Page:**
- Case studies are long (2-3 minute reads)
- Recruiters need focused environment
- Easier to bookmark/share specific projects
- Better for deep dives

---

### Case Study Page Structure

**URL Pattern:** `/work/spaceflow` or `/projects/spaceflow` or `/spaceflow`

**Page Layout:**

1. **Back Navigation**
   - "← Back to Work" or "← All Projects" link
   - Returns to homepage #projects section

2. **Case Study Title**
   - Project name (e.g., "SpaceFlow — Smart Workplace Platform")
   - Subtitle (e.g., "A system design exploration of space booking, occupancy analytics, and AI-assisted insights")

3. **Case Study Content** (from `docs/spaceflow-case-study-content.md` or `docs/ai-knowledge-assistant-case-study-content.md`)
   - All sections in order:
     - Overview
     - User Needs & Product Intent
     - System Architecture
     - Key Decisions & Trade-offs
     - Technical Implementation Highlights
     - Learnings & Reflections
     - What's Next

4. **Bottom Navigation**
   - "← Previous Project" / "Next Project →" (if you have multiple)
   - Or: "← Back to Work"

**Purpose:** Focused reading experience. Recruiters can read full case study without distractions.

---

## D. Case Study Page Layout

### Section Structure (Same for Both Projects)

**Visual Hierarchy:**
- **H1:** Project name
- **H2:** Subtitle/description
- **H2:** Section headers (Overview, User Needs, etc.)
- **Body:** Paragraphs as written in case study content

**No Additional Elements:**
- No sidebar
- No related projects (keep focus)
- No comments or social sharing (too early-career)
- No "View Live" or "View Code" buttons (unless you have them)

**If You Have Links:**
- GitHub link: Small, at top or bottom of case study
- Live demo link: Only if it exists and works

**Reading Flow:**
- Linear, top to bottom
- Clear section breaks
- Scannable headers
- No distractions

---

## E. Recruiter Scan Path

### 10-Second Scan (Initial Impression)

**Path:**
1. **Hero Section** (5s)
   - Reads headline: "I design systems that connect architecture to user needs"
   - Reads subheadline: "I work at the intersection of systems engineering, AI systems, and product thinking"
   - Sees context: "M.Tech (Software Engineering) at NUS"
   - **Impression:** "Systems engineer with product awareness, learning-focused"

2. **Projects Section** (5s)
   - Sees 2 project names: "SpaceFlow" and "AI Knowledge Assistant"
   - Sees one-line descriptions
   - **Impression:** "Has 2 projects, both systems-focused"

**Decision Point:** Does this person seem relevant? If yes, continue. If no, close tab.

---

### 30-Second Scan (Deeper Look)

**Path:**
1. **Hero Section** (5s) - Same as above

2. **About Section** (10s)
   - Scans first paragraph: "I approach problems through systems architecture and product reasoning"
   - Scans second paragraph: "I use projects as learning experiments in decision-making"
   - **Impression:** "Thinks systematically, learning-focused, product-aware"

3. **Projects Section** (15s)
   - Reads project names and descriptions
   - Clicks one project card (e.g., SpaceFlow)
   - Scans case study overview (first paragraph)
   - Scans "Key Decisions & Trade-offs" section headers
   - **Impression:** "Shows architectural reasoning, understands trade-offs"

**Decision Point:** Is this person worth a full read? If yes, read case study. If no, move on.

---

### 2-Minute Deep Dive (Serious Consideration)

**Path:**
1. **Hero Section** (5s) - Quick refresh

2. **About Section** (30s)
   - Reads full about content
   - **Impression:** "Clear thinking, systems-focused, product-aware, learning mindset"

3. **Projects Section** (90s)
   - Clicks SpaceFlow case study
   - Reads full case study:
     - Overview
     - User Needs & Product Intent
     - System Architecture
     - Key Decisions & Trade-offs (focuses here)
     - Technical Implementation
     - Learnings & Reflections
   - **Impression:** "Shows deep systems thinking, understands trade-offs, reflective, learning-focused"

**Decision Point:** Should I interview this person? If yes, save/bookmark. If no, move on.

---

## Additional Considerations

### What Should Be Above the Fold

**Must See:**
- Hero section (headline, subheadline, context line)
- At least one CTA button ("View Work" or "About My Approach")
- Navigation menu

**Should See (if space allows):**
- Start of About section (first paragraph visible)
- Or: Start of Projects section (first project card visible)

**Recommendation:** Hero section + navigation only. Force a small scroll to see About/Projects. This creates intentional engagement.

---

### What Should Be Below the Fold

**Scroll to See:**
- Full About section
- Projects section
- Contact section

**Why:** 
- Hero section gets full attention
- Scroll indicates engagement
- Below-fold content is for interested reviewers

---

### Mobile Considerations

**Navigation:**
- Hamburger menu (collapsed by default)
- Same items as desktop

**Hero Section:**
- Same content, stacked vertically
- Buttons stack or become full-width

**Projects:**
- Cards stack vertically
- Full-width cards on mobile

**Case Studies:**
- Same content, responsive typography
- Back navigation at top
- Sections stack naturally

---

## Summary

**Homepage Structure:**
1. Hero (above fold)
2. About (scroll)
3. Projects (scroll)
4. Contact (scroll)

**Navigation:**
- Minimal: Logo, Work, About, Contact
- Always visible header
- Smooth scroll to sections

**Project Interaction:**
- Cards on homepage → Full case study pages
- Case studies are dedicated pages with full content
- Back navigation to return to homepage

**Recruiter Experience:**
- 10s: Hero + project names
- 30s: About scan + case study overview
- 2min: Full case study read

**Key Principle:** Less is more. Two strong projects with deep case studies are better than many shallow projects. Focus on quality of reasoning, not quantity of work.

