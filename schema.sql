-- MyBudget — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- Transactions
create table transactions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users not null,
  date        date not null,
  amount      numeric(10,2) not null,
  type        text not null check (type in ('income','expense')),
  category    text not null,
  description text,
  created_at  timestamptz default now()
);
alter table transactions enable row level security;
create policy "Own transactions" on transactions for all using (auth.uid() = user_id);

-- Budgets
create table budgets (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users not null,
  month        text not null,   -- format: YYYY-MM
  category     text not null,
  limit_amount numeric(10,2) not null,
  created_at   timestamptz default now(),
  unique(user_id, month, category)
);
alter table budgets enable row level security;
create policy "Own budgets" on budgets for all using (auth.uid() = user_id);

-- Savings Goals
create table savings_goals (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users not null,
  name           text not null,
  target_amount  numeric(10,2) not null,
  current_amount numeric(10,2) default 0,
  target_date    date,
  created_at     timestamptz default now()
);
alter table savings_goals enable row level security;
create policy "Own savings goals" on savings_goals for all using (auth.uid() = user_id);

-- Investment Accounts
create table investment_accounts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users not null,
  name         text not null,
  institution  text,
  account_type text not null,
  created_at   timestamptz default now()
);
alter table investment_accounts enable row level security;
create policy "Own investment accounts" on investment_accounts for all using (auth.uid() = user_id);

-- Investment Snapshots
create table investment_snapshots (
  id            uuid default gen_random_uuid() primary key,
  account_id    uuid references investment_accounts on delete cascade not null,
  user_id       uuid references auth.users not null,
  date          date not null,
  balance       numeric(10,2) not null,
  contributions numeric(10,2) default 0,
  created_at    timestamptz default now()
);
alter table investment_snapshots enable row level security;
create policy "Own investment snapshots" on investment_snapshots for all using (auth.uid() = user_id);
