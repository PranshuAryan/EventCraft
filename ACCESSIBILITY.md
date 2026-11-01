# Accessibility

EventCraft aims for **WCAG 2.1 AA**. This page lists what is in place, how it is tested, and what is still missing. It does not claim full conformance.

## What is in place

**Structure and navigation**

- Page landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page, and a logical heading order.
- A "Skip to main content" link that appears on keyboard focus.
- Every page has a clear title, and a friendly 404 page links back home.

**Forms**

- Every field has a visible, associated label. Required fields use the native `required` attribute.
- Errors are shown in `role="alert"` regions so screen readers announce them.
- Login fields use the right `autocomplete` values (`email`, `current-password`, `new-password`), and the password can be shown with a checkbox.

**Keyboard**

- All controls can be reached and used with the keyboard, with a visible gold focus ring.
- `Escape` closes the location and account panels.
- The vendor-type chips and account tabs report their state with `aria-pressed`, and menu buttons use `aria-expanded` and `aria-controls`.
- Touch targets for buttons, chips and menu items are at least 44 px tall.

**Meaning not carried by colour alone**

- Budget fit is shown as words ("Fits your budget", "May exceed your budget", "Ask for a quote"), not just colour.
- Rush tasks are marked with the words "Rush: book as soon as possible".
- Payment status and balances are in text and tables.

**Data and charts**

- The budget is a real table with a caption and column and row headers (`scope`). There is no chart without a text equivalent.
- The payments table has a caption and labelled inputs ("Paid to _vendor_").

**Motion**

- Animations are gentle, and all of them stop when the system setting "reduce motion" is on.
- The animated examples on the home page can be paused with a visible **Pause** button, and each example can be selected directly.
- Decorative graphics and confetti are hidden from assistive technology (`aria-hidden`).

**Visual**

- Light theme with dark navy text on white. The colour palette was chosen for high contrast, and gold is used for decoration and focus rings rather than small text on white.
- The layout is responsive, text wraps instead of overflowing, and it works at narrow widths.

## How it is tested

- **Automated:** `vitest-axe` (axe-core) runs on the Home, Login (both modes), Planner (form and finished plan), Find vendors and Payments pages, and on the open location panel and account menu. No violations are reported. Run `npm -w client test`.
- **Manual (recommended before release):** keyboard-only walk-through of every page, a screen reader pass (NVDA on Windows, VoiceOver on Mac or iOS), browser zoom to 200 percent, and the system "reduce motion" setting.

## Known gaps

- **Automated checks are limited to what axe can detect in a simulated browser.** They find missing labels, bad roles and similar problems, but not everything that matters to real users.
- **Colour contrast is not verified by a tool.** axe cannot compute contrast in the test environment (jsdom). Check with a browser extension such as axe DevTools or Lighthouse.
- **The location search is not a full combobox.** Suggestions can be reached with the Tab key and chosen with Enter, but arrow-key navigation and `aria-activedescendant` are not implemented.
- **No screen reader testing has been done** by the maintainers.
- **Hindi:** generated plans can be in Hindi, but the interface text is English only, and the page `lang` attribute stays `en`.
- **Time-limited content:** the example carousel advances on its own every few seconds (it can be paused). Screen reader users may prefer to pause it first.
- **Printing** hides the navigation and the refine panel, but the print layout has not been checked for accessibility.

## Reporting an accessibility problem

Please describe the page, what you were trying to do, and the browser and assistive technology you use. We will treat it as a bug.
