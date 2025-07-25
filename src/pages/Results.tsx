import React, { memo, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Filter,
  ExternalLink,
  User,
  Building,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScrapedProfile {
  id: string;
  job_id: string;
  linkedin_url: string;
  profile_data: {
    name?: string;
    title?: string;
    company?: string;
    location?: string;
    email?: string;
    phone?: string;
    summary?: string;
    experience?: Array<{
      title: string;
      company: string;
      duration: string;
    }>;
    education?: Array<{
      institution: string;
      degree: string;
      field: string;
    }>;
  };
  ai_enhanced_data?: any;
  quality_score?: number;
  extraction_status: 'success' | 'failed' | 'partial';
  created_at: string;
  updated_at: string;
}

const ProfileCard = memo(({ profile }: { profile: ScrapedProfile }) => (
  <Card className="border-card-border">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-subtle rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {profile.profile_data.name || 'No Name'}
            </CardTitle>
            <CardDescription>
              {profile.profile_data.title || 'No Title'}
            </CardDescription>
          </div>
        </div>
        <Badge 
          variant={profile.extraction_status === 'success' ? 'default' : 
                  profile.extraction_status === 'partial' ? 'secondary' : 'destructive'}
        >
          {profile.extraction_status}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {profile.profile_data.company && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4" />
            {profile.profile_data.company}
          </div>
        )}
        {profile.profile_data.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {profile.profile_data.location}
          </div>
        )}
        {profile.profile_data.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {profile.profile_data.summary}
          </p>
        )}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            {profile.quality_score && (
              <Badge variant="outline">
                Quality: {Math.round(profile.quality_score * 100)}%
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(profile.linkedin_url, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Profile
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
));

ProfileCard.displayName = 'ProfileCard';

const ResultsSkeleton = () => (
  <div className="space-y-6">
    <Card className="border-card-border">
      <CardHeader>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </CardHeader>
    </Card>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-card-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24 mt-1" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const Results: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['scraped-profiles', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      
      const { data, error } = await supabase
        .from('scraped_profiles')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(profile => ({
        ...profile,
        extraction_status: profile.status as 'success' | 'failed' | 'partial',
        updated_at: profile.created_at
      })) as ScrapedProfile[];
    },
    enabled: !!jobId,
  });

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => {
      const matchesSearch = !searchTerm || 
        profile.profile_data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.profile_data.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.profile_data.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || profile.extraction_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [profiles, searchTerm, statusFilter]);

  const handleExport = useCallback(async () => {
    if (!jobId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('export-results', {
        body: { jobId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Export failed');

      // Trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export completed',
        description: `Downloaded ${data.fileName}`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [jobId, toast]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load results: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Button>
        <Button
          onClick={handleExport}
          className="gap-2"
          disabled={!profiles.length}
        >
          <Download className="h-4 w-4" />
          Export Results
        </Button>
      </div>

      {isLoading ? (
        <ResultsSkeleton />
      ) : (
        <div className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>
                {job?.name || 'Job Results'}
              </CardTitle>
              <CardDescription>
                {profiles.length} profiles extracted • {filteredProfiles.length} shown
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {filteredProfiles.length === 0 ? (
            <Card className="border-card-border">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  {profiles.length === 0 ? 'No profiles found for this job.' : 'No profiles match your filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(Results);