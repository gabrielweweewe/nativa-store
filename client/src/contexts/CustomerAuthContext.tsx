import { mapAuthError } from "@/lib/authErrors";
import { updateCustomerProfile } from "@/lib/customerApi";
import { supabaseClient } from "@/lib/supabaseClient";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

interface CustomerAuthContextType {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signUp: (input: {
    fullName: string;
    phone?: string;
    email: string;
    password: string;
  }) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendSignupConfirmation: (email: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

async function syncProfileAfterAuth(
  token: string,
  input: { fullName: string; phone?: string },
): Promise<void> {
  try {
    await updateCustomerProfile(token, {
      fullName: input.fullName,
      phone: input.phone ?? "",
    });
  } catch {
    // O GET /me sincroniza metadata depois, se necessário.
  }
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signUp(input: {
    fullName: string;
    phone?: string;
    email: string;
    password: string;
  }): Promise<SignUpResult> {
    const { data, error } = await supabaseClient.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName.trim(),
          phone: input.phone ?? null,
        },
        emailRedirectTo: `${window.location.origin}/conta`,
      },
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }

    const token = data.session?.access_token;
    if (token) {
      await syncProfileAfterAuth(token, input);
      return { needsEmailConfirmation: false };
    }

    return { needsEmailConfirmation: true };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async function resetPassword(email: string) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async function updatePassword(password: string) {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async function resendSignupConfirmation(email: string) {
    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/conta`,
      },
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }
  }

  const value = useMemo(
    () => ({
      isLoading,
      session,
      user,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      resendSignupConfirmation,
    }),
    [isLoading, session, user],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth deve ser usado dentro de CustomerAuthProvider");
  }
  return context;
}
