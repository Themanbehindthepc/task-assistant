-- Task Assistant database schema
-- Run this in the Supabase SQL editor after creating your project.

drop table if exists public.tasks cascade;

create table public.tasks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    title text not null,
    priority text not null,
    category text not null default 'Other',
    due_date date,
    note text default '',
    recurrence text not null default 'none',
    completed boolean not null default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table public.tasks enable row level security;

create policy "Users can read own tasks"
    on public.tasks
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own tasks"
    on public.tasks
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own tasks"
    on public.tasks
    for update
    using (auth.uid() = user_id);

create policy "Users can delete own tasks"
    on public.tasks
    for delete
    using (auth.uid() = user_id);
