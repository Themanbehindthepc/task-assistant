-- Task Assistant database schema (name-based, no user accounts)
-- Run this in the Supabase SQL editor after creating your project.

drop table if exists public.tasks cascade;

create table public.tasks (
    id uuid default gen_random_uuid() primary key,
    owner_name text not null,
    title text not null,
    priority text not null default 'medium',
    category text not null default 'Other',
    due_date date,
    note text default '',
    recurrence text not null default 'none',
    completed boolean not null default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index tasks_owner_name_idx on public.tasks (owner_name);
