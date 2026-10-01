"use client";

import { useEffect, useId, useRef } from "react";

/**
 * The hero illustration: a grown child looking after their parents.
 *
 * Three portraits — you on the left, Ma and Baba on the right — joined by two
 * soft links. A dose travels out along each link, and the parent it reaches
 * answers with a tick: the reminder went out, the medicine was taken, you know
 * about it. The heart in the middle is what the whole arrangement is for.
 *
 * Two rules keep it cheap and calm:
 *
 * 1. **The resting state is the rendered state.** The server HTML already shows
 *    the finished scene, so there is no entrance flash, no layout shift and
 *    nothing missing if the JavaScript never arrives. GSAP only adds motion on
 *    top. The doses in flight, the ticks and the heart's pulse start at
 *    `opacity 0` — each is a passing moment with no meaningful still frame.
 * 2. **Only transform and opacity are animated**, so every frame stays on the
 *    compositor. GSAP is loaded lazily, after hydration, and is kept to the
 *    core: the dose follows its curve by sampling the same quadratic the `<path>`
 *    is drawn from, which costs eight numbers instead of a plugin.
 *
 * The motion is paused while the hero is off-screen or the tab is in the
 * background, and never starts at all for readers who ask for reduced motion.
 */

type Point = { x: number; y: number };
type Link = { from: Point; c: Point; to: Point };

/** You, centre-left. */
const CHILD = { x: 70, y: 120, r: 36 };

/** Ma and Baba. Same size as each other, a little smaller than you. */
const PARENTS = [
  { x: 174, y: 84, r: 30 },
  { x: 174, y: 160, r: 30 },
] as const;

/**
 * The curve each dose follows, bowed away from the heart so the middle of the
 * picture stays clear. The `<path>` and the animation are drawn from these same
 * three points, so they can never drift apart.
 */
const LINKS: Link[] = [
  { from: { x: 102, y: 109 }, c: { x: 125, y: 88 }, to: { x: 148, y: 93 } },
  { from: { x: 102, y: 132 }, c: { x: 125, y: 155 }, to: { x: 148, y: 150 } },
];

/** Where each parent's "taken" tick sits, on the rim of their portrait. */
const TICKS: Point[] = [
  { x: 195, y: 105 },
  { x: 195, y: 181 },
];

const HEART = { x: 122, y: 120 };

const SPARKLES = [
  { x: 40, y: 62, size: 12 },
  { x: 213, y: 48, size: 9 },
  { x: 54, y: 196, size: 10 },
] as const;

const curve = (l: Link) => `M${l.from.x} ${l.from.y}Q${l.c.x} ${l.c.y} ${l.to.x} ${l.to.y}`;

/** Sample the quadratic, so the dose rides exactly the line that is drawn. */
function samples(l: Link, steps = 8) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    xs.push(u * u * l.from.x + 2 * u * t * l.c.x + t * t * l.to.x);
    ys.push(u * u * l.from.y + 2 * u * t * l.c.y + t * t * l.to.y);
  }
  return { xs, ys };
}

export function CareAnimation({ className = "" }: { className?: string }) {
  const root = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;

      const ctx = gsap.context(() => {
        const q = gsap.utils.selector(el);
        // Separate loops so nothing marches in lockstep; held together only so
        // they can be paused as one.
        const parts: gsap.core.Animation[] = [];

        // A dose going out, and the tick that comes back.
        const round = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });
        LINKS.forEach((link, i) => {
          const dose = q(`[data-dose="${i}"]`);
          const tick = q(`[data-tick="${i}"]`);
          const { xs, ys } = samples(link);
          const at = i * 1.1;

          round
            .set(dose, { x: xs[0], y: ys[0], scale: 0.5, opacity: 0 }, at)
            .to(dose, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" }, at)
            .to(dose, {
              keyframes: { x: xs, y: ys, easeEach: "none" },
              duration: 1.7,
              ease: "power1.inOut",
            }, at)
            .to(dose, { scale: 0.5, opacity: 0, duration: 0.3 }, at + 1.5)
            .fromTo(tick,
              { scale: 0, opacity: 0 },
              {
                scale: 1,
                opacity: 1,
                duration: 0.5,
                ease: "back.out(2.2)",
                svgOrigin: `${TICKS[i].x} ${TICKS[i].y}`,
              }, at + 1.55)
            .to(tick, { opacity: 0, duration: 0.7 }, at + 4.4);
        });
        parts.push(round);

        // The heart, and what it sends out.
        parts.push(gsap.to(q("[data-heart]"), {
          scale: 1.09,
          duration: 2.1,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          svgOrigin: `${HEART.x} ${HEART.y}`,
        }));

        q("[data-pulse]").forEach((ring, i) => {
          parts.push(gsap.fromTo(ring,
            { scale: 1, opacity: 0.28 },
            {
              scale: 1.75,
              opacity: 0,
              duration: 4.2,
              ease: "sine.out",
              repeat: -1,
              delay: i * 2.1,
              svgOrigin: `${HEART.x} ${HEART.y}`,
            },
          ));
        });

        q("[data-sparkle]").forEach((sparkle, i) => {
          parts.push(gsap.to(sparkle, {
            y: i % 2 === 0 ? -7 : 6,
            duration: 2.6 + i * 0.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * 0.4,
          }));
        });

        // Off-screen or backgrounded, it costs nothing.
        let onScreen = false;
        const sync = () => {
          const run = onScreen && !document.hidden;
          parts.forEach((part) => (run ? part.play() : part.pause()));
        };

        const io = new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting;
          sync();
        }, { threshold: 0 });
        io.observe(el);
        document.addEventListener("visibilitychange", sync);

        cleanup = () => {
          io.disconnect();
          document.removeEventListener("visibilitychange", sync);
        };
      }, el);

      if (cancelled) {
        cleanup?.();
        ctx.revert();
        return;
      }
      const stopListening = cleanup;
      cleanup = () => {
        stopListening?.();
        ctx.revert();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <svg
      ref={root}
      viewBox="0 0 240 240"
      className={className}
      data-testid="care-animation"
      /* The headline says this in words; the drawing adds nothing to read. */
      aria-hidden
    >
      <defs>
        <clipPath id={`${uid}-child`}>
          <circle cx={CHILD.x} cy={CHILD.y} r={CHILD.r} />
        </clipPath>
        {PARENTS.map((p, i) => (
          <clipPath id={`${uid}-parent-${i}`} key={i}>
            <circle cx={p.x} cy={p.y} r={p.r} />
          </clipPath>
        ))}
      </defs>

      {/* The family, held together */}
      <circle
        cx="120"
        cy="120"
        r="106"
        fill="none"
        stroke="var(--line)"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />

      {/* The links you keep open */}
      {LINKS.map((link, i) => (
        <path
          key={i}
          d={curve(link)}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.28"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* What it is all for */}
      <g stroke="var(--accent)" fill="none">
        <circle data-pulse cx={HEART.x} cy={HEART.y} r="22" opacity="0" />
        <circle data-pulse cx={HEART.x} cy={HEART.y} r="22" opacity="0" />
      </g>
      <g data-heart>
        <path
          transform={`translate(${HEART.x} ${HEART.y}) scale(1.35) translate(-12 -11.4)`}
          d="M12 20.3 3.9 12.2a5 5 0 0 1 7.1-7.1l1 1 1-1a5 5 0 1 1 7.1 7.1L12 20.3z"
          fill="var(--accent)"
        />
      </g>

      {/* You */}
      <g>
        <circle
          cx={CHILD.x}
          cy={CHILD.y}
          r={CHILD.r}
          fill="var(--accent-soft)"
          stroke="var(--accent)"
          strokeOpacity="0.25"
        />
        <g clipPath={`url(#${uid}-child)`} fill="var(--accent)">
          <circle cx={CHILD.x} cy={CHILD.y - 8} r="10.5" />
          <path d={`M${CHILD.x - 23} ${CHILD.y + 42}v-9a23 23 0 0 1 46 0v9Z`} />
        </g>
      </g>

      {/* Ma and Baba */}
      {PARENTS.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            strokeOpacity="0.25"
          />
          <g clipPath={`url(#${uid}-parent-${i})`}>
            <g fill="var(--accent)">
              {/* Hair tied back — Ma. */}
              {i === 1 ? <circle cx={p.x} cy={p.y - 17} r="4.6" /> : null}
              <circle cx={p.x} cy={p.y - 7} r="8.8" />
              <path d={`M${p.x - 19} ${p.y + 35}v-7a19 19 0 0 1 38 0v7Z`} />
            </g>
            {/* Spectacles. Drawn as frames, not filled discs — filled lenses
                on a dark silhouette read as a pair of startled eyes. */}
            <g
              fill="none"
              stroke="var(--accent-soft)"
              strokeWidth="1.1"
              strokeLinecap="round"
            >
              <circle cx={p.x - 3.8} cy={p.y - 8.4} r="2.8" />
              <circle cx={p.x + 3.8} cy={p.y - 8.4} r="2.8" />
              <path d={`M${p.x - 1} ${p.y - 8.4}h2`} />
              <path d={`M${p.x - 6.6} ${p.y - 9.1}l-2.1 .6`} />
              <path d={`M${p.x + 6.6} ${p.y - 9.1}l2.1 .6`} />
            </g>
          </g>
        </g>
      ))}

      {/* The dose on its way */}
      {LINKS.map((_, i) => (
        <g data-dose={i} key={i} opacity="0">
          <rect x="-8" y="-4" width="16" height="8" rx="4" fill="var(--accent)" />
          <path d="M0 -4V4" stroke="var(--accent-soft)" strokeWidth="1.2" />
        </g>
      ))}

      {/* Taken */}
      {TICKS.map((tick, i) => (
        <g data-tick={i} key={i} opacity="0">
          <circle
            cx={tick.x}
            cy={tick.y}
            r="9.5"
            fill="var(--surface)"
            stroke="var(--accent)"
            strokeOpacity="0.3"
          />
          <path
            d={`M${tick.x - 3.8} ${tick.y}l2.7 2.9 4.9-5.9`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}

      {SPARKLES.map((s, i) => (
        <g data-sparkle key={i}>
          <path
            transform={`translate(${s.x} ${s.y}) scale(${s.size / 24}) translate(-12 -12)`}
            d="M12 1.5c.6 4.9 3.1 7.9 8.5 9-5.4 1.1-7.9 4.1-8.5 12-.6-7.9-3.1-10.9-8.5-12 5.4-1.1 7.9-4.1 8.5-9z"
            fill="var(--accent)"
            opacity="0.45"
          />
        </g>
      ))}
    </svg>
  );
}
