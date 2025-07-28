// Re-export the legacy file upload hook for compatibility with existing components
export {
    useFileUploadLegacy as useFileUpload,
    type UploadedFile
} from './features/useFileUploadLegacy';