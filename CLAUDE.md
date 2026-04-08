# HomeSalesReady — Claude Code Rules

## Project
UK property pack platform by Kadima Systems Ltd. Live at homesalesready.com.
Stack: React + TypeScript, Supabase (DB + Auth), Vercel.

## Rules

- All wording in British English
- Never touch `.env` files, database credentials, or Supabase config unless explicitly asked
- Always explain what you are going to do before making any changes
- Make one change at a time and confirm before moving to the next
- Do not install new packages without asking first

## Database rule — CRITICAL
**Before writing any code that reads from or writes to a Supabase table, check the actual schema first.**
- Read the relevant files in `supabase/migrations/`
- If the table was created outside of migrations (directly in Supabase dashboard), ask the user to confirm the column names before writing any queries or upserts
- Never assume column names match what was previously written in code — they may differ
- This applies to edge functions, frontend queries, and RPC functions

> Lesson learned: the `property-intelligence` edge function assumed column names (`flood_risk_score`, `crime_rate`, `data_fetched_at`) that didn't exist in the actual table (`flood_risk`, `crime_statistics`, `last_updated`). Every upsert failed silently for weeks.
