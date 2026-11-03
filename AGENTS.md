# Project workflow

- This is the `ibb5-dashboard` Vite project. Use the existing GitHub remote and Vercel project; do not set up another deployment.
- For code changes, run the app with `npm run dev`, verify the affected behavior, and run `npm run build` before committing. Use `npm run preview` when production behavior needs checking.
- The user authorizes committing completed, verified changes with a descriptive message and pushing to `origin main`. Stage only relevant files. Do not overwrite unrelated work or force-push.
- Vercel automatically builds and deploys pushes to `main`. Do not run a separate deployment command. Report push and deployment status accurately; a successful push alone does not verify deployment success.
- Never commit `.env.local`, credentials, or secrets. Only use the public Supabase anon/publishable key in client code; never use a service-role key in the client.
- Supabase database and policy changes are separate from Git deployments. Inspect current policies before changing access. Current dashboard tables require authenticated SELECT access; do not widen access to fix an anonymous empty result.
- When authentication, network access, or a failed check blocks completion, explain the blocker rather than claiming the change was pushed or deployed.
