import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const SIGNUP_WHITELIST_BYPASS_UNTIL = new Date("2026-03-03T23:59:59Z");

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    } catch (err) {
      console.error("Failed to check admin role:", err);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth listener first - only update session/user synchronously
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setIsAdmin(false);
          setLoading(false);
        } else {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => {
            if (!mounted) return;
            checkAdmin(session.user.id).finally(() => {
              if (mounted) setLoading(false);
            });
          }, 0);
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkAdmin(session.user.id);
      }
      if (mounted) setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const bypassWhitelist = new Date() <= SIGNUP_WHITELIST_BYPASS_UNTIL;

    if (!bypassWhitelist) {
      // Check whitelist using security definer function
      const { data: isAllowed, error: checkError } = await supabase
        .rpc("is_email_allowed", { _email: email.trim().toLowerCase() });

      if (checkError) {
        return { error: new Error("Unable to verify email. Please try again.") };
      }
      if (!isAllowed) {
        return { error: new Error("This email is not authorized to sign up. Contact an admin.") };
      }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // Log the login attempt
    await supabase.from("login_attempts").insert({
      email: email.trim().toLowerCase(),
      success: !error,
      error_message: error?.message ?? null,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
