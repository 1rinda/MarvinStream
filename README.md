# UGX Stream Hub

A modern video streaming application built with TanStack Start, Supabase, and TMDB.

## Deployment to Vercel

To deploy this application to Vercel, follow these steps:

1.  **Push to Git**: Ensure all changes are committed and pushed to your GitHub/GitLab/Bitbucket repository.
2.  **Connect to Vercel**: 
    *   Go to [Vercel](https://vercel.com) and create a new project.
    *   Import your repository.
3.  **Configure Environment Variables**:
    *   Add all keys listed in `.env.example` to the Vercel project settings.
    *   Specifically: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `TMDB_READ_ACCESS_TOKEN`, etc.
4.  **Build Settings**:
    *   **Framework Preset**: Vite (should be auto-detected).
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `.output/public`
    *   **Install Command**: `npm install` (or `bun install` if using Bun)
5.  **Deploy**: Vercel will build and deploy your application.

## Local Development

1.  Install dependencies: `npm install`
2.  Copy `.env.example` to `.env` and fill in the secrets.
3.  Start the dev server: `npm run dev`
