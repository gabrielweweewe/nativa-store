import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AuthBrandPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  features: Array<{ icon: LucideIcon; text: string }>;
  footer?: ReactNode;
}

export default function AuthBrandPanel({
  eyebrow,
  title,
  description,
  features,
  footer,
}: AuthBrandPanelProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:justify-center lg:py-6">
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#C4522A]"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        {eyebrow}
      </p>
      <h2
        className="max-w-md text-3xl font-bold leading-tight text-[#3D2B1F] xl:text-4xl"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {title}
      </h2>
      <p
        className="mt-4 max-w-md text-base leading-relaxed text-[#8B6F5E]"
        style={{ fontFamily: "'Lora', serif" }}
      >
        {description}
      </p>

      <ul className="mt-10 flex flex-col gap-4">
        {features.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm ring-1 ring-[#E8D5C4]">
              <Icon className="size-4 text-[#C4522A]" />
            </span>
            <span
              className="text-sm font-medium text-[#3D2B1F]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {text}
            </span>
          </li>
        ))}
      </ul>

      {footer && (
        <div
          className="mt-10 rounded-2xl border border-[#E8D5C4]/80 bg-white/50 px-5 py-4 text-sm italic text-[#8B6F5E] backdrop-blur-sm"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {footer}
        </div>
      )}
    </aside>
  );
}
