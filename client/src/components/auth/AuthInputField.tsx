import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LucideIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";

interface AuthInputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  error?: string;
  labelExtra?: React.ReactNode;
}

export default function AuthInputField({
  id,
  label,
  icon: Icon,
  hint,
  error,
  labelExtra,
  className = "",
  ...props
}: AuthInputFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[#3D2B1F]">
          {label}
        </Label>
        {labelExtra}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
        <Input
          id={id}
          className={`h-11 rounded-xl border-[#E8D5C4] bg-[#FFFCF8] pl-10 transition-colors focus-visible:border-[#C4522A]/50 focus-visible:ring-[#C4522A]/20 ${className}`}
          {...props}
        />
      </div>
      {hint && !error && (
        <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
}
