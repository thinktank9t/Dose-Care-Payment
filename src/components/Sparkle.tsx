/** Four-point sparkle — the Premium motif from the app. */
export function Sparkle({
  size = 20,
  className = "",
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <path d="M12 1.5c.6 4.9 3.1 7.9 8.5 9-5.4 1.1-7.9 4.1-8.5 12-.6-7.9-3.1-10.9-8.5-12 5.4-1.1 7.9-4.1 8.5-9z" />
    </svg>
  );
}
