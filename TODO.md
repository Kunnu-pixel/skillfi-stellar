# TODO - UI/UX Fintech/Web3 Refactor (Frontend Only)

## Plan (Approved)
1. Update global styling and theme in `frontend/src/index.css`:
   - Single continuous dark background.
   - Consolidate/clean conflicting legacy CSS + duplicates.
   - Enforce glass-card, borders, shadows, radii, transitions.
   - Fix input/textarea/select to be dark (no white borders).
   - Ensure consistent section spacing and centered max-width.

2. Navbar modernization:
   - Adjust header in `frontend/src/App.jsx` from white sticky header to dark glass sticky navbar.
   - Ensure `NavBar.jsx` dropdown/mobile styles match theme.

3. Hero modernization in `frontend/src/App.jsx` + CSS:
   - Centered max-width layout.
   - Remove extra padding/margins causing blank white space.
   - Contract card hover/float animation and consistent card styling.

4. Dashboard/Open ISA + Right-side widgets:
   - Restyle placeholder “No active ISA proposals yet” state.
   - Convert Guide+Feedback into a responsive grid with glass cards.

5. Forms styling:
   - Standardize inputs/textarea/select heights and dark backgrounds.
   - Ensure upload dropzone and select inherit dark styles.

6. Page-level consistency:
   - Find and override `page-container`, `landing`, `onboarding-header`, `alert-banner`, explorer classes to prevent white gaps.
   - Ensure every major section uses `max-w-7xl mx-auto px-6 py-20` pattern.

7. Animations:
   - Add CSS-only fade-up on scroll if not using Framer Motion, ensuring no logic changes.

## Progress
- [x] Step 1: Theme + global CSS cleanup (`frontend/src/index.css`)

- [ ] Step 2: Navbar/header styling (`frontend/src/App.jsx`, `frontend/src/components/NavBar.jsx`)


- [ ] Step 3: Hero layout fixes (`frontend/src/App.jsx`)
- [ ] Step 4: Dashboard / Open ISA / Guide+Feedback (`frontend/src/components/Dashboard.jsx`)
- [ ] Step 5: Forms (`frontend/src/index.css` overrides)
- [ ] Step 6: Page consistency (`frontend/src/pages/*` via CSS)
- [ ] Step 7: Animations
- [ ] Step 8: Build/test frontend

