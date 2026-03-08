import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-accent" />
            <span className="text-display text-lg font-bold text-foreground">NutHaven</span>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Premium quality nuts and dried fruits sourced from the finest farms around the world. Fresh, natural, and delivered with care.
          </p>
          <p className="text-xs text-muted-foreground">
            Done by{" "}
            <a
              href="https://yiddishwebpro.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              yiddishwebpro.com
            </a>
          </p>
          <p className="text-xs text-muted-foreground">© 2026 NutHaven. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
