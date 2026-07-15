import type { QuizPublicOption } from "@shared/types/quiz";
import { motion } from "framer-motion";

interface QuestionCardProps {
  option: QuizPublicOption;
  selected: boolean;
  disabled: boolean;
  onSelect: (optionId: string) => void;
}

export default function QuestionCard({ option, selected, disabled, onSelect }: QuestionCardProps) {
  return (
    <motion.button
      type="button"
      layout
      disabled={disabled}
      onClick={() => onSelect(option.id)}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      animate={{
        scale: selected ? 1.03 : 1,
        boxShadow: selected
          ? "0 12px 32px rgba(196, 82, 42, 0.28)"
          : "0 4px 16px rgba(61, 43, 31, 0.08)",
      }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="group relative w-full overflow-hidden rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4522A]/60"
      style={{
        background: "#FFFaf5",
        border: selected ? "2px solid #C4522A" : "2px solid transparent",
      }}
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-[#EDE4D8]">
        <img
          src={option.imageUrl}
          alt={option.label}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>
      <div className="px-4 py-3.5">
        <p
          className="text-sm font-semibold leading-snug sm:text-base"
          style={{ color: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}
        >
          {option.label}
        </p>
      </div>
    </motion.button>
  );
}
