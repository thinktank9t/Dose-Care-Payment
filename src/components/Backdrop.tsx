/**
 * The page backdrop shared by the public site and the signed-in app: three
 * soft accent glows that drift slowly, a faint dot grid, and (in the wide
 * right margin only) line art in the app's own icon language. Pure markup, so
 * it renders the same on server and client pages. Styles and motion live in
 * globals.css (`.app-backdrop`); the parent must be `relative isolate` so the
 * backdrop sits behind the page content.
 */
export function Backdrop() {
  return (
    <div className="app-backdrop" aria-hidden>
      <span className="backdrop-glow backdrop-glow-a" />
      <span className="backdrop-glow backdrop-glow-b" />
      <span className="backdrop-glow backdrop-glow-c" />
      <svg
        className="backdrop-art absolute left-[calc(50%+560px)] top-16 hidden h-[260px] w-[260px] text-accent min-[1640px]:block"
        viewBox="0 0 240 240"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <circle cx="150" cy="92" r="58" />
        <circle cx="150" cy="92" r="72" strokeDasharray="3 9" />
        <path d="M150 58v34l22 14" />
        <g transform="rotate(-35 70 170)">
          <rect x="22" y="150" width="96" height="40" rx="20" />
          <path d="M70 150v40" />
        </g>
        <path d="M206 178l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
      </svg>
    </div>
  );
}
