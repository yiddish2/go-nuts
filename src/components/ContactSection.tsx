import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const CONTACT_EMAIL = "samples11219@gmail.com";

export default function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill out your name, email, and message.");
      return;
    }

    setSubmitting(true);
    try {
      const params = new URLSearchParams({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        _subject: "New Contact Form Message",
        _captcha: "false",
        _template: "table",
      });

      const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params.toString(),
      });

      const data = await res.json();
      if (!res.ok || data?.success === "false") {
        throw new Error(data?.message || "Failed to send message.");
      }

      toast.success("Message sent. We will get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      toast.error(err?.message || "Unable to send message right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="border-t bg-card">
      <div className="container mx-auto grid gap-8 px-4 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-display text-3xl font-bold text-foreground">Contact Us</h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Have a question, comment, or special request? Send us a message and we will respond by email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-background p-6">
          <input
            type="text"
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="email"
            required
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            required
            placeholder="Your question or comment"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}
