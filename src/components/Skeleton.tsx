/** A grey placeholder the shape of the content that is still loading. */
export function Skeleton({
  className = "",
  rounded = "card",
}: {
  className?: string;
  rounded?: "card" | "pill";
}) {
  return (
    <div
      aria-hidden
      className={`skeleton ${rounded === "pill" ? "rounded-full" : ""} ${className}`}
    />
  );
}
