# Atom Prospects on Neon + Netlify

1. Neon → create project → SQL Editor → paste neon-setup.sql → Run (creates tables + imports your current board).
2. Neon → Dashboard → Connection string (pooled) → copy.
3. Netlify → Site → Environment variables:
   DATABASE_URL = (Neon connection string)
   GOOGLE_CLIENT_ID = 943423733158-lh7mk17a3ek8dfphsiu3ftnh7fdtqa3d.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET = (GOCSPX-… from Google Cloud)
   ALLOWED_DOMAIN = atomcontent.in
4. Deploy WITH functions (drag-and-drop does not deploy functions):
   cd site
   npx netlify-cli login
   npx netlify-cli link        # pick workinprospects1
   npx netlify-cli deploy --prod
5. Everyone: reload, then click "Sign in with Gmail" once more (tokens lived in Supabase).
