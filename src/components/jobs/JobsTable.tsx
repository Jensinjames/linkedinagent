import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Play,
  Pause,
  Square,
  Download,
  RefreshCw,
  Eye,
  Loader2,
  Monitor,
  Smartphone,
} from "lucide-react";
import { useJobs, type Job } from "@/hooks/useJobs";
import { JobCard } from "./JobCard";
import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const JobsTableSkeleton = () => (
  <Card className="border-card-border">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const JobsTable = memo(() => {
  const { jobs, loading, manageJob, exportResults } = useJobs();
  const navigate = useNavigate();

  const getStatusBadge = useCallback((status: Job["status"]) => {
    const variants = {
      running: { variant: "default" as const, label: "Running" },
      completed: { variant: "outline" as const, label: "Completed" },
      failed: { variant: "destructive" as const, label: "Failed" },
      paused: { variant: "secondary" as const, label: "Paused" },
      queued: { variant: "secondary" as const, label: "Queued" },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const handleViewResults = useCallback((jobId: string) => {
    navigate(`/results/${jobId}`);
  }, [navigate]);

  if (loading) {
    return <JobsTableSkeleton />;
  }

  return (
    <Card className="border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Extraction Jobs</CardTitle>
            <CardDescription>
              Manage and monitor your LinkedIn profile extraction jobs
            </CardDescription>
          </div>
          {jobs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No jobs yet. Upload files to get started.
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>URLs</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="w-[50px]" aria-label="Actions"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{job.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.description || `ID: ${job.id.slice(0, 8)}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <div
                          className="space-y-1"
                          role="progressbar"
                          aria-valuenow={typeof job.progress === "number" ? job.progress : undefined}
                          aria-valuemin={typeof job.progress === "number" ? 0 : undefined}
                          aria-valuemax={100}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{job.progress}%</span>
                            <span className="text-muted-foreground">
                              {job.processed_urls}/{job.total_urls}
                            </span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{job.total_urls.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.processed_urls.toLocaleString()} processed
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(job.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {job.duration || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              aria-label={`Actions for ${job.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border border-border">
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => handleViewResults(job.id)}
                            >
                              <Eye className="h-4 w-4" />
                              View Results
                            </DropdownMenuItem>
                            {job.status === "running" && (
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => manageJob(job.id, 'pause')}
                              >
                                <Pause className="h-4 w-4" />
                                Pause Job
                              </DropdownMenuItem>
                            )}
                            {job.status === "paused" && (
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => manageJob(job.id, 'resume')}
                              >
                                <Play className="h-4 w-4" />
                                Resume Job
                              </DropdownMenuItem>
                            )}
                            {job.status === "failed" && (
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => manageJob(job.id, 'retry')}
                              >
                                <RefreshCw className="h-4 w-4" />
                                Retry Job
                              </DropdownMenuItem>
                            )}
                            {job.status === "completed" && (
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => exportResults(job.id)}
                              >
                                <Download className="h-4 w-4" />
                                Download Results
                              </DropdownMenuItem>
                            )}
                            {["running", "paused", "queued"].includes(job.status) && (
                              <DropdownMenuItem 
                                className="gap-2 text-destructive"
                                onClick={() => manageJob(job.id, 'cancel')}
                              >
                                <Square className="h-4 w-4" />
                                Cancel Job
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onManageJob={manageJob}
                  onExportResults={exportResults}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});