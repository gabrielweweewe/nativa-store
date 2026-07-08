type LeafVariant = "green" | "greenLight" | "terracota" | "orange" | "turquoise" | "gold";

interface LeafConfig {
  variant: LeafVariant;
  size: number;
  top: string;
  left: string;
  delay: string;
  duration: string;
  animation: "auth-leaf-drift-a" | "auth-leaf-drift-b" | "auth-leaf-drift-c";
  opacity: number;
  rotate: number;
}

const LEAVES: LeafConfig[] = [
  { variant: "green", size: 56, top: "6%", left: "4%", delay: "0s", duration: "22s", animation: "auth-leaf-drift-a", opacity: 0.35, rotate: -25 },
  { variant: "terracota", size: 42, top: "12%", left: "18%", delay: "-4s", duration: "19s", animation: "auth-leaf-drift-b", opacity: 0.28, rotate: 15 },
  { variant: "orange", size: 34, top: "22%", left: "8%", delay: "-8s", duration: "24s", animation: "auth-leaf-drift-c", opacity: 0.32, rotate: -40 },
  { variant: "greenLight", size: 48, top: "38%", left: "3%", delay: "-2s", duration: "20s", animation: "auth-leaf-drift-b", opacity: 0.25, rotate: 30 },
  { variant: "turquoise", size: 30, top: "52%", left: "14%", delay: "-11s", duration: "26s", animation: "auth-leaf-drift-a", opacity: 0.22, rotate: -15 },
  { variant: "gold", size: 26, top: "68%", left: "6%", delay: "-6s", duration: "18s", animation: "auth-leaf-drift-c", opacity: 0.3, rotate: 45 },
  { variant: "green", size: 38, top: "78%", left: "20%", delay: "-14s", duration: "23s", animation: "auth-leaf-drift-a", opacity: 0.2, rotate: -30 },

  { variant: "terracota", size: 52, top: "8%", left: "82%", delay: "-3s", duration: "21s", animation: "auth-leaf-drift-c", opacity: 0.3, rotate: 35 },
  { variant: "greenLight", size: 44, top: "18%", left: "88%", delay: "-9s", duration: "25s", animation: "auth-leaf-drift-a", opacity: 0.26, rotate: -20 },
  { variant: "orange", size: 36, top: "32%", left: "92%", delay: "-5s", duration: "17s", animation: "auth-leaf-drift-b", opacity: 0.34, rotate: 50 },
  { variant: "green", size: 62, top: "48%", left: "78%", delay: "-12s", duration: "27s", animation: "auth-leaf-drift-b", opacity: 0.22, rotate: -35 },
  { variant: "gold", size: 28, top: "62%", left: "86%", delay: "-7s", duration: "20s", animation: "auth-leaf-drift-c", opacity: 0.28, rotate: 20 },
  { variant: "turquoise", size: 40, top: "74%", left: "90%", delay: "-1s", duration: "22s", animation: "auth-leaf-drift-a", opacity: 0.24, rotate: -45 },
  { variant: "terracota", size: 32, top: "86%", left: "76%", delay: "-10s", duration: "19s", animation: "auth-leaf-drift-b", opacity: 0.18, rotate: 10 },

  { variant: "greenLight", size: 24, top: "28%", left: "48%", delay: "-13s", duration: "28s", animation: "auth-leaf-drift-c", opacity: 0.14, rotate: 60 },
  { variant: "orange", size: 22, top: "58%", left: "52%", delay: "-15s", duration: "24s", animation: "auth-leaf-drift-a", opacity: 0.12, rotate: -55 },
  { variant: "green", size: 20, top: "44%", left: "62%", delay: "-16s", duration: "26s", animation: "auth-leaf-drift-b", opacity: 0.1, rotate: 25 },
];

const COLORS: Record<LeafVariant, { fill: string; stroke: string }> = {
  green: { fill: "#2D6A4F", stroke: "#1A4A35" },
  greenLight: { fill: "#52A87A", stroke: "#2D6A4F" },
  terracota: { fill: "#C4522A", stroke: "#8B3A1E" },
  orange: { fill: "#E8821A", stroke: "#C4522A" },
  turquoise: { fill: "#1B7A8C", stroke: "#0D5C6B" },
  gold: { fill: "#D4A843", stroke: "#B8892E" },
};

function LeafSvg({ variant, size }: { variant: LeafVariant; size: number }) {
  const { fill, stroke } = COLORS[variant];
  const shape = variant === "turquoise" || variant === "gold" ? "round" : variant === "orange" ? "tropical" : "classic";

  if (shape === "round") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 4 C24 8, 28 16, 24 24 C20 28, 12 28, 8 22 C4 16, 8 8, 16 4Z"
          fill={fill}
          fillOpacity={0.85}
        />
        <path d="M16 4 L16 26" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity={0.6} />
      </svg>
    );
  }

  if (shape === "tropical") {
    return (
      <svg width={size} height={size * 1.2} viewBox="0 0 36 44" fill="none" aria-hidden>
        <path
          d="M18 3 C28 10, 34 22, 30 34 C26 40, 18 42, 18 42 C18 42, 10 40, 6 34 C2 22, 8 10, 18 3Z"
          fill={fill}
          fillOpacity={0.8}
        />
        <path d="M18 3 L18 42" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity={0.55} />
        <path d="M18 12 C24 16, 28 22, 26 28" stroke={stroke} strokeWidth="0.8" strokeLinecap="round" opacity={0.35} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" fill="none" aria-hidden>
      <path
        d="M20 2 C32 12, 38 24, 34 36 C30 42, 20 44, 20 44 C20 44, 10 42, 6 36 C2 24, 8 12, 20 2Z"
        fill={fill}
        fillOpacity={0.78}
      />
      <path d="M20 2 L20 44" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity={0.55} />
      <path d="M20 10 C26 14, 30 20, 28 28" stroke={stroke} strokeWidth="0.8" strokeLinecap="round" opacity={0.35} />
    </svg>
  );
}

export default function AuthFloatingLeaves() {
  return (
    <div className="auth-floating-leaves pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {LEAVES.map((leaf, index) => (
        <div
          key={index}
          className="auth-floating-leaf absolute will-change-transform"
          style={{
            top: leaf.top,
            left: leaf.left,
            opacity: leaf.opacity,
            animation: `${leaf.animation} ${leaf.duration} ease-in-out ${leaf.delay} infinite`,
          }}
        >
          <div style={{ transform: `rotate(${leaf.rotate}deg)` }}>
            <LeafSvg variant={leaf.variant} size={leaf.size} />
          </div>
        </div>
      ))}
    </div>
  );
}
