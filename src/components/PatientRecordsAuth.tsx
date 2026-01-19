
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

interface PatientRecordsAuthProps {
  onAuthenticated: () => void;
  userEmail: string;
}

const PatientRecordsAuth = ({ onAuthenticated, userEmail }: PatientRecordsAuthProps) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current session to verify we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error("You must be logged in to access patient records");
        setLoading(false);
        return;
      }

      // Verify password matches current user's password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (error) {
        toast.error("Invalid password");
      } else if (data.user?.id === session.user.id) {
        toast.success("Access granted to patient records");
        onAuthenticated();
      } else {
        toast.error("Authentication failed");
      }
    } catch (error) {
      toast.error("Authentication failed");
    } finally {
      setLoading(false);
      setPassword(""); // Clear password field
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Patient Records Access</CardTitle>
          <CardDescription>
            Enter your password to access sensitive patient records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your login password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Access Records"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientRecordsAuth;
