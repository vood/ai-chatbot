'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, UserIcon, Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface ImageUploaderProps {
  initialImage?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bgColor?: string;
  bucket: string;
  storagePath?: string;
  maxSizeMB?: number;
  onImageChange?: (file: File | null) => void;
  onImageUploaded?: (url: string, path: string) => void;
  onImageRemoved?: () => void;
  circular?: boolean;
  showPencilIcon?: boolean;
}

export function ImageUploader({
  initialImage,
  name,
  size = 'md',
  bgColor = 'bg-muted',
  bucket,
  storagePath = '',
  maxSizeMB = 5,
  onImageChange,
  onImageUploaded,
  onImageRemoved,
  circular = true,
  showPencilIcon = false,
}: ImageUploaderProps) {
  const [image, setImage] = useState<string | undefined>(
    initialImage || undefined,
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine container size based on prop
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  // Determine button size based on container size
  const buttonSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
    xl: 'h-8 w-8',
  };

  // Determine icon size based on button size
  const iconSizeClasses = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
    xl: 'h-4 w-4',
  };

  // Determine plus icon size based on container size
  const plusIconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  };

  // Handle click on the container when no image is present
  const handleContainerClick = () => {
    if (!image) {
      fileInputRef.current?.click();
    }
  };

  // Handle click on the edit button
  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Upload image to Supabase storage
  const uploadImageToStorage = async (
    file: File,
  ): Promise<{ url: string; path: string } | null> => {
    try {
      setIsUploading(true);
      const supabaseClient = createClient();

      // Get the current user ID
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) {
        toast.error('Authentication error', {
          description: 'You must be logged in to upload images',
        });
        return null;
      }

      // Create a path with user ID as first folder
      const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
      const userFolder = `${user.id}/`;
      const finalPath = storagePath
        ? `${userFolder}${storagePath}${fileName}`
        : `${userFolder}${fileName}`;

      const { error: uploadError, data } = await supabaseClient.storage
        .from(bucket)
        .upload(finalPath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        toast.error('Failed to upload image', {
          description: 'Please try again later',
        });
        return null;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabaseClient.storage.from(bucket).getPublicUrl(finalPath);

      return { url: publicUrl, path: finalPath };
    } catch (error) {
      console.error('Error in upload process:', error);
      toast.error('Failed to process image', {
        description: 'An unexpected error occurred',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please select an image file (JPEG, PNG, etc.)',
      });
      return;
    }

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error('File too large', {
        description: `Please select an image smaller than ${maxSizeMB}MB`,
      });
      return;
    }

    // Create local preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string);

        // Notify parent component about file selection
        if (onImageChange) {
          onImageChange(file);
        }

        // Upload to storage if bucket is provided
        if (bucket) {
          const result = await uploadImageToStorage(file);
          if (result && onImageUploaded) {
            onImageUploaded(result.url, result.path);
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle image removal
  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setImage(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (onImageChange) {
      onImageChange(null);
    }

    if (onImageRemoved) {
      onImageRemoved();
    }
  };

  const containerShape = circular ? 'rounded-full' : 'rounded-md';

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} ${!image ? `${bgColor} cursor-pointer hover:bg-muted-foreground/10` : ''} 
                   ${containerShape} flex items-center justify-center overflow-hidden border`}
        onClick={handleContainerClick}
      >
        {isUploading ? (
          <Loader2
            className={`${plusIconSizeClasses[size]} animate-spin text-muted-foreground`}
          />
        ) : image ? (
          <img
            src={image}
            alt={name || 'Avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <Plus
            className={`${plusIconSizeClasses[size]} text-muted-foreground`}
          />
        )}
      </div>

      {image && (
        <div className="absolute -bottom-1 -right-1 flex gap-1">
          {showPencilIcon && (
            <Button
              size="icon"
              variant="ghost"
              className={`${buttonSizeClasses[size]} rounded-full bg-background border shadow-sm hover:bg-muted`}
              onClick={handleEditClick}
            >
              <Pencil className={iconSizeClasses[size]} />
              <span className="sr-only">Edit image</span>
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            className={`${buttonSizeClasses[size]} rounded-full bg-background border shadow-sm hover:bg-red-50 hover:text-red-500`}
            onClick={handleRemove}
          >
            <Trash2 className={iconSizeClasses[size]} />
            <span className="sr-only">Remove image</span>
          </Button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        aria-label="Upload image"
      />
    </div>
  );
}
