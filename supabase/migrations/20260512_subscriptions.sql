-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  session_id             text not null,
  stripe_customer_id     text unique not null,
  stripe_subscription_id text unique,
  email                  text,
  status                 text not null default 'active',
  current_period_end     timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create index if not exists subscriptions_session_id_idx        on subscriptions(session_id);
create index if not exists subscriptions_stripe_customer_idx   on subscriptions(stripe_customer_id);
create index if not exists subscriptions_stripe_sub_idx        on subscriptions(stripe_subscription_id);

-- RLS: deny all client access — this table is only touched via service role in API routes
alter table subscriptions enable row level security;
