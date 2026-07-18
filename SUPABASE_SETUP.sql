-- Create profiles table
create table profiles (
  id uuid references auth.users not null primary key,
  user_name text,
  profile_pic text,
  coin_balance integer default 0,
  referral_balance integer default 0,
  is_agent boolean default false,
  school_level text,
  experience text,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create gigs table
create table gigs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  category text,
  province text,
  location text,
  images text[] default '{}',
  budget text,
  owner_id uuid references auth.users not null,
  owner jsonb
);

-- Create seekers table
create table seekers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text,
  industry text,
  needs text,
  category text,
  province text,
  location text,
  images text[] default '{}',
  rate text,
  owner_id uuid references auth.users not null,
  owner jsonb
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;
alter table gigs enable row level security;
alter table seekers enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Policies for gigs
create policy "Gigs are viewable by everyone." on gigs for select using (true);
create policy "Users can insert their own gigs." on gigs for insert with check (auth.uid() = owner_id);
create policy "Users can update own gigs." on gigs for update using (auth.uid() = owner_id);
create policy "Users can delete own gigs." on gigs for delete using (auth.uid() = owner_id);

-- Policies for seekers
create policy "Seekers are viewable by everyone." on seekers for select using (true);
create policy "Users can insert their own seeker profile." on seekers for insert with check (auth.uid() = owner_id);
create policy "Users can update own seeker profile." on seekers for update using (auth.uid() = owner_id);
create policy "Users can delete own seeker profile." on seekers for delete using (auth.uid() = owner_id);

-- Create payments table for wallet feature
create table payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  user_email text,
  coins integer not null,
  price_rand integer not null,
  document_url text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policies for payments
alter table payments enable row level security;
create policy "Payments are viewable by everyone." on payments for select using (true);
create policy "Users can insert their own payments." on payments for insert with check (auth.uid() = user_id or auth.uid() is null);
create policy "Admins can update payments." on payments for update using (true);

