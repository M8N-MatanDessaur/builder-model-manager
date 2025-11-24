# Deployment Guide for Netlify

This app is ready to deploy to Netlify!

## Quick Deploy

### Option 1: Deploy via Netlify CLI

1. Install Netlify CLI (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Deploy:
   ```bash
   netlify deploy --prod
   ```

### Option 2: Deploy via Git (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket

2. Go to [Netlify](https://app.netlify.com/)

3. Click "Add new site" → "Import an existing project"

4. Connect your Git repository

5. Netlify will auto-detect the settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`

6. Click "Deploy site"

### Option 3: Manual Deploy

1. Build the app locally:
   ```bash
   npm run build
   ```

2. Go to [Netlify Drop](https://app.netlify.com/drop)

3. Drag and drop the `dist` folder

## Configuration

The app includes a `netlify.toml` file with the following configuration:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **SPA redirects**: All routes redirect to `index.html` for client-side routing

## Environment Variables

This app doesn't require any environment variables - all Builder.io credentials are entered at runtime through the authentication screen.

## Post-Deployment

After deployment, your app will be available at:
- Your Netlify subdomain: `https://your-site-name.netlify.app`
- Custom domain (if configured)

### Features

- ✅ Client-side routing support
- ✅ Optimized production build
- ✅ Gzipped assets (69.67 kB main bundle)
- ✅ Fast CDN delivery via Netlify

## Troubleshooting

If you encounter issues:

1. **Build fails**: Check that Node.js version is 18+
2. **Routes not working**: Verify `netlify.toml` is in the root directory
3. **Assets not loading**: Clear browser cache and hard refresh

## Local Preview

To preview the production build locally:

```bash
npm run preview
```

This will serve the built files from the `dist` directory at `http://localhost:4173`.
