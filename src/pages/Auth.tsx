import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ToothMark from "@/components/ToothMark";

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!loginData.email || !loginData.password) {
      toast.error("Please enter both username and password");
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(loginData.email, loginData.password);

      if (error) {
        toast.error(error.message || "Login failed");
      } else {
        toast.success("Login successful!");
        navigate("/", { replace: true });
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 animate-pulse place-items-center rounded-md bg-primary text-primary-foreground">
            <ToothMark className="h-7 w-7" />
          </span>
          <p className="text-sm text-muted-foreground">Opening the clinic...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="hidden flex-col justify-between border-r border-border bg-card p-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <ToothMark className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-lg leading-none">Tooth Time</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Dental Clinic
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="font-display text-3xl leading-tight">
            The day&apos;s schedule, records and visits in one place.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Appointments stay in sync across the front desk and treatment room, and the clinic keeps
            working when the internet does not.
          </p>
          <div className="clinic-rule mt-8 max-w-xs" />
        </div>

        <p className="text-xs text-muted-foreground">
          Accounts are issued by the clinic administrator.
        </p>
      </aside>

      {/* Sign-in form */}
      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <ToothMark className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-lg leading-none">Tooth Time</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Dental Clinic
              </p>
            </div>
          </div>

          <h1 className="font-display text-2xl">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use your clinic username and password.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Username</Label>
              <Input
                id="email"
                type="text"
                value={loginData.email}
                onChange={(event) =>
                  setLoginData((previous) => ({ ...previous, email: event.target.value }))
                }
                required
                disabled={loading}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={loginData.password}
                onChange={(event) =>
                  setLoginData((previous) => ({ ...previous, password: event.target.value }))
                }
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground">
            Patient records are confidential. Sign out before leaving a shared workstation.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
