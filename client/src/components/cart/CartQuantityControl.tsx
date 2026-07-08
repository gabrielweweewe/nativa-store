import { Minus, Plus } from "lucide-react";

interface CartQuantityControlProps {
  quantity: number;
  max?: number;
  disabled?: boolean;
  onChange: (quantity: number) => void;
  size?: "sm" | "md";
}

export default function CartQuantityControl({
  quantity,
  max = 99,
  disabled = false,
  onChange,
  size = "md",
}: CartQuantityControlProps) {
  const buttonSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const textSize = size === "sm" ? "text-sm w-6" : "text-base w-8";

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-[#E8D5C4] bg-white p-0.5">
      <button
        type="button"
        disabled={disabled || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        className={`${buttonSize} flex items-center justify-center rounded-lg text-[#3D2B1F] hover:bg-[#C4522A]/10 hover:text-[#C4522A] disabled:opacity-40 disabled:pointer-events-none transition-colors`}
        aria-label="Diminuir quantidade"
      >
        <Minus size={size === "sm" ? 12 : 14} />
      </button>
      <span
        className={`${textSize} text-center font-semibold text-[#3D2B1F] tabular-nums`}
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        {quantity}
      </span>
      <button
        type="button"
        disabled={disabled || quantity >= max}
        onClick={() => onChange(quantity + 1)}
        className={`${buttonSize} flex items-center justify-center rounded-lg text-[#3D2B1F] hover:bg-[#C4522A]/10 hover:text-[#C4522A] disabled:opacity-40 disabled:pointer-events-none transition-colors`}
        aria-label="Aumentar quantidade"
      >
        <Plus size={size === "sm" ? 12 : 14} />
      </button>
    </div>
  );
}
