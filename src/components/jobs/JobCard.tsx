import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { type Job } from "@/hooks/useJobs";

interface JobCardProps {
  job: Job;
  onManageJob: (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => void;
  onExportResults: (jobId: string) => void;
}

export const JobCard = ({ job, onManageJob, onExportResults }: JobCardProps) => {
  const getStatusBadge = (status: Job["status"]) => {
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
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-card-border">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{job.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {job.description || `ID: ${job.id.slice(0, 8)}`}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              {getStatusBadge(job.status)}
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
                  <DropdownMenuItem className="gap-2">
                    <Eye className="h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  {job.status === "running" && (
                    <DropdownMenuItem 
                      className="gap-2"
                      onClick={() => onManageJob(job.id, 'pause')}
                    >
                      <Pause className="h-4 w-4" />
                      Pause Job
                    </DropdownMenuItem>
                  )}
                  {job.status === "paused" && (
                    <DropdownMenuItem 
                      className="gap-2"
                      onClick={() => onManageJob(job.id, 'resume')}
                    >
                      <Play className="h-4 w-4" />
                      Resume Job
                    </DropdownMenuItem>
                  )}
                  {job.status === "failed" && (
                    <DropdownMenuItem 
                      className="gap-2"
                      onClick={() => onManageJob(job.id, 'retry')}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry Job
                    </DropdownMenuItem>
                  )}
                  {job.status === "completed" && (
                    <DropdownMenuItem 
                      className="gap-2"
                      onClick={() => onExportResults(job.id)}
                    >
                      <Download className="h-4 w-4" />
                      Download Results
                    </DropdownMenuItem>
                  )}
                  {["running", "paused", "queued"].includes(job.status) && (
                    <DropdownMenuItem 
                      className="gap-2 text-destructive"
                      onClick={() => onManageJob(job.id, 'cancel')}
                    >
                      <Square className="h-4 w-4" />
                      Cancel Job
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{job.processed_urls.toLocaleString()} processed</span>
              <span>{job.total_urls.toLocaleString()} total</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(job.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium">{job.duration || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};