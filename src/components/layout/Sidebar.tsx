import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  FileSpreadsheet,
  BarChart3,
  Settings,
  Upload,
  ChevronLeft,
  ChevronRight,
  User,
  Briefcase,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  return (
    <div
      className={cn(
        "flex flex-col bg-card border-r border-card-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-card-border">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm text-foreground">LinkedIn Insight</h1>
              <p className="text-xs text-muted-foreground">Profile Extraction</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isCollapsed && "px-2",
                  isActive && "bg-primary-subtle text-primary border border-primary/20"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && (
                  <div className="text-left">
                    <div className="text-sm font-medium">{item.label}</div>
                    {!isActive && (
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </div>
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-2 border-t border-card-border space-y-2">
        <div className="flex items-center gap-3 p-2 rounded bg-muted">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.first_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        )}
      </div>
    </div>
  );
};