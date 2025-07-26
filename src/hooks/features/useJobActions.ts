import { useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService, JobAction } from '@/services/business/job.service';
import { toast } from 'sonner';

export const useJobActions = () => {
  const queryClient = useQueryClient();

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async ({ fileId, jobName }: { fileId: string; jobName: string }) => {
      const result = await jobService.createJob(fileId, jobName);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Manage job mutation (pause, resume, cancel, retry)
  const manageJobMutation = useMutation({
    mutationFn: async ({ jobId, action }: { jobId: string; action: JobAction }) => {
      const result = await jobService.manageJob(jobId, action);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async ({ jobId, action }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['jobs'] });

      // Snapshot the previous value
      const previousJobs = queryClient.getQueryData(['jobs']);

      // Optimistically update the job status
      queryClient.setQueryData(['jobs'], (oldJobs: any[]) => {
        if (!oldJobs) return [];
        
        return oldJobs.map(job => {
          if (job.id === jobId) {
            const newStatus = action === 'pause' ? 'paused' : 
                            action === 'resume' ? 'running' : 
                            action === 'cancel' ? 'cancelled' : 
                            action === 'retry' ? 'queued' : job.status;
            
            return { ...job, status: newStatus };
          }
          return job;
        });
      });

      return { previousJobs };
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs'], context.previousJobs);
      }
      toast.error(error.message);
    },
    onSuccess: (data, { action }) => {
      const actionMessages = {
        pause: 'Job paused successfully',
        resume: 'Job resumed successfully', 
        cancel: 'Job cancelled successfully',
        retry: 'Job retry initiated successfully'
      };
      toast.success(actionMessages[action]);
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  // Export results mutation
  const exportResultsMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const result = await jobService.exportResults(jobId);
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Export started successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createJob: async (fileId: string, jobName: string) => {
      return await createJobMutation.mutateAsync({ fileId, jobName });
    },
    manageJob: async (jobId: string, action: JobAction) => {
      return await manageJobMutation.mutateAsync({ jobId, action });
    },
    exportResults: exportResultsMutation.mutateAsync,
    isCreating: createJobMutation.isPending,
    isManaging: manageJobMutation.isPending,
    isExporting: exportResultsMutation.isPending,
  };
};