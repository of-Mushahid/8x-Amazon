"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, CreditCard,
  LoaderCircle, LockKeyhole, LogOut, Mail, MapPin, Package,
  RefreshCw, ShieldCheck, ShoppingBag, Truck, UserRound,
} from "lucide-react";
import { money, totals } from "@/data/catalog";
import { resolveItems, useShop } from "@/lib/store";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Address, CheckoutInput, Order, OrderItem } from "@/lib/types";
import { useSession } from "@/components/shop/providers";
import "./account-flows.css";

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100, "Use 100 characters or fewer."),
  street: z.string().trim().min(5, "Enter a street address.").max(200, "Use 200 characters or fewer."),
  city: z.string().trim().min(2, "Enter your city.").max(100, "Use 100 characters or fewer."),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Choose your state."),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code, such as 10001."),
  country: z.literal("US"),
});
const emailSchema = z.string().trim().email("Enter a valid email address.").max(254, "Use 254 characters or fewer.");
const checkoutSchema = addressSchema.extend({ email: emailSchema });
const authSchema = z.object({ email: emailSchema, password: z.string().min(8, "Use at least 8 characters.").max(128, "Use 128 characters or fewer.") });
type CheckoutValues = z.infer<typeof checkoutSchema>;
type AuthValues = z.infer<typeof authSchema>;
type SavedAddress = Address & { id: string };
const blankAddress: Address = { fullName: "", street: "", city: "", state: "", zip: "", country: "US" };
const states = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeNext(value: string | null): string {
  if (value && ["/account", "/checkout", "/orders", "/saved", "/cart"].includes(value)) return value;
  if (value?.startsWith("/orders/") && uuidPattern.test(value.slice(8))) return value;
  return "/account";
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback = response.status === 503
      ? "The demo backend is not configured yet. Please try again when the service is available."
      : "We couldn’t complete that request. Please try again.";
    throw new Error(typeof data?.error === "string" ? data.error : fallback);
  }
  if (data === null) throw new Error("The server returned an unreadable response. Please try again.");
  return data as T;
}

function useRemote<T>(url: string | null, owner = "") {
  const [revision, setRevision] = useState(0);
  const key = `${url ?? ""}:${owner}:${revision}`;
  const [result, setResult] = useState<{ key: string; data: T | null; error: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    void requestJson<T>(url, { signal: controller.signal }).then(
      data => { if (!controller.signal.aborted) setResult({ key, data, error: "" }); },
      error => { if (!controller.signal.aborted) setResult({ key, data: null, error: messageOf(error, "Couldn’t connect. Please try again.") }); },
    );
    return () => controller.abort();
  }, [url, key]);
  const current = url && result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? "",
    loading: Boolean(url && !current),
    retry: () => setRevision(value => value + 1),
  };
}

function validateForm<T extends FieldValues>(form: UseFormReturn<T>, schema: z.ZodType<T>, values: T): T | null {
  form.clearErrors();
  const parsed = schema.safeParse(values);
  if (parsed.success) return parsed.data;
  for (const issue of parsed.error.issues) {
    form.setError(issue.path.join(".") as Path<T>, { type: "validate", message: issue.message });
  }
  const first = parsed.error.issues[0];
  if (first) form.setFocus(first.path.join(".") as Path<T>);
  return null;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <span className="af-field-error" id={id}>{message}</span> : null;
}

function AddressFields<T extends Address>({ form, prefix }: { form: UseFormReturn<T>; prefix: string }) {
  const fields = [
    { name: "fullName", label: "Full name", autoComplete: "name", wide: true, maxLength: 100 },
    { name: "street", label: "Street address", autoComplete: "address-line1", wide: true, maxLength: 200 },
    { name: "city", label: "City", autoComplete: "address-level2", wide: false, maxLength: 100 },
    { name: "zip", label: "ZIP code", autoComplete: "postal-code", wide: false, maxLength: 10 },
  ] as const;
  const stateError = form.getFieldState("state" as Path<T>, form.formState).error;
  return <div className="af-form-grid">
    {fields.map(field => {
      const id = `${prefix}-${field.name}`;
      const error = form.getFieldState(field.name as Path<T>, form.formState).error;
      return <div className={`field${field.wide ? " af-span-full" : ""}`} key={field.name}>
        <label htmlFor={id}>{field.label}</label>
        <input id={id} autoComplete={`shipping ${field.autoComplete}`} maxLength={field.maxLength}
          aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
          {...form.register(field.name as Path<T>)} />
        <FieldError id={`${id}-error`} message={error?.message} />
      </div>;
    })}
    <div className="field">
      <label htmlFor={`${prefix}-state`}>State</label>
      <select id={`${prefix}-state`} autoComplete="shipping address-level1" aria-required="true"
        aria-invalid={Boolean(stateError)} aria-describedby={stateError ? `${prefix}-state-error` : undefined}
        {...form.register("state" as Path<T>)}>
        <option value="">Select a state</option>
        {states.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
      <FieldError id={`${prefix}-state-error`} message={stateError?.message} />
    </div>
    <div className="field">
      <label htmlFor={`${prefix}-country`}>Country</label>
      <input id={`${prefix}-country`} value="United States" readOnly autoComplete="shipping country-name" />
      <input type="hidden" {...form.register("country" as Path<T>)} />
    </div>
  </div>;
}

function FlowShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`account-flows container ${className}`}>{children}</div>;
}

export function FlowLoading({ label = "Loading your Everyday…" }: { label?: string }) {
  return <FlowShell><div className="af-loading" role="status"><LoaderCircle className="af-spin" size={24} aria-hidden="true" /><span>{label}</span></div></FlowShell>;
}

function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-message af-error" role="alert"><p>{message}</p>{retry && <button className="af-text-link" type="button" onClick={retry}><RefreshCw size={15} aria-hidden="true" /> Try again</button>}</div>;
}

function DemoNote() {
  return <div className="af-demo-note"><ShieldCheck size={19} aria-hidden="true" /><p>An independent shopping demo. No real payments, charges, or shipments.</p></div>;
}

function AccountGate({ next, title }: { next: string; title: string }) {
  return <FlowShell><div className="empty-state af-gate">
    <span className="af-icon-tile"><UserRound size={28} aria-hidden="true" /></span>
    <p className="eyebrow">YOUR EVERYDAY</p><h1 className="page-heading">{title}</h1>
    <p className="muted">Sign in to your Everyday account to find your saved details and demo orders, all in one place.</p>
    <Link className="button" href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in to Everyday <ArrowRight size={17} aria-hidden="true" /></Link>
    <Link className="af-text-link" href="/shop">Just browsing? Explore the collection</Link>
    <DemoNote />
  </div></FlowShell>;
}

function AddressBlock({ address }: { address: Address }) {
  return <address className="af-address"><strong>{address.fullName}</strong><span>{address.street}</span><span>{address.city}, {address.state} {address.zip}</span><span>United States</span></address>;
}

function CostBreakdown({ subtotal, shipping, tax, total }: { subtotal: number; shipping: number; tax: number; total: number }) {
  return <dl className="af-totals">
    <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
    <div><dt>Standard shipping</dt><dd>{shipping === 0 ? <span className="af-green">Free</span> : money(shipping)}</dd></div>
    <div><dt>Estimated tax <span className="muted">(8% demo)</span></dt><dd>{money(tax)}</dd></div>
    <div className="af-total"><dt>Total <span>USD</span></dt><dd className="price">{money(total)}</dd></div>
  </dl>;
}

function ProductThumb({ src, name }: { src: string; name: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const remote = /^https:\/\//.test(src);
  const local = src?.startsWith("/") && !src.startsWith("//");
  return src && failedSource !== src && (local || remote)
    ? <Image className="af-product-image" src={src} alt={name} width={88} height={88}
        unoptimized={remote} onError={() => setFailedSource(src)} />
    : <span className="af-product-image af-image-fallback" role="img" aria-label={name}><Package size={27} aria-hidden="true" /></span>;
}

async function checkoutAttempt(input: Omit<CheckoutInput, "idempotencyKey">) {
  // Match the server fingerprint without importing its Node-only crypto helpers.
  const items = input.items.map(({ productId, variantId, quantity }) => ({
    productId: productId.toLowerCase(), variantId: variantId.toLowerCase(), quantity,
  })).sort((a, b) => a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0);
  const { email, ...shipping } = checkoutSchema.parse({ ...input.shipping, email: input.email });
  const normalized = JSON.stringify({ items, email: email.toLowerCase(), shipping, paymentMethod: "demo" });
  // Persist only a digest, not the shopper's email/address, in the storage key.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const storageKey = `everyday.checkout.v2:${fingerprint}`;
  try {
    const previous = sessionStorage.getItem(storageKey);
    if (previous && uuidPattern.test(previous)) return { storageKey, key: previous };
    const key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
    return { storageKey, key };
  } catch {
    throw new Error("Allow session storage in your browser before placing a demo order. It helps prevent duplicate orders if you retry.");
  }
}

async function submitCheckout(input: CheckoutInput) {
  const submit = async () => {
    const session = await requestJson<{ ready: boolean }>("/api/checkout", { method: "GET" });
    if (session.ready !== true) throw new Error("Your checkout session is not ready. Please retry.");
    return requestJson<{ orderId: string }>("/api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
  };
  // The cookie is shared across tabs, so serialize initialization through POST.
  return navigator.locks ? navigator.locks.request("everyday.checkout", submit) : submit();
}

export function CheckoutFlow() {
  const router = useRouter();
  const { user, ready } = useSession();
  const items = useShop(state => state.items);
  const hydrated = useShop(state => state.hydrated);
  const clear = useShop(state => state.clear);
  const rows = resolveItems(items);
  const amounts = totals(rows.reduce((sum, row) => sum + row.unitPrice * row.quantity, 0));
  const count = rows.reduce((sum, row) => sum + row.quantity, 0);
  const form = useForm<CheckoutValues>({ defaultValues: { ...blankAddress, email: "" } });
  const { register, formState: { errors }, getValues, getFieldState, setValue } = form;
  const addresses = useRemote<{ addresses: SavedAddress[] }>(ready && user ? "/api/addresses" : null, user?.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    if (user?.email && !getValues("email") && !getFieldState("email").isDirty) setValue("email", user.email);
  }, [user?.email, getValues, getFieldState, setValue]);

  async function placeOrder(raw: CheckoutValues) {
    if (submitting.current || !hydrated || !ready) return;
    const values = validateForm(form, checkoutSchema, raw);
    if (!values) return;
    if (!rows.length) { setError("Your bag is empty. Add something you love before checking out."); return; }
    submitting.current = true;
    setPending(true);
    setError("");
    let succeeded = false;
    try {
      const cartItems = rows.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity }));
      const { email, ...shipping } = values;
      const details = { items: cartItems, email, shipping, paymentMethod: "demo" as const };
      const attempt = await checkoutAttempt(details);
      const result = await submitCheckout({ ...details, idempotencyKey: attempt.key });
      if (!result.orderId || !uuidPattern.test(result.orderId)) throw new Error("We couldn’t read the order confirmation. Retry with the same bag; your request key has been kept to prevent duplicates.");
      succeeded = true;
      setCompleted(result.orderId);
      // Persistence can be unavailable even after the backend has accepted the order.
      // Never describe an acknowledged order as failed or submit it again.
      try { clear(); } catch { /* The in-memory cart is cleared before persistence runs. */ }
      try { sessionStorage.removeItem(attempt.storageKey); } catch { /* The confirmed receipt remains available. */ }
      router.push(`/orders/${result.orderId}`);
    } catch (cause) {
      setError(messageOf(cause, "We couldn’t place your demo order. Your bag is safe; please try again."));
    } finally {
      if (!succeeded) { submitting.current = false; setPending(false); }
    }
  }

  if (completed) return <FlowShell><div className="empty-state af-gate" role="status"><CheckCircle2 size={42} className="af-green" aria-hidden="true" /><h1 className="page-heading">Your demo order is in.</h1><p>No payment was taken. Opening your receipt…</p><Link className="button" href={`/orders/${completed}`}>View your receipt <ArrowRight size={17} aria-hidden="true" /></Link></div></FlowShell>;
  if (!hydrated || !ready) return <FlowLoading label="Getting your bag ready…" />;
  if (!rows.length) return <FlowShell><div className="empty-state af-gate"><span className="af-icon-tile"><ShoppingBag size={30} aria-hidden="true" /></span><p className="eyebrow">A LITTLE SOMETHING GOOD</p><h1 className="page-heading">Your bag is a fresh start.</h1><p className="muted">Find your next everyday favorite, then meet us back here.</p><Link className="button" href="/shop">Explore the collection <ArrowRight size={17} aria-hidden="true" /></Link></div></FlowShell>;

  return <FlowShell>
    <Link className="af-back-link" href="/cart"><ArrowLeft size={16} aria-hidden="true" /> Back to your bag</Link>
    <header className="af-page-header"><div><p className="eyebrow">THE GOOD STUFF, ALMOST YOURS</p><h1 className="page-heading">A few final details.</h1><p className="muted">Thoughtfully chosen. Simply checked out.</p></div><span className="af-badge"><LockKeyhole size={15} aria-hidden="true" /> Demo checkout</span></header>
    <ol className="af-checkout-steps" aria-label="Checkout progress"><li><Check size={15} aria-hidden="true" /> Your bag</li><li aria-current="step"><span>2</span> Checkout</li><li><span>3</span> Confirmation</li></ol>
    <form onSubmit={event => { void form.handleSubmit(placeOrder)(event); }} noValidate className="af-checkout-grid" aria-busy={pending}>
      <div className="af-stack">
        <section className="panel af-section" aria-labelledby="contact-heading">
          <div className="af-section-heading"><span className="af-step-number">01</span><h2 id="contact-heading">Let’s keep in touch.</h2></div>
          <p className="muted af-section-intro">{user ? "Your account email is filled in below. You can use another for this order." : <>Checking out as a guest. Have an account? <Link className="af-text-link" href="/sign-in?next=/checkout">Sign in</Link></>}</p>
          <fieldset disabled={pending} className="af-fieldset"><div className="field"><label htmlFor="checkout-email">Email address</label><input id="checkout-email" type="email" autoComplete="email" maxLength={254} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "checkout-email-error" : "checkout-email-help"} {...register("email")} /><FieldError id="checkout-email-error" message={errors.email?.message} /><span id="checkout-email-help" className="af-field-help">Your receipt will be available on the confirmation page.</span></div></fieldset>
        </section>
        <section className="panel af-section" aria-labelledby="shipping-heading">
          <div className="af-section-heading"><span className="af-step-number">02</span><h2 id="shipping-heading">Where would it go?</h2></div>
          <p className="muted af-section-intro">All fields are required. US addresses only for this demo.</p>
          {addresses.loading && <p className="af-field-help" role="status">Looking for your saved addresses…</p>}
          {addresses.error && <div className="af-address-suggestion-error"><ErrorNotice message={`Saved addresses couldn’t be loaded. You can still enter one below. ${addresses.error}`} retry={addresses.retry} /></div>}
          <fieldset disabled={pending} className="af-fieldset">
            {Boolean(addresses.data?.addresses.length) && <div className="field af-saved-address-picker"><label htmlFor="checkout-saved-address">Use a saved address <span className="muted">(optional)</span></label><select id="checkout-saved-address" defaultValue="" onChange={event => {
              const selected = addresses.data?.addresses.find(address => address.id === event.target.value);
              if (selected) for (const key of Object.keys(blankAddress) as (keyof Address)[]) form.setValue(key, selected[key], { shouldDirty: true });
              form.clearErrors(["fullName", "street", "city", "state", "zip"]);
            }}><option value="">Choose a saved address</option>{addresses.data?.addresses.map(address => <option value={address.id} key={address.id}>{address.fullName} — {address.street}, {address.city}</option>)}</select></div>}
            <AddressFields form={form} prefix="checkout" />
          </fieldset>
          <div className="af-shipping-note"><Truck size={21} aria-hidden="true" /><div><strong>Standard shipping</strong><p className="muted">{amounts.shipping === 0 ? "Free on this demo order." : `${money(amounts.shipping)} · Free on orders of $50 or more.`} No physical delivery.</p></div><span>{amounts.shipping === 0 ? "Free" : money(amounts.shipping)}</span></div>
        </section>
        <section className="panel af-section" aria-labelledby="payment-heading">
          <div className="af-section-heading"><span className="af-step-number">03</span><h2 id="payment-heading">A little practice, no payment.</h2></div>
          <div className="af-payment"><span className="af-radio-mark"><Check size={13} aria-hidden="true" /></span><CreditCard size={24} aria-hidden="true" /><div><strong>Simulated payment</strong><p>No card details. No charge. Just the Everyday experience.</p></div><span className="af-badge">DEMO</span></div>
          <p className="af-field-help">Placing this order saves a demo receipt to the configured backend. It does not make a purchase or arrange shipping.</p>
        </section>
      </div>
      <aside className="panel af-order-summary" aria-labelledby="review-heading">
        <div className="af-summary-heading"><h2 id="review-heading">Your good finds</h2><span className="muted">{count} {count === 1 ? "item" : "items"}</span></div>
        <ul className="af-item-list">{rows.map(row => <li className="af-line-item" key={row.variantId}><ProductThumb src={row.product.images[0]} name={row.product.name} /><div className="af-line-copy"><strong>{row.product.name}</strong><span className="muted">{row.variant.variant_name}</span><span className="muted">Qty {row.quantity} · {money(row.unitPrice)} each</span></div><strong className="af-line-price">{money(row.unitPrice * row.quantity)}</strong></li>)}</ul>
        <Link href="/cart" className="af-text-link af-edit-bag">Edit your bag</Link>
        <CostBreakdown {...amounts} />
        {error && <ErrorNotice message={error} />}
        <button className="button af-full-button" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="af-spin" size={18} aria-hidden="true" /> Placing demo order…</> : <>Place demo order <ArrowRight size={18} aria-hidden="true" /></>}</button>
        <p className="af-order-disclaimer">{error ? "Your bag is still here. Retry safely with the same order request." : "You won’t be charged. Prices and 8% tax are for demonstration only."}</p>
        <DemoNote />
      </aside>
    </form>
  </FlowShell>;
}

export function SignInFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { user, ready, configured } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const submitting = useRef(false);
  const form = useForm<AuthValues>({ defaultValues: { email: "", password: "" } });
  const { register, formState: { errors } } = form;

  async function authenticate(raw: AuthValues) {
    if (submitting.current) return;
    const values = validateForm(form, authSchema, raw);
    if (!values) return;
    setError("");
    const client = getBrowserSupabase();
    if (!client) { setError("Account services are not configured yet. You can still browse or check out as a guest when checkout is available."); return; }
    submitting.current = true;
    setPending(true);
    try {
      if (mode === "signup") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", next);
        const { data, error: authError } = await client.auth.signUp({
          email: values.email, password: values.password,
          options: { emailRedirectTo: callback.toString() },
        });
        if (authError) throw authError;
        if (!data.session) { setConfirmation(values.email); form.resetField("password"); return; }
      } else {
        const { error: authError } = await client.auth.signInWithPassword(values);
        if (authError) throw authError;
      }
      router.replace(next);
      router.refresh();
    } catch (cause) {
      setError(messageOf(cause, "We couldn’t sign you in. Please try again."));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (!ready) return <FlowLoading label="Checking your session…" />;
  if (user) return <FlowShell><div className="empty-state af-gate"><span className="af-icon-tile"><CheckCircle2 size={30} aria-hidden="true" /></span><p className="eyebrow">YOU’RE RIGHT AT HOME</p><h1 className="page-heading">You’re signed in.</h1><p className="muted af-break-word">{user.email}</p><Link href={next} className="button">{next === "/checkout" ? "Continue to checkout" : "Continue"} <ArrowRight size={17} aria-hidden="true" /></Link>{next !== "/account" && <Link href="/account" className="af-text-link">Go to your account</Link>}</div></FlowShell>;

  return <FlowShell className="af-auth-page">
    <div className="af-auth-layout">
      <section className="panel af-auth-card" aria-labelledby="auth-heading">
        <Link href="/" className="af-auth-wordmark">everyday<span>.</span></Link>
        {confirmation ? <div className="af-confirmation" role="status"><span className="af-icon-tile"><Mail size={29} aria-hidden="true" /></span><p className="eyebrow">ONE MORE STEP</p><h1 id="auth-heading" className="page-heading">Check your inbox.</h1><p>Check <strong className="af-break-word">{confirmation}</strong> for an account confirmation email. If you already have an account, sign in instead.</p><p className="muted">Follow the confirmation link to return. If this page stays open, sign in here once your email is confirmed.</p><button className="button af-full-button" type="button" onClick={() => { setConfirmation(""); setMode("signin"); }}>Back to sign in</button></div> : <>
          <h1 id="auth-heading" className="page-heading">{mode === "signin" ? "Sign in" : "Create account"}</h1>
          {!configured && <div className="af-service-note" role="status">Account services aren’t configured yet. No account or sign-in can be created until the backend is connected.</div>}
          <form onSubmit={event => { void form.handleSubmit(authenticate)(event); }} noValidate aria-busy={pending}>
            <fieldset className="af-fieldset af-stack" disabled={pending}>
              <div className="field"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" maxLength={254} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "auth-email-error" : undefined} {...register("email")} /><FieldError id="auth-email-error" message={errors.email?.message} /></div>
              <div className="field"><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} maxLength={128} aria-required="true" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "auth-password-error auth-password-help" : "auth-password-help"} {...register("password")} /><FieldError id="auth-password-error" message={errors.password?.message} /><span className="af-field-help" id="auth-password-help">Passwords must be at least 8 characters.</span></div>
              {error && <ErrorNotice message={error} />}
              <button type="submit" className="button af-full-button" disabled={pending || !configured}>{pending ? <><LoaderCircle className="af-spin" size={17} aria-hidden="true" /> One moment…</> : <>{mode === "signin" ? "Sign in" : "Create your Everyday account"}</>}</button>
            </fieldset>
          </form>
          <div className="af-auth-switch">
            <hr className="af-auth-divider" aria-hidden="true" />
            <p>{mode === "signin" ? "New to Everyday?" : "Already have an account?"}</p>
            <button type="button" className="button secondary af-full-button" disabled={pending} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); form.clearErrors(); }}>{mode === "signin" ? "Create your Everyday account" : "Sign in instead"}</button>
          </div>
          <p className="af-auth-guest">No account needed to shop. <Link className="af-text-link" href={next === "/checkout" ? "/checkout" : "/shop"}>{next === "/checkout" ? "Continue as a guest" : "Keep exploring"}</Link></p>
        </>}
        <DemoNote />
      </section>
    </div>
  </FlowShell>;
}

function AccountNav({ active }: { active: "account" | "orders" }) {
  return <nav className="af-account-nav" aria-label="Your account"><Link href="/account" aria-current={active === "account" ? "page" : undefined}><UserRound size={18} aria-hidden="true" /> Account & addresses <ChevronRight size={16} aria-hidden="true" /></Link><Link href="/orders" aria-current={active === "orders" ? "page" : undefined}><Package size={18} aria-hidden="true" /> Your orders <ChevronRight size={16} aria-hidden="true" /></Link><Link href="/saved"><ShoppingBag size={18} aria-hidden="true" /> Saved for later <ChevronRight size={16} aria-hidden="true" /></Link></nav>;
}

export function AccountFlow() {
  const { user, ready } = useSession();
  if (!ready) return <FlowLoading label="Getting your account ready…" />;
  if (!user) return <AccountGate next="/account" title="Your own little corner." />;
  return <AccountContent key={user.id} userId={user.id} email={user.email ?? "Email not available"} />;
}

function AccountContent({ userId, email }: { userId: string; email: string }) {
  const { signOut } = useSession();
  const router = useRouter();
  const addresses = useRemote<{ addresses: SavedAddress[] }>("/api/addresses", userId);
  const form = useForm<Address>({ defaultValues: blankAddress });
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [success, setSuccess] = useState("");
  const savingRef = useRef(false);
  const logoutRef = useRef(false);

  async function saveAddress(raw: Address) {
    if (savingRef.current) return;
    const address = validateForm(form, addressSchema, raw);
    if (!address) return;
    savingRef.current = true;
    setSaving(true); setError(""); setSuccess("");
    try {
      await requestJson<{ address: SavedAddress }>("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
      form.reset(blankAddress);
      setSuccess("Address saved. It will be available at checkout.");
      addresses.retry();
    } catch (cause) { setError(messageOf(cause, "We couldn’t save your address. Please try again.")); }
    finally { savingRef.current = false; setSaving(false); }
  }

  async function logout() {
    if (logoutRef.current) return;
    logoutRef.current = true;
    setLoggingOut(true); setLogoutError("");
    try { await signOut(); router.replace("/sign-in"); router.refresh(); }
    catch (cause) { setLogoutError(messageOf(cause, "We couldn’t sign you out. Please try again.")); }
    finally { logoutRef.current = false; setLoggingOut(false); }
  }

  return <FlowShell>
    <header className="af-page-header"><div><p className="eyebrow">YOUR EVERYDAY</p><h1 className="page-heading">Make yourself at home.</h1><p className="muted">Your details, ready for the next good find.</p></div><button className="button secondary" type="button" onClick={logout} disabled={loggingOut || saving}>{loggingOut ? <LoaderCircle className="af-spin" size={17} aria-hidden="true" /> : <LogOut size={17} aria-hidden="true" />} {loggingOut ? "Signing out…" : "Sign out"}</button></header>
    {logoutError && <ErrorNotice message={logoutError} />}
    <div className="af-account-layout"><AccountNav active="account" /><div className="af-stack">
      <section className="panel af-profile"><span className="af-icon-tile"><UserRound size={28} aria-hidden="true" /></span><div><p className="eyebrow">SIGNED IN AS</p><h2 className="af-break-word">{email}</h2><p className="muted">Your independent Everyday demo account.</p></div><Link className="af-text-link" href="/orders">View your orders <ArrowRight size={16} aria-hidden="true" /></Link></section>
      <section className="panel af-section" aria-labelledby="saved-addresses-heading"><div className="af-summary-heading"><h2 id="saved-addresses-heading">Your address book</h2><MapPin size={21} aria-hidden="true" /></div><p className="muted af-section-intro">A little less typing next time.</p>
        {addresses.loading ? <div className="af-inline-loading" role="status"><LoaderCircle className="af-spin" size={18} aria-hidden="true" /> Loading your addresses…</div> : addresses.error ? <ErrorNotice message={addresses.error} retry={addresses.retry} /> : addresses.data?.addresses.length ? <div className="af-address-grid">{addresses.data.addresses.map(address => <div className="af-address-card" key={address.id}><MapPin size={18} aria-hidden="true" /><AddressBlock address={address} /></div>)}</div> : <div className="af-small-empty"><MapPin size={23} aria-hidden="true" /><p>No saved addresses yet. Add your first one below.</p></div>}
      </section>
      <section className="panel af-section" aria-labelledby="new-address-heading"><h2 id="new-address-heading">Add an address</h2><p className="muted af-section-intro">All fields are required. Saved to your account, not just this device.</p><form onSubmit={event => { void form.handleSubmit(saveAddress)(event); }} noValidate aria-busy={saving}><fieldset className="af-fieldset af-stack" disabled={saving || loggingOut}><AddressFields form={form} prefix="account" />{error && <ErrorNotice message={error} />}{success && <p className="af-success" role="status"><CheckCircle2 size={18} aria-hidden="true" />{success}</p>}<button type="submit" className="button af-align-start" disabled={saving || loggingOut}>{saving ? <><LoaderCircle className="af-spin" size={17} aria-hidden="true" /> Saving address…</> : <>Save address <ArrowRight size={17} aria-hidden="true" /></>}</button></fieldset></form></section>
      <DemoNote />
    </div></div>
  </FlowShell>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  return <span className="af-badge af-status-badge"><span aria-hidden="true" /> Demo · {status.replaceAll("_", " ")}</span>;
}

function ReceiptItems({ items }: { items: OrderItem[] }) {
  return <ul className="af-item-list">{items.map((item, index) => <li className="af-line-item" key={`${item.variant_id}-${index}`}><ProductThumb src={item.image} name={item.name} /><div className="af-line-copy"><strong>{item.name}</strong><span className="muted">{item.variant_name}</span><span className="muted">Qty {item.quantity} · {money(item.price_at_purchase)} each</span></div><strong className="af-line-price">{money(item.price_at_purchase * item.quantity)}</strong></li>)}</ul>;
}

export function OrdersFlow() {
  const { user, ready } = useSession();
  const orders = useRemote<{ orders: Order[] }>(ready && user ? "/api/orders" : null, user?.id);
  if (!ready) return <FlowLoading label="Getting your orders ready…" />;
  if (!user) return <AccountGate next="/orders" title="Good finds, fond memories." />;
  return <FlowShell><header className="af-page-header"><div><p className="eyebrow">YOUR EVERYDAY</p><h1 className="page-heading">Your good finds.</h1><p className="muted">Every demo order, thoughtfully kept in one place.</p></div><Link href="/shop" className="button secondary">Keep exploring <ArrowRight size={17} aria-hidden="true" /></Link></header><div className="af-account-layout"><AccountNav active="orders" /><div className="af-stack">
    {orders.loading ? <div className="panel af-inline-loading" role="status"><LoaderCircle className="af-spin" size={21} aria-hidden="true" /> Loading your orders…</div> : orders.error ? <div className="panel af-section"><h2>We couldn’t load your orders.</h2><ErrorNotice message={orders.error} retry={orders.retry} /></div> : !orders.data?.orders.length ? <div className="panel empty-state af-orders-empty"><span className="af-icon-tile"><Package size={30} aria-hidden="true" /></span><h2>Your first good find is out there.</h2><p className="muted">No orders yet. Once you place a demo order while signed in, you’ll find it here.</p><Link className="button" href="/shop">Find something you love <ArrowRight size={17} aria-hidden="true" /></Link></div> : orders.data.orders.map(order => <article className="panel af-order-card" key={order.id}><div className="af-order-card-top"><div><p className="eyebrow">ORDER #{order.id.slice(0, 8).toUpperCase()}</p><p className="muted">Placed {formatDate(order.created_at)}</p></div><StatusBadge status={order.status} /></div><ReceiptItems items={order.items} /><div className="af-order-card-bottom"><p><span className="muted">Order total</span><strong className="price">{money(order.total_amount)}</strong></p><Link className="button secondary" href={`/orders/${encodeURIComponent(order.id)}`}>View order <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}
    <DemoNote />
  </div></div></FlowShell>;
}

export function OrderDetailFlow({ id }: { id: string }) {
  const { user, ready } = useSession();
  const receipt = useRemote<{ order: Order }>(ready ? `/api/orders/${encodeURIComponent(id)}` : null, user?.id ?? "guest");
  if (!ready || receipt.loading) return <FlowLoading label="Finding your demo receipt…" />;
  if (receipt.error || !receipt.data?.order) return <FlowShell><div className="panel af-receipt-error"><span className="af-icon-tile"><Package size={28} aria-hidden="true" /></span><h1 className="page-heading">Let’s find that order.</h1><ErrorNotice message={receipt.error || "This receipt is unavailable."} retry={receipt.retry} /><p className="muted">Guest receipts are available in the browser used at checkout. If you ordered with an account, sign in to view it.</p><div className="af-actions">{!user && <Link className="button" href={`/sign-in?next=${encodeURIComponent(`/orders/${id}`)}`}>Sign in <ArrowRight size={16} aria-hidden="true" /></Link>}<Link className="button secondary" href={user ? "/orders" : "/shop"}>{user ? "Your orders" : "Continue shopping"}</Link></div></div></FlowShell>;
  const order = receipt.data.order;
  return <FlowShell><Link href={user ? "/orders" : "/shop"} className="af-back-link"><ArrowLeft size={16} aria-hidden="true" />{user ? "All your orders" : "Back to the collection"}</Link>
    <header className="af-receipt-hero"><span className="af-confirmation-mark"><Check size={31} strokeWidth={1.6} aria-hidden="true" /></span><p className="eyebrow">A LITTLE MOMENT OF GOOD</p><h1 className="page-heading">Your demo order is in.</h1><p className="muted">Thanks for making Everyday part of your day.</p><p className="af-receipt-number">Order #{order.id.slice(0, 8).toUpperCase()} <span aria-hidden="true">·</span> {formatDate(order.created_at)}</p><StatusBadge status={order.status} /><p className="af-receipt-disclaimer">This is a simulated order. No payment was taken and nothing will be shipped.</p></header>
    <div className="af-receipt-grid"><section className="panel af-section" aria-labelledby="receipt-items-heading"><div className="af-summary-heading"><h2 id="receipt-items-heading">A few very good choices.</h2><Package size={22} aria-hidden="true" /></div><ReceiptItems items={order.items} /><CostBreakdown subtotal={order.subtotal} shipping={order.shipping_cost} tax={order.tax} total={order.total_amount} /></section><div className="af-stack"><section className="panel af-section" aria-labelledby="receipt-shipping-heading"><div className="af-section-heading"><MapPin size={21} aria-hidden="true" /><h2 id="receipt-shipping-heading">Shipping details</h2></div><AddressBlock address={order.shipping_address} /><div className="af-receipt-shipping"><Truck size={18} aria-hidden="true" /><p>Standard shipping · simulated only<br /><span className="muted">No delivery is scheduled.</span></p></div></section><section className="panel af-section" aria-labelledby="receipt-payment-heading"><div className="af-section-heading"><CreditCard size={21} aria-hidden="true" /><h2 id="receipt-payment-heading">Payment</h2></div><p className="af-payment-label">{order.payment_method === "demo" ? "Simulated payment" : `Demo payment (${order.payment_method})`}</p><p className="muted">No card was used. No charge was made.</p></section>{!user && <div className="af-guest-receipt"><LockKeyhole size={20} aria-hidden="true" /><p>Keep this receipt link and use the same browser to return to it. Guest access is protected by your checkout cookie.</p></div>}<Link className="button af-full-button" href="/shop">Find your next everyday favorite <ArrowRight size={17} aria-hidden="true" /></Link></div></div>
    <p className="af-full-order-id muted">Receipt reference: {order.id}</p><DemoNote />
  </FlowShell>;
}
