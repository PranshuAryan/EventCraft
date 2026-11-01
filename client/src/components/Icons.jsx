/** Small decorative icons. They are hidden from screen readers because text always sits beside them. */

const baseProps = {
  "aria-hidden": "true",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const PinIcon = () => (
  <svg {...baseProps} width="16" height="16">
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...baseProps} className="sicon" width="18" height="18">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const ChevronIcon = () => (
  <svg {...baseProps} width="14" height="14" strokeWidth={2.5}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
