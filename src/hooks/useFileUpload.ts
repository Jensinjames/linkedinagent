import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  fileId?: string;
}

export const useFileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileId = Math.random().toString(36).substr(2, 9);
    const uploadFile: UploadedFile = {
      id: fileId,
      file,
      status: 'uploading',
      progress: 0,
    };

    setUploadedFiles(prev => [...prev, uploadFile]);

    try {
      // Validate file
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('Invalid file type. Only Excel files are allowed.');
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size exceeds 50MB limit');
      }

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Update progress
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, progress: 50 } : f
        )
      );

      // Upload via edge function
      const { data, error } = await supabase.functions.invoke('upload-file', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');

      // Update success state
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId ? {
            ...f,
            status: 'success',
            progress: 100,
            fileId: data.fileId
          } : f
        )
      );

      toast({
        title: 'File uploaded successfully',
        description: `${file.name} is ready for processing`,
      });

      return data.fileId;
    } catch (error: any) {
      console.error('Upload error:', error);
      
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, status: 'error', progress: 0 } : f
        )
      );

      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });

      return null;
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  return {
    uploadedFiles,
    uploadFile,
    removeFile,
    clearFiles,
  };
};