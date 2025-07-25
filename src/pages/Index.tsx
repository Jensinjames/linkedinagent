import { useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileMenu } from "@/components/ui/mobile-menu";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { FileUpload } from "@/components/upload/FileUpload";
import { JobsTable } from "@/components/jobs/JobsTable";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">
                Overview of your LinkedIn profile extraction activities
              </p>
            </div>
            <StatsCards />
            <JobsTable />
          </div>
        );
      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Upload Files</h1>
              <p className="text-muted-foreground">
                Upload Excel files containing LinkedIn profile URLs for processing
              </p>
            </div>
            <FileUpload />
          </div>
        );
      case "jobs":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
              <p className="text-muted-foreground">
                Manage and monitor your extraction jobs
              </p>
            </div>
            <JobsTable />
          </div>
        );
      case "results":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Results</h1>
              <p className="text-muted-foreground">
                View and export your extracted profile data
              </p>
            </div>
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-card-border">
              <p className="text-muted-foreground">Results view coming soon...</p>
            </div>
          </div>
        );
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Profile</h1>
              <p className="text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-card-border">
              <p className="text-muted-foreground">Profile settings coming soon...</p>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">
                Configure application settings and integrations
              </p>
            </div>
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-card-border">
              <p className="text-muted-foreground">Settings panel coming soon...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        
        <main className="flex-1 overflow-auto">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-card-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">L</span>
              </div>
              <div>
                <h1 className="font-semibold text-sm text-foreground">LinkedIn Insight</h1>
                <p className="text-xs text-muted-foreground">Profile Extraction</p>
              </div>
            </div>
            <MobileMenu activeTab={activeTab} onTabChange={setActiveTab} />
          </header>
          
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
