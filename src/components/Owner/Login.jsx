import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../utils/authContext';
import { toast } from 'sonner';
import { LogIn, User, Lock, Building2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const watermark = (
    <div className="pointer-events-none fixed bottom-3 right-3 z-50 text-[10px] text-gray-500 dark:text-gray-400">
      powered by <span className="text-green-600 dark:text-green-400">Scrap</span>
      <span className="text-black dark:text-black">Co.</span>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Login successful!');
      } else {
        toast.error('Invalid email or password');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role) => {
    if (role === 'owner') {
      setEmail('owner@scrapco.com');
      setPassword('owner123');
    } else {
      setEmail('manager@scrapco.com');
      setPassword('manager123');
    }
  };

  return (
    <>
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mb-2 flex flex-col items-center">
            <h1 className="text-2xl font-semibold leading-tight">
              <span className="text-green-600 dark:text-green-400">G</span>
              <span className="text-green-600 dark:text-green-400">T</span>
              <span className="text-black">C</span>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">ScrapCo</p>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Login to continue</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
                Demo Credentials
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials('owner')}
                  className="text-xs"
                >
                  Owner Login
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials('manager')}
                  className="text-xs"
                >
                  Manager Login
                </Button>
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p><strong>Owner:</strong> owner@scrapco.com / owner123</p>
                <p><strong>Manager:</strong> manager@scrapco.com / manager123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      </div>

      {typeof document !== 'undefined' ? createPortal(watermark, document.body) : null}
    </>
  );
}
