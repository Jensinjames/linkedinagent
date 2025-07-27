import { supabase } from '@/integrations/supabase/client';
import { formatErrorMessage } from '@/lib/error-handling';

export interface FileUpload {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  upload_status: string;
  user_id: string;
  created_at: string;
}

export interface CreateFileUploadRequest {
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  user_id: string;
  upload_status?: string;
}

export class FileApi {
  async uploadFile(file: File, userId: string): Promise<{ data?: { fileId: string; path: string }; error?: string }> {
    try {
      console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, userId });
      
      // Create FormData for the edge function
      const formData = new FormData();
      formData.append('file', file);

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No auth session found');
        return { error: 'Authentication required. Please log in again.' };
      }

      console.log('Calling upload-file edge function');
      
      // Call the upload-file edge function
      const { data, error } = await supabase.functions.invoke('upload-file', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        return { error: error.message || 'Upload failed' };
      }

      if (!data?.success) {
        console.error('Upload failed:', data?.error);
        return { error: data?.error || 'Upload failed' };
      }

      console.log('Upload successful:', { fileId: data.fileId, filename: data.filename });

      return {
        data: {
          fileId: data.fileId,
          path: data.filename
        }
      };
    } catch (error) {
      console.error('Upload error:', error);
      return { error: formatErrorMessage(error) };
    }
  }

  async getFileUploads(userId?: string): Promise<{ data?: FileUpload[]; error?: string }> {
    try {
      let query = supabase
        .from('file_uploads')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      return { data: data as FileUpload[] };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async getFileById(id: string): Promise<{ data?: FileUpload; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'File not found' };
      }

      return { data: data as FileUpload };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async downloadFile(filePath: string): Promise<{ data?: Blob; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .download(filePath);

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async deleteFile(id: string, storagePath: string): Promise<{ error?: string }> {
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('uploads')
        .remove([storagePath]);

      if (storageError) {
        return { error: storageError.message };
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('file_uploads')
        .delete()
        .eq('id', id);

      if (dbError) {
        return { error: dbError.message };
      }

      return {};
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }
}

export const fileApi = new FileApi();