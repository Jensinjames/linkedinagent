import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Clock, CheckCircle } from "lucide-react";

export const StatsCards = () => {
  const stats = [
    {
      title: "Total Jobs",
      value: "156",
      change: "+12%",
      icon: TrendingUp,
      trend: "up",
      description: "Last 30 days",
    },
    {
      title: "Profiles Extracted",
      value: "12,847",
      change: "+8.2%",
      icon: Users,
      trend: "up",
      description: "This month",
    },
    {
      title: "Success Rate",
      value: "94.5%",
      change: "+2.1%",
      icon: CheckCircle,
      trend: "up",
      description: "Average completion",
    },
    {
      title: "Avg Duration",
      value: "31m",
      change: "-5m",
      icon: Clock,
      trend: "down",
      description: "Per job",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
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
      })}
    </div>
  );
};