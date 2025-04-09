"use client"

import type React from "react"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, UserIcon } from "lucide-react"
import Image from "next/image"

interface AvatarUploadProps {
  initialImage?: string
  name?: string
  size?: "sm" | "md" | "lg"
  bgColor?: string
  onImageChange?: (file: File | null) => void
}

export function AvatarUpload({
  initialImage,
  name,
  size = "md",
  bgColor = "bg-purple-500",
  onImageChange,
}: AvatarUploadProps) {
  const [image, setImage] = useState<string | undefined>(initialImage)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine avatar size based on prop
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  }

  // Determine button size based on avatar size
  const buttonSizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7 w-7",
  }

  // Determine icon size based on button size
  const iconSizeClasses = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  }

  // Determine user icon size based on avatar size
  const userIconSizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please select an image file (JPEG, PNG, etc.)",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please select an image smaller than 5MB",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string)
        if (onImageChange) {
          onImageChange(file)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setImage(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (onImageChange) {
      onImageChange(null)
    }
  }

  return (
    <div className="relative inline-block">
      <Avatar
        className={`${sizeClasses[size]} ${!image ? bgColor : ""} text-white flex items-center justify-center`}
      >
        {image ? (
          <Image
            width={128}
            height={128}
            src={image || "/placeholder.svg"}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : name ? (
          <span className={size === "lg" ? "text-xl" : "text-base"}>
            {name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <UserIcon className={userIconSizeClasses[size]} />
        )}
      </Avatar>

      <div className="absolute -bottom-1 -right-1 flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className={`${buttonSizeClasses[size]} rounded-full bg-background border shadow-sm hover:bg-muted`}
          onClick={handleClick}
        >
          <Pencil className={iconSizeClasses[size]} />
          <span className="sr-only">Edit avatar</span>
        </Button>

        {image && (
          <Button
            size="icon"
            variant="ghost"
            className={`${buttonSizeClasses[size]} rounded-full bg-background border shadow-sm hover:bg-red-50 hover:text-red-500`}
            onClick={handleRemove}
          >
            <Trash2 className={iconSizeClasses[size]} />
            <span className="sr-only">Remove avatar</span>
          </Button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        aria-label="Upload avatar"
      />
    </div>
  )
}
