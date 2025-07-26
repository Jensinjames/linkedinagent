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
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (uploadError) {
        return { error: uploadError.message };
      }

      // Create file record in database
      const fileRecord: CreateFileUploadRequest = {
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: uploadData.path,
        user_id: userId,
        upload_status: 'completed'
      };

      const { data: dbData, error: dbError } = await supabase
        .from('file_uploads')
        .insert(fileRecord)
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('uploads').remove([uploadData.path]);
        return { error: dbError.message };
      }

      return {
        data: {
          fileId: dbData.id,
          path: uploadData.path
        }
      };
    } catch (error) {
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