// Vercel owns the HTTP listener and process lifecycle. Local/Docker startup stays in src/server.ts.
export { app as default } from '../src/app.ts'
