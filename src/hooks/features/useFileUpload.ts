import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fileService } from '@/services/business/file.service';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UploadProgress {
  fileId?: string;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const useFileUpload = () => {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    status: 'idle'
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setUploadProgress({ progress: 0, status: 'uploading' });

      const result = await fileService.uploadFile(file, user.id);
      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      setUploadProgress({
        fileId: data?.fileId,
        progress: 100,
        status: 'success'
      });
      toast.success('File uploaded successfully');
    },
    onError: (error: Error) => {
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: error.message
      });
      toast.error(error.message);
    },
  });

  const validateFile = useCallback((file: File) => {
    return fileService.validateFile(file);
  }, []);

  const resetUpload = useCallback(() => {
    setUploadProgress({
      progress: 0,
      status: 'idle'
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return null;
    }

    try {
      const result = await uploadMutation.mutateAsync(file);
      return result;
    } catch (error) {
      return null;
    }
  }, [uploadMutation, validateFile]);

  return {
    uploadFile,
    validateFile,
    resetUpload,
    uploadProgress,
    isUploading: uploadMutation.isPending,
    formatFileSize: fileService.formatFileSize.bind(fileService),
    getFileTypeIcon: fileService.getFileTypeIcon.bind(fileService),
    // Legacy compatibility for existing components
    uploadedFiles: [],
    removeFile: (fileId: string) => resetUpload(),
  };
};