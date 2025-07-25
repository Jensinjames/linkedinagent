import { useState, memo, useCallback, lazy, Suspense } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileMenu } from "@/components/ui/mobile-menu";
import { SkipLink } from "@/components/layout/SkipLink";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Lazy load heavy components
const FileUpload = lazy(() => import("@/components/upload/FileUpload").then(module => ({ default: module.FileUpload })));
const JobsTable = lazy(() => import("@/components/jobs/JobsTable").then(module => ({ default: module.JobsTable })));

const ComponentSkeleton = () => (
  <Card className="border-card-border">
    <CardContent className="pt-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </CardContent>
  </Card>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

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
            <Suspense fallback={<ComponentSkeleton />}>
              <FileUpload />
            </Suspense>
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
            <Suspense fallback={<ComponentSkeleton />}>
              <JobsTable />
            </Suspense>
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
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
        
        <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-card-border bg-card" role="banner">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">L</span>
              </div>
              <div>
                <h1 className="font-semibold text-sm text-foreground">LinkedIn Insight</h1>
                <p className="text-xs text-muted-foreground" aria-label="Application subtitle">Profile Extraction</p>
              </div>
            </div>
            <MobileMenu activeTab={activeTab} onTabChange={handleTabChange} />
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
