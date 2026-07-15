import { motion } from "framer-motion";

/** Partículas leves no revelar — celebração sem poluir a marca. */
export default function RevealBurst() {
  const bits = Array.from({ length: 14 }, (_, i) => i);
  const colors = ["#C4522A", "#E8821A", "#2D6A4F", "#C9922A", "#8B6F5E"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((i) => {
        const left = 8 + ((i * 7) % 84);
        const delay = i * 0.04;
        const color = colors[i % colors.length];
        const size = 4 + (i % 4) * 2;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: "42%",
              width: size,
              height: size,
              background: color,
            }}
            initial={{ opacity: 0, y: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 1, 0],
              y: [0, -80 - (i % 5) * 18, -140 - (i % 3) * 20],
              x: [(i % 2 === 0 ? 1 : -1) * (10 + i * 3), (i % 2 === 0 ? 1 : -1) * (30 + i * 4)],
              scale: [0.4, 1.1, 0.2],
            }}
            transition={{ duration: 1.1, delay, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
