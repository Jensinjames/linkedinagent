import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fileService } from '@/services/business/file.service';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  fileId?: string;
  error?: string;
}

export const useFileUploadLegacy = () => {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, uploadId }: { file: File; uploadId: string }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update progress to show uploading
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, status: 'uploading' as const, progress: 50 } : f)
      );

      const result = await fileService.uploadFile(file, user.id);
      if (result.error) {
        throw new Error(result.error);
      }

      return { ...result.data, uploadId };
    },
    onSuccess: (data) => {
      setUploadedFiles(prev =>
        prev.map(f => 
          f.id === data?.uploadId 
            ? { ...f, status: 'success' as const, progress: 100, fileId: data.fileId }
            : f
        )
      );
      toast.success('File uploaded successfully');
    },
    onError: (error: Error, variables) => {
      setUploadedFiles(prev =>
        prev.map(f => 
          f.id === variables.uploadId 
            ? { ...f, status: 'error' as const, progress: 0, error: error.message }
            : f
        )
      );
      toast.error(error.message);
    },
  });

  const uploadFile = useCallback(async (file: File) => {
    // Validate file first
    const validation = fileService.validateFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    const uploadId = `${Date.now()}-${Math.random()}`;
    
    // Add file to the list immediately
    const newUploadedFile: UploadedFile = {
      id: uploadId,
      file,
      status: 'uploading',
      progress: 0,
    };

    setUploadedFiles(prev => [...prev, newUploadedFile]);

    // Start the upload
    try {
      await uploadMutation.mutateAsync({ file, uploadId });
    } catch (error) {
      // Error handling is done in the mutation onError callback
    }
  }, [uploadMutation]);

  const removeFile = useCallback((uploadId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== uploadId));
  }, []);

  const resetUpload = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  return {
    uploadFile,
    removeFile,
    resetUpload,
    uploadedFiles,
    isUploading: uploadMutation.isPending,
    formatFileSize: fileService.formatFileSize.bind(fileService),
    getFileTypeIcon: fileService.getFileTypeIcon.bind(fileService),
  };
};