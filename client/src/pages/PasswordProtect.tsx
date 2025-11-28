import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PasswordProtect() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Invalid password");
      }

      const data = await response.json();
      localStorage.setItem("auth_token", data.token);
      window.location.reload();
      toast({ title: "Access Granted", description: "Welcome to LifeSync Pro" });
    } catch (error) {
      toast({
        title: "Access Denied",
        description: "Invalid password. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-4 rounded-lg mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">LifeSync Pro</h1>
          <p className="text-muted-foreground text-sm mt-2">Password Protected</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              data-testid="input-password"
              className="mt-2"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !password}
            data-testid="button-unlock"
          >
            {isLoading ? "Verifying..." : "Unlock"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4">
          This is a private site. Please enter the password to continue.
        </p>
      </Card>
    </div>
  );
}
