import { formatPrice } from "@/lib/products";
import { toast } from "sonner";

export interface CartRewardPayload {
  name: string;
  image?: string;
  price?: number;
  details?: string;
}

/** Toast rico + dispara micro-confete no viewport. */
export function showAddToCartReward(payload: CartRewardPayload) {
  spawnCartConfetti();

  toast.custom(
    (id) => (
      <div
        className="cart-reward-toast flex w-full max-w-[min(100vw-2rem,22rem)] items-center gap-3 rounded-2xl border border-[#E8D5C4] bg-[#FAF7F2] p-3 shadow-lg"
        role="status"
      >
        {payload.image ? (
          <img
            src={payload.image}
            alt=""
            className="h-14 w-12 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C4522A]/10 text-lg text-[#C4522A]">
            ✦
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold text-[#2D6A4F]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Adicionado ao carrinho
          </p>
          <p
            className="truncate text-sm font-semibold text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {payload.name}
          </p>
          {(payload.details || payload.price != null) && (
            <p
              className="truncate text-xs text-[#8B6F5E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {[payload.details, payload.price != null ? formatPrice(payload.price) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-[#8B6F5E] hover:bg-[#C4522A]/10 hover:text-[#C4522A]"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    ),
    { duration: 2800 },
  );
}

function spawnCartConfetti() {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const root = document.createElement("div");
  root.className = "cart-confetti-root";
  root.setAttribute("aria-hidden", "true");

  const colors = ["#C4522A", "#E8821A", "#C9922A", "#2D6A4F", "#1B7A8C"];
  for (let i = 0; i < 14; i++) {
    const piece = document.createElement("span");
    piece.className = "cart-confetti-piece";
    piece.style.setProperty("--c", colors[i % colors.length]);
    piece.style.setProperty("--x", `${(Math.random() * 120 - 60).toFixed(1)}px`);
    piece.style.setProperty("--r", `${(Math.random() * 360).toFixed(0)}deg`);
    piece.style.setProperty("--d", `${(0.45 + Math.random() * 0.45).toFixed(2)}s`);
    piece.style.left = `${20 + Math.random() * 60}%`;
    root.appendChild(piece);
  }

  document.body.appendChild(root);
  window.setTimeout(() => root.remove(), 900);
}
