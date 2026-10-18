-- Independent simulated store. Apply to Supabase Postgres before running scripts/seed.ts.
-- All monetary columns are INTEGER CENTS. No real payment/card fields are stored.
begin;

create function public.store_valid_address(value jsonb)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select coalesce(
    jsonb_typeof(value) = 'object'
    and value ?& array['fullName','street','city','state','zip','country']
    and (value - array['fullName','street','city','state','zip','country']) = '{}'::jsonb
    and jsonb_typeof(value->'fullName') = 'string' and length(btrim(value->>'fullName')) between 2 and 120
    and jsonb_typeof(value->'street') = 'string' and length(btrim(value->>'street')) between 2 and 200
    and jsonb_typeof(value->'city') = 'string' and length(btrim(value->>'city')) between 2 and 100
    and (value->>'fullName') !~ '[[:cntrl:]]' and (value->>'street') !~ '[[:cntrl:]]' and (value->>'city') !~ '[[:cntrl:]]'
    and jsonb_typeof(value->'state') = 'string' and (value->>'state') ~ '^[A-Z]{2}$'
    and jsonb_typeof(value->'zip') = 'string' and (value->>'zip') ~ '^[0-9]{5}(-[0-9]{4})?$'
    and value->>'country' = 'US', false
  );
$$;
revoke all on function public.store_valid_address(jsonb) from public, anon, authenticated;
grant execute on function public.store_valid_address(jsonb) to authenticated, service_role;

create table public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text not null default ''
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories(id),
  name text not null,
  slug text not null unique,
  description text not null,
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price >= price),
  brand text not null default '',
  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  images text[] not null default '{}',
  features text[] not null default '{}',
  is_featured boolean not null default false,
  color text not null default '',
  delivery_days integer not null default 5 check (delivery_days > 0)
);
create index products_category_idx on public.products(category_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  variant_name text not null,
  price_delta integer not null default 0,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  unique (id, product_id)
);
create index product_variants_product_idx on public.product_variants(product_id);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  created_at timestamptz not null default now()
);

create function public.store_create_profile()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  insert into public.users (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.store_create_profile() from public, anon, authenticated;
create trigger store_auth_user_created after insert on auth.users
for each row execute function public.store_create_profile();
insert into public.users (id, display_name)
select id, left(coalesce(raw_user_meta_data->>'full_name', ''), 120) from auth.users
on conflict (id) do nothing;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  address jsonb not null check (public.store_valid_address(address)),
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null,
  quantity integer not null check (quantity between 1 and 99),
  primary key (cart_id, variant_id),
  foreign key (variant_id, product_id) references public.product_variants(id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT preserves order ownership if an account has purchase history.
  user_id uuid references public.users(id) on delete restrict,
  guest_session_hash text check (guest_session_hash ~ '^[a-f0-9]{64}$'),
  guest_receipt_hash text check (guest_receipt_hash ~ '^[a-f0-9]{64}$'),
  scope_hash text not null check (scope_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  email text not null check (length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  status text not null default 'confirmed' check (status in ('confirmed','processing','shipped','delivered','cancelled')),
  subtotal integer not null check (subtotal >= 0),
  shipping_cost integer not null check (shipping_cost in (0, 495)),
  tax integer not null check (tax >= 0),
  total_amount integer not null check (total_amount >= 0),
  shipping_address jsonb not null check (public.store_valid_address(shipping_address)),
  payment_method text not null default 'demo' check (payment_method = 'demo'),
  created_at timestamptz not null default now(),
  unique (scope_hash, idempotency_key_hash),
  check (total_amount::bigint = subtotal::bigint + shipping_cost::bigint + tax::bigint),
  check (tax::bigint = (subtotal::bigint * 8 + 50) / 100),
  check (shipping_cost = case when subtotal = 0 or subtotal >= 5000 then 0 else 495 end),
  check ((user_id is not null and guest_session_hash is null and guest_receipt_hash is null)
      or (user_id is null and guest_session_hash is not null and guest_receipt_hash is not null))
);
create index orders_owner_created_idx on public.orders(user_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null,
  quantity integer not null check (quantity between 1 and 99),
  price_at_purchase integer not null check (price_at_purchase >= 0),
  name text not null,
  image text not null,
  variant_name text not null,
  unique (order_id, variant_id),
  foreign key (variant_id, product_id) references public.product_variants(id, product_id)
);

create table public.reviews (
  id text primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  is_sample boolean not null default false,
  author text not null check (length(author) between 1 and 120 and author !~ '@'),
  rating integer not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  check (not is_sample or user_id is null)
);
create index reviews_product_idx on public.reviews(product_id);
create index reviews_user_idx on public.reviews(user_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.users enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

-- Explicit grants complement RLS. There are no browser order or inventory writes.
revoke all on public.categories, public.products, public.product_variants, public.users,
  public.addresses, public.carts, public.cart_items, public.orders, public.order_items, public.reviews
  from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.categories, public.products, public.product_variants, public.reviews to anon, authenticated;
grant select on public.users, public.addresses, public.carts, public.cart_items, public.order_items to authenticated;
grant select (id, user_id, status, subtotal, shipping_cost, tax, total_amount, shipping_address, payment_method, created_at)
  on public.orders to authenticated;
grant insert (user_id, address) on public.addresses to authenticated;
grant all on public.categories, public.products, public.product_variants, public.users,
  public.addresses, public.carts, public.cart_items, public.orders, public.order_items, public.reviews to service_role;

create policy categories_public_read on public.categories for select to anon, authenticated using (true);
create policy products_public_read on public.products for select to anon, authenticated using (true);
create policy variants_public_read on public.product_variants for select to anon, authenticated using (true);
create policy users_owner_read on public.users for select to authenticated using ((select auth.uid()) = id);
create policy addresses_owner_read on public.addresses for select to authenticated using ((select auth.uid()) = user_id);
create policy addresses_owner_insert on public.addresses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy carts_owner_read on public.carts for select to authenticated using ((select auth.uid()) = user_id);
create policy cart_items_owner_read on public.cart_items for select to authenticated using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
);
create policy orders_owner_read on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy order_items_owner_read on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
);
create policy reviews_sample_read on public.reviews for select to anon, authenticated using (is_sample);
create policy reviews_owner_read on public.reviews for select to authenticated using (user_id = (select auth.uid()));
-- Deliberately NO anon SELECT policy for orders or order_items.

create function public.store_validate_items(p_items jsonb, p_allow_empty boolean default false)
returns void language plpgsql immutable set search_path = pg_catalog as $$
declare
  v_item jsonb;
  v_uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using message = 'STORE_INVALID', errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 50 or (not p_allow_empty and jsonb_array_length(p_items) = 0) then
    raise exception using message = 'STORE_INVALID', errcode = 'P0001';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using message = 'STORE_INVALID', errcode = 'P0001';
    end if;
    if not (v_item ?& array['productId','variantId','quantity'])
      or (v_item - array['productId','variantId','quantity']) <> '{}'::jsonb
      or jsonb_typeof(v_item->'productId') <> 'string'
      or jsonb_typeof(v_item->'variantId') <> 'string'
      or (v_item->>'productId') !~ v_uuid_pattern or (v_item->>'variantId') !~ v_uuid_pattern
      or jsonb_typeof(v_item->'quantity') <> 'number'
      or (v_item->>'quantity') !~ '^[1-9][0-9]?$' then
      raise exception using message = 'STORE_INVALID', errcode = 'P0001';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(p_items) i group by (i->>'variantId')::uuid having count(*) > 1) then
    raise exception using message = 'STORE_INVALID', errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.store_validate_items(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.store_validate_items(jsonb, boolean) to service_role;

create function public.replace_store_cart(p_user_id uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare v_cart_id uuid;
begin
  if p_user_id is null or not exists (select 1 from public.users where id = p_user_id) then
    raise exception using message = 'STORE_INVALID', errcode = 'P0001';
  end if;
  perform public.store_validate_items(p_items, true);
  insert into public.carts (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select id into v_cart_id from public.carts where user_id = p_user_id for update;

  if (select count(*) from jsonb_array_elements(p_items) i
      join public.product_variants v on v.id = (i->>'variantId')::uuid and v.product_id = (i->>'productId')::uuid
      join public.products p on p.id = v.product_id) <> jsonb_array_length(p_items) then
    raise exception using message = 'STORE_CATALOG', errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i
      join public.product_variants v on v.id = (i->>'variantId')::uuid
      where (i->>'quantity')::integer > v.stock_quantity)
    or exists (select 1 from jsonb_array_elements(p_items) i
      join public.products p on p.id = (i->>'productId')::uuid
      group by p.id having sum((i->>'quantity')::integer) > p.stock_quantity) then
    raise exception using message = 'STORE_STOCK', errcode = 'P0001';
  end if;
  -- Cart contents do not reserve inventory. Checkout revalidates under inventory locks.
  delete from public.cart_items where cart_id = v_cart_id;
  insert into public.cart_items (cart_id, product_id, variant_id, quantity)
  select v_cart_id, (i->>'productId')::uuid, (i->>'variantId')::uuid, (i->>'quantity')::integer
  from jsonb_array_elements(p_items) i;
  update public.carts set updated_at = now() where id = v_cart_id;
end;
$$;
revoke all on function public.replace_store_cart(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_store_cart(uuid, jsonb) to service_role;

create function public.checkout_store(
  p_user_id uuid, p_guest_session_hash text, p_scope_hash text,
  p_idempotency_key_hash text, p_request_hash text, p_guest_receipt_hash text,
  p_email text, p_shipping jsonb, p_items jsonb, p_payment_method text
)
returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_existing public.orders%rowtype;
  v_order_id uuid;
  v_scope_hash text;
  v_count bigint;
  v_subtotal bigint;
  v_shipping integer;
  v_tax bigint;
  v_total bigint;
begin
  if p_payment_method is distinct from 'demo' or not public.store_valid_address(p_shipping)
    or p_email is null or length(p_email) not between 3 and 254
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_scope_hash is null or p_scope_hash !~ '^[a-f0-9]{64}$'
    or p_idempotency_key_hash is null or p_idempotency_key_hash !~ '^[a-f0-9]{64}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception using message = 'STORE_INVALID', errcode = 'P0001';
  end if;
  if p_user_id is null then
    if p_guest_session_hash is null or p_guest_session_hash !~ '^[a-f0-9]{64}$'
      or p_guest_receipt_hash is null or p_guest_receipt_hash !~ '^[a-f0-9]{64}$' then
      raise exception using message = 'STORE_INVALID', errcode = 'P0001';
    end if;
    v_scope_hash := encode(sha256(convert_to('guest:' || p_guest_session_hash, 'UTF8')), 'hex');
  else
    if p_guest_session_hash is not null or p_guest_receipt_hash is not null
      or not exists (select 1 from public.users where id = p_user_id) then
      raise exception using message = 'STORE_INVALID', errcode = 'P0001';
    end if;
    v_scope_hash := encode(sha256(convert_to('user:' || p_user_id::text, 'UTF8')), 'hex');
  end if;
  if v_scope_hash <> p_scope_hash then
    raise exception using message = 'STORE_INVALID', errcode = 'P0001';
  end if;
  perform public.store_validate_items(p_items, false);

  -- Serialize the same identity/key before reading it; replay never decrements stock twice.
  perform pg_advisory_xact_lock(hashtextextended(p_scope_hash || ':' || p_idempotency_key_hash, 0));
  select * into v_existing from public.orders
  where scope_hash = p_scope_hash and idempotency_key_hash = p_idempotency_key_hash;
  if found then
    if v_existing.request_hash <> p_request_hash
      or v_existing.user_id is distinct from p_user_id
      or v_existing.guest_session_hash is distinct from p_guest_session_hash
      or v_existing.guest_receipt_hash is distinct from p_guest_receipt_hash then
      raise exception using message = 'STORE_IDEMPOTENCY', errcode = 'P0001';
    end if;
    return v_existing.id;
  end if;

  -- Global lock order prevents competing multi-product checkouts from deadlocking.
  perform p.id from public.products p
  where p.id in (select (i->>'productId')::uuid from jsonb_array_elements(p_items) i)
  order by p.id for update;
  perform v.id from public.product_variants v
  where v.id in (select (i->>'variantId')::uuid from jsonb_array_elements(p_items) i)
  order by v.id for update;

  select count(*), coalesce(sum((p.price::bigint + v.price_delta::bigint) * (i->>'quantity')::integer), 0)
  into v_count, v_subtotal
  from jsonb_array_elements(p_items) i
  join public.products p on p.id = (i->>'productId')::uuid
  join public.product_variants v on v.id = (i->>'variantId')::uuid and v.product_id = p.id;
  if v_count <> jsonb_array_length(p_items) then
    raise exception using message = 'STORE_CATALOG', errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i
      join public.products p on p.id = (i->>'productId')::uuid
      join public.product_variants v on v.id = (i->>'variantId')::uuid
      where p.price::bigint + v.price_delta::bigint not between 0 and 2147483647) then
    raise exception using message = 'STORE_AMOUNT', errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i
      join public.product_variants v on v.id = (i->>'variantId')::uuid
      where (i->>'quantity')::integer > v.stock_quantity)
    or exists (select 1 from jsonb_array_elements(p_items) i
      join public.products p on p.id = (i->>'productId')::uuid
      group by p.id having sum((i->>'quantity')::integer) > p.stock_quantity) then
    raise exception using message = 'STORE_STOCK', errcode = 'P0001';
  end if;
  if v_subtotal not between 0 and 2147483647 then
    raise exception using message = 'STORE_AMOUNT', errcode = 'P0001';
  end if;
  v_shipping := case when v_subtotal = 0 or v_subtotal >= 5000 then 0 else 495 end;
  v_tax := (v_subtotal * 8 + 50) / 100;
  v_total := v_subtotal + v_shipping + v_tax;
  if v_total > 2147483647 then
    raise exception using message = 'STORE_AMOUNT', errcode = 'P0001';
  end if;

  insert into public.orders (user_id, guest_session_hash, guest_receipt_hash, scope_hash, idempotency_key_hash,
    request_hash, email, subtotal, shipping_cost, tax, total_amount, shipping_address, payment_method)
  values (p_user_id, p_guest_session_hash, p_guest_receipt_hash, p_scope_hash, p_idempotency_key_hash,
    p_request_hash, p_email, v_subtotal::integer, v_shipping, v_tax::integer, v_total::integer, p_shipping, 'demo')
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, variant_id, quantity, price_at_purchase, name, image, variant_name)
  select v_order_id, p.id, v.id, (i->>'quantity')::integer, (p.price::bigint + v.price_delta::bigint)::integer,
    p.name, coalesce(p.images[1], ''), v.variant_name
  from jsonb_array_elements(p_items) i
  join public.products p on p.id = (i->>'productId')::uuid
  join public.product_variants v on v.id = (i->>'variantId')::uuid and v.product_id = p.id;

  update public.product_variants v set stock_quantity = v.stock_quantity - (i->>'quantity')::integer
  from jsonb_array_elements(p_items) i where v.id = (i->>'variantId')::uuid;
  update public.products p set stock_quantity = p.stock_quantity - requested.quantity
  from (select (i->>'productId')::uuid as product_id, sum((i->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) i group by (i->>'productId')::uuid) requested
  where p.id = requested.product_id;

  return v_order_id;
end;
$$;
revoke all on function public.checkout_store(uuid, text, text, text, text, text, text, jsonb, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.checkout_store(uuid, text, text, text, text, text, text, jsonb, jsonb, text)
  to service_role;

-- Public product imagery only. Authenticated clients receive no storage write policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy store_product_images_read on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');

commit;
