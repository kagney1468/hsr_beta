-- Add local area report cache columns to properties table
alter table properties
  add column if not exists local_area_report jsonb default null,
  add column if not exists local_area_report_cached_at timestamptz default null;

comment on column properties.local_area_report is 'Cached Gemini-generated local area report JSON';
comment on column properties.local_area_report_cached_at is 'Timestamp of last local area report generation';
