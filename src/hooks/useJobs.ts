import { useJobData } from './features/useJobData';
import { useJobActions } from './features/useJobActions';
import { jobService } from '@/services/business/job.service';

// Re-export Job type from service layer
export type { Job } from '@/services/api/job.api';

export const useJobs = () => {
  const jobData = useJobData();
  const jobActions = useJobActions();

  return {
    // Data
    jobs: jobData.jobs,
    loading: jobData.loading,
    error: jobData.error,
    refreshJobs: jobData.refreshJobs,
    
    // Actions
    createJob: jobActions.createJob,
    manageJob: jobActions.manageJob,
    exportResults: jobActions.exportResults,
    
    // Loading states
    isCreating: jobActions.isCreating,
    isManaging: jobActions.isManaging,
    isExporting: jobActions.isExporting,
    
    // Business logic helpers
    calculateProgress: jobService.calculateProgress.bind(jobService),
    getJobStatusColor: jobService.getJobStatusColor.bind(jobService),
    getJobStatusVariant: jobService.getJobStatusVariant.bind(jobService),
  };
};