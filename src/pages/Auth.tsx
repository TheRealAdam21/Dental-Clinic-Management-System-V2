
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { signIn, user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Auth page - user state:', { user: !!user, userRole, authLoading });
    
    // Redirect if user is authenticated
    if (user && !authLoading) {
      console.log('Redirecting to dashboard');
      toast.success("Welcome to your dashboard!");
      navigate('/', { replace: true });
    }
  }, [user, userRole, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    console.log('Starting login process');

    try {
      const { error } = await signIn(loginData.email, loginData.password);
      
      if (error) {
        console.error('Login error:', error);
        toast.error(error.message || "Login failed");
      } else {
        console.log('Login successful');
        toast.success("Login successful!");
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Show loading if auth is still initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Stethoscope className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Dental Clinic</h1>
          </div>
          <p className="text-gray-600">Access Portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Sign in to access the clinic management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
