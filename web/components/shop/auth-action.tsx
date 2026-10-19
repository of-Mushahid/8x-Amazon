"use client";
import Link from "next/link";
import { useSession } from "./providers";

// Sends guests through sign-in (returning them to the destination) but takes
// already-signed-in users straight to the action — never bounces a signed-in
// shopper back to the sign-in page.
export function AuthAction({ href, label, className = "amz-buy-btn", note }: { href: string; label: string; className?: string; note?: string }) {
  const { user } = useSession();
  const dest = user ? href : `/sign-in?next=${encodeURIComponent(href)}`;
  return <Link href={dest} className={className}>{label}</Link>;
}
