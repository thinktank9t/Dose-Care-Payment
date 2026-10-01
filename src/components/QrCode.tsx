import qrcode from "qrcode-generator";

/**
 * A scannable QR code, rendered server-side as a single inline SVG path — no
 * client JavaScript and no image request.
 *
 * Every dark module becomes one `h1 v1` box in the path, so the code stays
 * crisp at any size. `shapeRendering="crispEdges"` keeps module edges on whole
 * pixels, which is what scanners need.
 */
export function QrCode({
  value,
  size = 160,
  margin = 2,
  className = "",
  title,
}: {
  value: string;
  /** Rendered width/height in CSS pixels. */
  size?: number;
  /** Quiet zone, in modules. The spec asks for 4; 2 is the practical floor. */
  margin?: number;
  className?: string;
  title?: string;
}) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();

  const count = qr.getModuleCount();
  const span = count + margin * 2;

  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${col + margin} ${row + margin}h1v1h-1z`;
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${span} ${span}`}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {/* The quiet zone has to be light for the code to read. */}
      <rect width={span} height={span} fill="#fff" />
      <path d={path} fill="var(--ink)" />
    </svg>
  );
}
