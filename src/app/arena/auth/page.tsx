"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Zap, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "student" | "company";
type Mode = "signin" | "signup";

export default function ArenaAuthPage() {
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as Role) || "student";
  const redirect = searchParams.get("redirect") || "/arena";

  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>(defaultRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    companyName: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const destination = role === "company" ? "/company" : redirect;
    const endpoint = mode === "signin" ? "/api/auth/signin" : "/api/auth/signup";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signin"
            ? { email: form.email, password: form.password }
            : {
                email: form.email,
                password: form.password,
                name: form.name,
                userType: role,
                companyName: role === "company" ? form.companyName : undefined,
              }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error || "Authentication failed";
        toast.error(msg);
        setError(msg);
        setLoading(false);
        return;
      }

      toast.success(
        mode === "signin"
          ? "Welcome back!"
          : "Account created! Welcome to Hoot-Hoot."
      );
      window.location.href = destination;
    } catch (err) {
      const msg = "Network error — please try again.";
      toast.error(msg);
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              ← Back to Hoot-Hoot
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            {mode === "signin" ? "Sign in to" : "Create your"}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              {role === "company" ? "Company Portal" : "Practice Arena"}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "signin"
              ? "Access your competitive arena account"
              : "Join the competitive practice platform"}
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex rounded-lg border border-border overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              role === "student"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Zap className="w-4 h-4" />
            Student / Player
          </button>
          <button
            type="button"
            onClick={() => setRole("company")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              role === "company"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Building2 className="w-4 h-4" />
            Company / HR
          </button>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={update("name")}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
                value={form.password}
                onChange={update("password")}
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {mode === "signup" && role === "company" && (
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corp"
                  value={form.companyName}
                  onChange={update("companyName")}
                  required={role === "company"}
                />
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
