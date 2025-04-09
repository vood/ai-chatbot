"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import type { Attachment } from "ai"

interface UseSupabaseStorageUploadOptions {
  onUploadSuccess?: (attachments: Attachment[]) => void
  onUploadError?: (error: Error, fileName: string) => void
  bucketResolver?: (file: File) => string // Optional custom logic to determine bucket
}

const defaultBucketResolver = (file: File): string => {
  const isImage = file.type.startsWith("image/")
  return isImage ? "message_images" : "files"
}

export function useSupabaseStorageUpload({
  onUploadSuccess,
  onUploadError,
  bucketResolver = defaultBucketResolver,
}: UseSupabaseStorageUploadOptions = {}) {
  const [uploadQueue, setUploadQueue] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = useCallback(
    async (file: File): Promise<Attachment | null> => {
      // Get the current user session
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("Upload Error: User not authenticated", userError)
        toast.error("Authentication error. Please log in again.")
        // Optionally call onUploadError here if needed
        // if (onUploadError) onUploadError(userError || new Error('User not authenticated'), file.name);
        return null // Stop upload if user is not found
      }

      const uuid = crypto.randomUUID()
      const bucketName = bucketResolver(file)
      // Construct path with user ID prefix
      const filePath = `${user.id}/${uuid}`

      try {
        // Removed setIsUploading(true) from here, moved to handleFileChange
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file)

        if (uploadError) {
          throw uploadError // Throw error to be caught below
        }

        // Get public URL
        const { data: urlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60 * 24 * 30)

        if (!urlData?.signedUrl) {
          throw new Error("Failed to get public URL after upload.")
        }

        return {
          url: urlData.signedUrl,
          name: file.name,
          contentType: file.type,
        }
      } catch (error: any) {
        console.error("Supabase Upload Error:", error)
        const errorMessage = error.message || "Unknown upload error"
        toast.error(`Upload failed for ${file.name}: ${errorMessage}`)
        if (onUploadError) {
          onUploadError(error, file.name)
        }
        return null
      }
      // Removed finally block as setIsUploading is handled in handleFileChange
    },
    [bucketResolver, onUploadError], // Include dependencies
  )

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      if (files.length === 0) return

      // Add files to the visual queue immediately
      const fileNames = files.map((file) => file.name)
      setUploadQueue((currentQueue) => [...currentQueue, ...fileNames])
      setIsUploading(true) // Set uploading status before starting uploads

      const successfullyUploadedAttachments: Attachment[] = []
      const failedFiles: string[] = []

      // Important: Fetch user once before mapping if all files go to the same user folder
      // However, uploadFile already fetches the user, so parallel uploads are fine.
      await Promise.all(
        files.map(async (file) => {
          const uploadedAttachment = await uploadFile(file)
          if (uploadedAttachment) {
            successfullyUploadedAttachments.push(uploadedAttachment)
          } else {
            failedFiles.push(file.name)
          }
        }),
      )

      // Update parent component state with successfully uploaded files
      if (successfullyUploadedAttachments.length > 0 && onUploadSuccess) {
        onUploadSuccess(successfullyUploadedAttachments)
      }

      // Remove processed files (both successful and failed) from the queue
      setUploadQueue((currentQueue) =>
        currentQueue.filter((queuedName) => !fileNames.includes(queuedName)),
      )

      setIsUploading(false) // Set uploading to false after all files are processed

      // Optional: Clear the file input for the next selection
      if (event.target) {
        event.target.value = ""
      }
    },
    [uploadFile, onUploadSuccess], // Include dependencies
  )

  return { uploadQueue, isUploading, handleFileChange }
}
