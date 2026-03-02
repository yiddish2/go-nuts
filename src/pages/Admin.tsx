import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import AdminNuts from "@/components/admin/AdminNuts";
import AdminAllowedEmails from "@/components/admin/AdminAllowedEmails";
import AdminLoginAttempts from "@/components/admin/AdminLoginAttempts";
import AdminOrders from "@/components/admin/AdminOrders";
import { Loader2, Shield, Leaf } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { user, isAdmin, loading, signIn, signUp } = useAuth();
  const [tab, setTab] = useState<"nuts" | "emails" | "logins" | "orders">("nuts");

  // Auth form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show login form if not signed in
  if (!user) {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) toast.error(error.message);
        else toast.success("Check your email to confirm your account!");
      }
      setSubmitting(false);
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <Leaf className="h-10 w-10 text-accent" />
            <h1 className="text-display text-2xl font-bold text-foreground">
              {isLogin ? "Admin Sign In" : "Create Account"}
            </h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={!isLogin}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container mx-auto px-4 py-12">
        <h1 className="text-display mb-8 text-3xl font-bold text-foreground">Admin Dashboard</h1>

        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setTab("nuts")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              tab === "nuts" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            Manage Nuts
          </button>
          <button
            onClick={() => setTab("emails")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              tab === "emails" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            Manage Access
          </button>
          <button
            onClick={() => setTab("logins")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              tab === "logins" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            Login Attempts
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              tab === "orders" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            Orders
          </button>
        </div>

        {tab === "nuts" ? <AdminNuts /> : tab === "emails" ? <AdminAllowedEmails /> : tab === "orders" ? <AdminOrders /> : <AdminLoginAttempts />}
      </section>
      <Footer />
      <CartDrawer />
    </div>
  );
}
