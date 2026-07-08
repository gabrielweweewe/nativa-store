import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";

export default function RequireCustomerAuth({ children }: { children: ReactNode }) {
  const { isLoading, user } = useCustomerAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/entrar");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
        <Spinner className="size-8 text-[#C4522A]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
