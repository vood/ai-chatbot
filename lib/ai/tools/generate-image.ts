// lib/ai/tools/generate-image.ts
import { z } from 'zod';
import { experimental_generateImage as generateImage, tool } from 'ai';
import { replicate } from '@ai-sdk/replicate';
import { openai } from '@ai-sdk/openai';
import {
  SUPPORTED_IMAGE_MODELS,
  type ImageModelDefinition,
} from '@/lib/ai/models';
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/supabase/server';

// Initialize Supabase client for server-side usage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

// Common parameters schema
const imageParamsSchema = z.object({
  prompt: z.string().describe('A detailed text prompt describing the image.'),
  // Add other parameters supported by generateImage if needed
  // aspectRatio: z.enum(['16:9', '1:1', '9:16']).optional().describe('Aspect ratio.'),
  // size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().describe('Image size.') // Example for DALL-E
});

/**
 * Creates a specific CoreTool definition for a given image model.
 * @param model - The ImageModelDefinition object.
 * @returns A CoreTool object tailored for that model.
 */
function createImageModelTool(model: ImageModelDefinition) {
  const toolIdentifier = model.id.replace(/[^a-zA-Z0-9]/g, '_');
  const toolName = `generate_image_using_${toolIdentifier}`;

  return tool({
    description: `Generates an image using the ${model.name} model. ${model.description || ''}. Never return the image to the user, it is displayed in the UI to the user already.`,
    parameters: imageParamsSchema,
    execute: async ({ prompt /*, aspectRatio, size */ }) => {
      const modelId = model.id;
      console.log(
        `Executing Tool: ${toolName}, Model ID: "${modelId}", Prompt: "${prompt}"`,
      );

      try {
        // Get authenticated user
        const user = await auth();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Select the correct provider's .image() factory
        let providerModel: any;
        if (modelId.startsWith('dall-e')) {
          providerModel = openai.image(modelId as 'dall-e-3' | 'dall-e-2');
        } else {
          // Assume Replicate for others
          providerModel = replicate.image(modelId);
        }

        console.log(
          `Using provider model factory for: ${providerModel.modelId}`,
        );

        // Call experimental_generateImage following the documentation pattern
        const { image, warnings /* other potential results */ } =
          await generateImage({
            model: providerModel,
            prompt: prompt,
            // Pass other relevant parameters directly if supported by generateImage
            // aspectRatio: aspectRatio,
            // size: size, // Pass size if using DALL-E and size param is added
            // providerOptions: { ... } // Use for provider-specific options not in generateImage args
          });

        // Handle the image data
        if (!(image.uint8Array instanceof Uint8Array)) {
          throw new Error('Image data is not in expected format');
        }

        // Generate a unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 10);
        const filename = `${timestamp}-${randomId}.png`;

        // Prefix with user ID for proper organization and access control
        const filePath = `${user.id}/${filename}`;

        // Upload to Supabase
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('generated_images')
          .upload(filePath, image.uint8Array, {
            contentType: 'image/png',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error('Error uploading to Supabase:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('generated_images')
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          throw new Error('Failed to get public URL after upload');
        }

        console.log(
          `Tool ${toolName} generated and uploaded image. Public URL: ${urlData.publicUrl}`,
        );

        // Return the result
        return {
          url: urlData.publicUrl,
          prompt: prompt,
          alt: `AI generated image for prompt: ${prompt.substring(0, 30)}...`,
          modelUsed: modelId,
          message: `Generated image using ${model.name}.`,
          warnings: warnings,
        };
      } catch (error: any) {
        console.error(`Error executing ${toolName}:`, error);
        return {
          toolName: toolName,
          modelUsed: modelId,
          error: `Failed to generate image using ${model.name}: ${error.message}`,
        };
      }
    },
  });
}

// Dynamically create the map of tools (no change needed here)
export const imageGenerationTools: Record<string, any> = {};
SUPPORTED_IMAGE_MODELS.forEach((model) => {
  const tool = createImageModelTool(model);
  const toolIdentifier = model.id.replace(/[^a-zA-Z0-9]/g, '_');
  const toolName = `generate_image_using_${toolIdentifier}`;
  imageGenerationTools[toolName] = tool;
});

export const imageGenerationToolNames = Object.keys(imageGenerationTools);

// console.log('Available Image Generation Tools:', Object.keys(imageGenerationTools)); // For debugging
