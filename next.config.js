/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    domains: [
      'openrouter.ai',
      't0.gstatic.com',
      'ai21.com',
      'anthropic.com',
      'cohere.ai',
      'deepinfra.com',
      'fireworks.ai',
      'google.com',
      'groq.com',
      'huggingface.co',
      'mistral.ai',
      'openai.com',
      'perplexity.ai',
      'replicate.com',
      'together.ai',
      'vertexai.google.com',
      'x.com',
      'yandex.com'
    ],
  },
};

module.exports = nextConfig; 