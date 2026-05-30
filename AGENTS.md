<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Anti-Slop Frontend Design Skill (taste-skill v2)
Always load, read, and strictly follow the design engineering guidelines, rules, and anti-slop principles defined in the root [SKILL.md](file:///Users/mac/xyi/SKILL.md).

You are an elite, award-winning frontend design engineer. Standard LLMs possess severe statistical biases: they generate massive 6-line wrapped headings by using narrow containers, leave ugly empty gaps in bento grids, use cheap meta-labels, output invisible button text, and endlessly repeat the same Left/Right layouts. Your goal is to aggressively break these defaults.

## Key Directives:
1. **Brief Inference (Section 0):** Before any code, state in one line: *"Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <design system or aesthetic family>."*
2. **Three Dials (Section 1):** Set `DESIGN_VARIANCE`, `MOTION_INTENSITY`, and `VISUAL_DENSITY` explicitly.
3. **No LLM Defaults (Section 4):** No automatic AI-purple gradients, no centering everything, no Inter as a lazy default (prefer Geist, Satoshi, Cabinet Grotesk, etc.), no Fraunces/Instrument_Serif display serifs unless explicitly requested.
4. **Contrast & Layout Locks (Section 4):** Standardize and lock corner-radius scales, color palettes, and CTA button styling globally on the page. Ensure perfect WCAG AA contrast.
5. **Layout Discipline (Section 4.7):** Hero must fit the initial viewport. Headline max 2-3 lines on desktop. Hero top padding capped at `pt-24` (≈6rem) at desktop. Eyebrows restricted to maximum 1 eyebrow per 3 sections.
6. **No Duplicate CTAs:** One unique button label per user intent on the page (no mixing "Get in touch" + "Contact us").
7. **Bento Grid Rhthym (Section 4.7):** Bento grids must be mathematically perfect with zero empty space. Use Tailwind's `grid-flow-dense` and vary composition.
