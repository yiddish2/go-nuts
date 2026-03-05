import heroBanner from "@/assets/hero-banner.jpg";

export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBanner} alt="Assorted premium nuts and dried fruits" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-bark/80 via-bark/50 to-transparent" />
      </div>
      <div className="container relative mx-auto flex min-h-[420px] items-center px-4 py-16 md:min-h-[500px]">
        <div className="max-w-lg animate-fade-in">
          <p className="inline-flex rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
            Flat $4.99 Shipping On All Orders
          </p>
          <h1 className="text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Nature's Finest Nuts & Dried Fruits
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Hand-selected, premium quality nuts and dried fruits delivered fresh to your door. From farm to snack — taste the difference.
          </p>
          <a
            href="#products"
            className="mt-6 inline-flex items-center rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            Build Your Bag
          </a>
        </div>
      </div>
    </section>
  );
}
