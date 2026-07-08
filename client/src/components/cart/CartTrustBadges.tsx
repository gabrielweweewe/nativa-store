import { RotateCcw, Shield, Truck } from "lucide-react";

export default function CartTrustBadges() {
  const badges = [
    { icon: Truck, label: "Frete grátis", sub: "Acima de R$ 299" },
    { icon: Shield, label: "Compra segura", sub: "Pagamento protegido" },
    { icon: RotateCcw, label: "Troca fácil", sub: "Até 30 dias" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[#E8D5C4] bg-white p-4">
      {badges.map(({ icon: Icon, label, sub }) => (
        <div key={label} className="text-center">
          <Icon size={20} className="mx-auto mb-1.5 text-[#2D6A4F]" />
          <p className="text-xs font-bold text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {label}
          </p>
          <p className="text-[10px] text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {sub}
          </p>
        </div>
      ))}
    </div>
  );
}
