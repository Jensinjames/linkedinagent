import { useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
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
      <div className="flex h-screen bg-background">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
