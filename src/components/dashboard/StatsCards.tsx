import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Clock, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, memo } from "react";

const StatCard = memo(({ stat }: { stat: any }) => {
  const Icon = stat.icon;
  const isPositive = stat.trend === "up";

  return (
    <Card key={stat.title} className="border-card-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
        <div className="flex items-center gap-1 mt-1">
          <span
            className={`text-xs font-medium ${
              isPositive ? "text-success" : "text-warning"
            }`}
          >
            {stat.change}
          </span>
          <span className="text-xs text-muted-foreground">
            {stat.description}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

export const StatsCards = memo(() => {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: profilesCount = 0 } = useQuery({
    queryKey: ['profiles-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('scraped_profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = useMemo(() => {
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const totalJobs = jobs.length;
    const successRate = totalJobs > 0 ? (completedJobs.length / totalJobs) * 100 : 0;
    
    const avgDuration = completedJobs.length > 0 
      ? completedJobs.reduce((acc, job) => {
          if (!job.started_at || !job.completed_at) return acc;
          const duration = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
          return acc + duration;
        }, 0) / completedJobs.length / 60000 // Convert to minutes
      : 0;

    return [
      {
        title: "Total Jobs",
        value: totalJobs.toLocaleString(),
        change: "+12%",
        icon: TrendingUp,
        trend: "up",
        description: "Last 30 days",
      },
      {
        title: "Profiles Extracted",
        value: profilesCount.toLocaleString(),
        change: "+8.2%",
        icon: Users,
        trend: "up",
        description: "This month",
      },
      {
        title: "Success Rate",
        value: `${successRate.toFixed(1)}%`,
        change: "+2.1%",
        icon: CheckCircle,
        trend: "up",
        description: "Average completion",
      },
      {
        title: "Avg Duration",
        value: `${Math.round(avgDuration)}m`,
        change: "-5m",
        icon: Clock,
        trend: "down",
        description: "Per job",
      },
    ];
  }, [jobs, profilesCount]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} stat={stat} />
      ))}
    </div>
  );
});