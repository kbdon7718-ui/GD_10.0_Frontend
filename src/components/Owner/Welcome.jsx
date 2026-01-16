import React from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Building2, Shield } from "lucide-react";

export function Welcome({ onContinue, onAdminLogin }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4 relative">
      {typeof onAdminLogin === "function" ? (
        <div className="absolute top-4 right-4">
          <Button variant="outline" size="sm" onClick={onAdminLogin}>
            <Shield className="mr-2 h-4 w-4" /> Admin Login
          </Button>
        </div>
      ) : null}
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <Building2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold leading-tight">
            <span className="text-green-600 dark:text-green-400">G</span>
            <span className="text-green-600 dark:text-green-400">T</span>
            <span className="text-black">C</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Powered by ScrapCo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={onContinue}>
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
