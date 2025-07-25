import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";

interface Job {
  id: string;
  name: string;
  status: "running" | "completed" | "failed" | "paused" | "queued";
  progress: number;
  totalUrls: number;
  processedUrls: number;
  createdAt: string;
  duration?: string;
}

export const JobsTable = () => {
  const [jobs] = useState<Job[]>([
    {
      id: "job_1",
      name: "Sales Team Prospects Q1",
      status: "running",
      progress: 75,
      totalUrls: 1000,
      processedUrls: 750,
      createdAt: "2024-01-15T10:30:00",
    },
    {
      id: "job_2",
      name: "Marketing Leads Analysis",
      status: "completed",
      progress: 100,
      totalUrls: 500,
      processedUrls: 500,
      createdAt: "2024-01-14T09:15:00",
      duration: "23m 14s",
    },
    {
      id: "job_3",
      name: "Product Team Research",
      status: "failed",
      progress: 45,
      totalUrls: 250,
      processedUrls: 112,
      createdAt: "2024-01-13T14:20:00",
    },
    {
      id: "job_4",
      name: "Customer Success Outreach",
      status: "queued",
      progress: 0,
      totalUrls: 800,
      processedUrls: 0,
      createdAt: "2024-01-15T11:45:00",
    },
  ]);

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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Extraction Jobs</CardTitle>
            <CardDescription>
              Manage and monitor your LinkedIn profile extraction jobs
            </CardDescription>
          </div>
          <Button variant="azure" className="gap-2">
            <Play className="h-4 w-4" />
            New Job
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>URLs</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{job.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {job.id}</p>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(job.status)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{job.progress}%</span>
                      <span className="text-muted-foreground">
                        {job.processedUrls}/{job.totalUrls}
                      </span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="font-medium">{job.totalUrls.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.processedUrls.toLocaleString()} processed
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(job.createdAt)}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Eye className="h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {job.status === "running" && (
                        <DropdownMenuItem className="gap-2">
                          <Pause className="h-4 w-4" />
                          Pause Job
                        </DropdownMenuItem>
                      )}
                      {job.status === "paused" && (
                        <DropdownMenuItem className="gap-2">
                          <Play className="h-4 w-4" />
                          Resume Job
                        </DropdownMenuItem>
                      )}
                      {job.status === "failed" && (
                        <DropdownMenuItem className="gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Retry Job
                        </DropdownMenuItem>
                      )}
                      {job.status === "completed" && (
                        <DropdownMenuItem className="gap-2">
                          <Download className="h-4 w-4" />
                          Download Results
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="gap-2 text-destructive">
                        <Square className="h-4 w-4" />
                        Cancel Job
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};