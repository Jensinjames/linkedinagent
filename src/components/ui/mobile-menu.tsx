import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  Menu,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Upload,
  User,
  Briefcase,
  LogOut,
} from "lucide-react";

interface MobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileMenu = ({ activeTab, onTabChange }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Overview and statistics",
    },
    {
      id: "upload",
      label: "Upload Files",
      icon: Upload,
      description: "Upload LinkedIn URLs",
    },
    {
      id: "jobs",
      label: "Jobs",
      icon: Briefcase,
      description: "Manage extraction jobs",
    },
    {
      id: "results",
      label: "Results",
      icon: FileSpreadsheet,
      description: "View and export results",
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      description: "Account settings",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      description: "App configuration",
    },
  ];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-card-border">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm text-foreground">LinkedIn Insight</h1>
              <p className="text-xs text-muted-foreground">Profile Extraction</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-12",
                      isActive && "bg-primary-subtle text-primary border border-primary/20"
                    )}
                    onClick={() => handleTabChange(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{item.label}</div>
                      {!isActive && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-card-border space-y-3">
            <div className="flex items-center gap-3 p-3 rounded bg-muted">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.user_metadata?.first_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};