"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Zap, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

type Role = "student" | "company";
type Mode = "signin" | "signup";

export default function ArenaAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as Role) || "student";
  const redirect = searchParams.get("redirect") || "/arena";

  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>(defaultRole);
  const [loading, setLoading] = useState(false);

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

    const destination = role === "company" ? "/company" : redirect;

    if (mode === "signup") {
      await authClient.signUp.email(
        {
          email: form.email,
          password: form.password,
          name: role === "company" && form.companyName
            ? `${form.name} (${form.companyName})`
            : form.name,
        },
        {
          onSuccess: () => {
            toast.success("Account created! Welcome to Hoot-Hoot.");
            router.push(destination);
            router.refresh();
            setLoading(false);
          },
          onError: (ctx) => {
            toast.error(ctx.error.message || "Could not create account.");
            setLoading(false);
          },
        }
      );
    } else {
      await authClient.signIn.email(
        {
          email: form.email,
          password: form.password,
        },
        {
          onSuccess: () => {
            toast.success("Welcome back!");
            router.push(destination);
            router.refresh();
            setLoading(false);
          },
          onError: (ctx) => {
            toast.error(ctx.error.message || "Invalid email or password.");
            setLoading(false);
          },
        }
      );
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
                onClick={() => setMode(m)}
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
                  required
                />
              </div>
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
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
