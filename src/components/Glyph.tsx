/**
 * Stroke icons named after the app's `AppIconName`. Default stroke is 1.6;
 * pills pass 1.8.
 */
export function Glyph({
  name,
  size = 16,
  strokeWidth = 1.6,
  className = "",
}: {
  name: "clock" | "checkCircle" | "alertCircle" | "sun" | "contrast";
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {name === "clock" ? (
        <>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M12 8v4.5l2.75 1.75" />
        </>
      ) : null}
      {name === "checkCircle" ? (
        <>
          <circle cx="12" cy="12" r="8.25" />
          <path d="m8.5 12.25 2.25 2.25 4.75-5" />
        </>
      ) : null}
      {name === "alertCircle" ? (
        <>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M12 8.25v4.5" />
          <path d="M12 15.75h.01" />
        </>
      ) : null}
      {name === "sun" ? (
        <>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 3.5v1.75M12 18.75V20.5M3.5 12h1.75M18.75 12H20.5M6 6l1.25 1.25M16.75 16.75 18 18M18 6l-1.25 1.25M7.25 16.75 6 18" />
        </>
      ) : null}
      {name === "contrast" ? (
        <>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M12 3.75v16.5" />
          <path d="M12 7.5h4.2M12 12h5.8M12 16.5h4.2" />
        </>
      ) : null}
    </svg>
  );
}
