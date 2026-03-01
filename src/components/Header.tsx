import { ShoppingCart, Leaf, LogIn, LogOut, Shield, Moon, Sun } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";

export default function Header() {
  const { totalItems, setIsCartOpen } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-7 w-7 text-accent" />
          <span className="text-display text-xl font-bold text-foreground">
            NutHaven
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <a href="#products" className="text-muted-foreground transition-colors hover:text-foreground">Build a Bag</a>
          <a href="#about" className="text-muted-foreground transition-colors hover:text-foreground">About</a>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 text-primary transition-colors hover:text-primary/80">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          ) : (
            <Link
              to="/admin"
              className="flex items-center gap-1 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Sign in"
            >
              <LogIn className="h-5 w-5" />
            </Link>
          )}
          <button
            className="relative rounded-full p-2 text-foreground transition-colors hover:bg-secondary"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
