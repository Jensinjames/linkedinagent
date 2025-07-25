import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useJobs } from "@/hooks/useJobs";
import { useToast } from "@/hooks/use-toast";
import { createJobSchema, fileUploadSchema, validateInput } from "@/lib/validation";
import { formatErrorMessage } from "@/lib/error-handling";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
} from "lucide-react";

export const FileUpload = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [jobName, setJobName] = useState("");
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadedFiles, uploadFile, removeFile } = useFileUpload();
  const { createJob } = useJobs();
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        // Validate file before upload
        validateInput(fileUploadSchema, {
          file,
          size: file.size,
          type: file.type,
        });
        
        await uploadFile(file);
      } catch (error) {
        toast({
          title: "File validation failed",
          description: formatErrorMessage(error),
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateJob = async () => {
    if (!selectedFileId || !jobName.trim()) return;

    try {
      setIsCreatingJob(true);
      
      // Validate input
      const validatedData = validateInput(createJobSchema, {
        fileId: selectedFileId,
        jobName: jobName.trim(),
      });

      const success = await createJob(validatedData.fileId, validatedData.jobName);
      if (success) {
        setDialogOpen(false);
        setJobName("");
        setSelectedFileId(null);
        toast({
          title: "Job created successfully",
          description: "Your extraction job has been queued for processing.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to create job",
        description: formatErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsCreatingJob(false);
    }
  };

  const startJobCreation = (fileId: string) => {
    setSelectedFileId(fileId);
    setDialogOpen(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload LinkedIn URLs
          </CardTitle>
          <CardDescription>
            Upload Excel files (.xlsx/.xls) containing LinkedIn profile URLs. Maximum file size: 50MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary-subtle"
                : "border-input-border bg-muted/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-primary-subtle rounded-full flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  Drop your Excel files here
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse files
                </p>
              </div>
              <Button
                variant="azure"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Files
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileSelect(e.target.files)}
              aria-label="Upload Excel files"
              aria-describedby="file-upload-description"
            />
            <div id="file-upload-description" className="sr-only">
              Upload Excel files containing LinkedIn URLs. Maximum file size: 50MB.
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              Files ready for processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {uploadFile.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : uploadFile.status === "error" ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {uploadFile.status === "uploading" && (
                      <Progress value={uploadFile.progress} className="mt-2" />
                    )}
                  </div>
                   <div className="flex flex-col sm:flex-row gap-2">
                     {uploadFile.status === "success" && uploadFile.fileId && (
                       <Button
                         variant="azure"
                         size="sm"
                         onClick={() => startJobCreation(uploadFile.fileId!)}
                         className="gap-2 h-8 w-full sm:w-auto"
                         aria-label={`Create job for ${uploadFile.file.name}`}
                       >
                         <Plus className="h-3 w-3" />
                         <span className="sm:inline">Create Job</span>
                       </Button>
                     )}
                     <Button
                       variant="ghost"
                       size="icon"
                       onClick={() => removeFile(uploadFile.id)}
                       className="h-8 w-8"
                       aria-label={`Remove ${uploadFile.file.name}`}
                     >
                       <X className="h-4 w-4" />
                     </Button>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Extraction Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="jobName">Job Name</Label>
              <Input
                id="jobName"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="Enter a name for this job..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateJob}
                disabled={!jobName.trim() || isCreatingJob}
                aria-label="Create extraction job"
              >
                {isCreatingJob ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};