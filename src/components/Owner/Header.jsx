// components/Header.jsx
import { Bell, Search, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { useAuth } from "../../utils/authContext";

export function Header({ darkMode, toggleDarkMode }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700 fixed top-0 w-full z-50">
      <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* Branding */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-10 h-10 rounded-md object-contain"
          />
          <div className="leading-tight">
            <h1 className="text-lg font-semibold">
              <span className="text-green-600 dark:text-green-400">G</span>
              <span className="text-green-600 dark:text-green-400">T</span>
              <span className="text-black dark:text-black">C</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Powered by ScrapCo</p>
          </div>
        </div>

        {/* Search */}
        <div className="w-full md:flex-1 md:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-10 w-full" placeholder="Search..." />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-sm"
            defaultValue={new Date().toISOString().split("T")[0]}
          />

          <Button onClick={toggleDarkMode} variant="ghost" size="icon">
            {darkMode ? <Sun /> : <Moon />}
          </Button>

          <Button variant="ghost" size="icon">
            <Bell />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-2">
                <Avatar>
                  <AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
              <div className="px-3 py-1 text-xs text-gray-500">{user?.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
