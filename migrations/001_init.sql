create table groups (
  id text primary key,
  name text not null,
  tagline text not null default '',
  rules text not null default '',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

create table members (
  id text primary key,
  group_id text not null references groups (id),
  email text not null unique,
  name text not null,
  household text not null default '',
  password_hash text not null,
  phone text not null default '',
  address_line text not null default '',
  city text not null default '',
  region text not null default '',
  postal_code text not null default '',
  pickup_notes text not null default '',
  bio text not null default '',
  role text not null default 'member',
  status text not null default 'pending',
  rules_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint members_role_chk check (role in ('admin', 'member')),
  constraint members_status_chk check (status in ('pending', 'approved', 'suspended'))
);

create table sessions (
  token_hash text primary key,
  member_id text not null references members (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table invites (
  id text primary key,
  group_id text not null references groups (id),
  code text not null unique,
  email text not null default '',
  max_uses integer not null default 1,
  use_count integer not null default 0,
  note text not null default '',
  created_by text not null references members (id),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_uses_chk check (max_uses >= 1 and max_uses <= 200)
);

create table items (
  id text primary key,
  group_id text not null references groups (id),
  owner_id text not null references members (id),
  title text not null,
  description text not null default '',
  category text not null,
  condition text not null default 'good',
  quantity integer not null default 1,
  listing text not null default 'available',
  max_days integer not null default 7,
  needs_approval boolean not null default true,
  consumable boolean not null default false,
  safety_notes text not null default '',
  replacement_note text not null default '',
  photo_data text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_listing_chk check (listing in ('available', 'maintenance', 'hidden')),
  constraint items_quantity_chk check (quantity >= 1 and quantity <= 100),
  constraint items_days_chk check (max_days >= 1 and max_days <= 90)
);

create table item_links (
  id text primary key,
  item_id text not null references items (id) on delete cascade,
  label text not null,
  url text not null,
  position integer not null default 0
);

create table borrows (
  id text primary key,
  group_id text not null references groups (id),
  item_id text not null references items (id),
  borrower_id text not null references members (id),
  status text not null,
  start_on date not null,
  due_on date not null,
  message text not null default '',
  checkout_note text not null default '',
  return_note text not null default '',
  condition_out text not null default '',
  condition_in text not null default '',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  checked_out_at timestamptz,
  return_requested_at timestamptz,
  returned_at timestamptz,
  constraint borrows_status_chk check (
    status in (
      'requested',
      'approved',
      'declined',
      'checked_out',
      'return_pending',
      'returned',
      'cancelled'
    )
  )
);

create table asks (
  id text primary key,
  group_id text not null references groups (id),
  author_id text not null references members (id),
  title text not null,
  details text not null default '',
  category text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint asks_status_chk check (status in ('open', 'fulfilled', 'closed'))
);

create table ask_replies (
  id text primary key,
  ask_id text not null references asks (id) on delete cascade,
  author_id text not null references members (id),
  body text not null,
  offer_item_id text references items (id),
  created_at timestamptz not null default now()
);

create table notifications (
  id text primary key,
  member_id text not null references members (id) on delete cascade,
  title text not null,
  body text not null default '',
  href text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table app_meta (
  key text primary key,
  value text not null
);

create index items_group_idx on items (group_id);
create index borrows_item_idx on borrows (item_id);
create index borrows_borrower_idx on borrows (borrower_id);
create index borrows_group_idx on borrows (group_id, status);
create index notifications_member_idx on notifications (member_id, created_at desc);
create index asks_group_idx on asks (group_id, created_at desc);
