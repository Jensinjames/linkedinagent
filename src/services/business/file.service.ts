import { fileApi, FileUpload } from '../api/file.api';
import { formatErrorMessage } from '@/lib/error-handling';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export class FileService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv'
  ];

  async uploadFile(file: File, userId: string): Promise<{ data?: { fileId: string; path: string }; error?: string }> {
    try {
      // Validate file first
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { error: validation.error };
      }

      return await fileApi.uploadFile(file, userId);
    } catch (error) {
      return { error: formatErrorMessage(error) };
    }
  }

  async getFileUploads(userId?: string): Promise<{ data?: FileUpload[]; error?: string }> {
    return fileApi.getFileUploads(userId);
  }

  async getFileById(id: string): Promise<{ data?: FileUpload; error?: string }> {
    return fileApi.getFileById(id);
  }

  async downloadFile(filePath: string): Promise<{ data?: Blob; error?: string }> {
    return fileApi.downloadFile(filePath);
  }

  async deleteFile(id: string, storagePath: string): Promise<{ error?: string }> {
    return fileApi.deleteFile(id, storagePath);
  }

  validateFile(file: File): FileValidationResult {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size must be less than ${this.formatFileSize(this.MAX_FILE_SIZE)}`
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Only Excel files (.xlsx, .xls) and CSV files are allowed'
      };
    }

    return { isValid: true };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileTypeIcon(fileType: string): string {
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return '📊';
    }
    if (fileType.includes('csv')) {
      return '📋';
    }
    return '📄';
  }

  isExcelFile(fileType: string): boolean {
    return fileType.includes('excel') || fileType.includes('spreadsheet');
  }

  isCsvFile(fileType: string): boolean {
    return fileType.includes('csv');
  }
}

export const fileService = new FileService();