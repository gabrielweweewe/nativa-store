import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AuthFormCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function AuthFormCard({
  icon: Icon,
  title,
  description,
  children,
  className = "",
}: AuthFormCardProps) {
  return (
    <Card
      className={`w-full border-[#E8D5C4]/90 bg-white/95 shadow-[0_20px_60px_-24px_rgba(196,82,42,0.28)] backdrop-blur-sm ${className}`}
    >
      <CardHeader className="space-y-3 pb-2 pt-8 md:pt-10">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C4522A]/15 to-[#E8821A]/10 ring-1 ring-[#C4522A]/10">
          <Icon className="size-5 text-[#C4522A]" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="mt-2 text-sm leading-relaxed text-[#8B6F5E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {description}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-8 md:pb-10">{children}</CardContent>
    </Card>
  );
}
