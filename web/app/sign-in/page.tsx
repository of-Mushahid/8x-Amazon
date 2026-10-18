import type { Metadata } from "next";
import { Suspense } from "react";
import { FlowLoading, SignInFlow } from "@/components/shop/account-flows";

export const metadata: Metadata = {
  title: "Sign in | Everyday",
  description: "Sign in or create your Everyday account.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <Suspense fallback={<FlowLoading label="Getting your Everyday ready…" />}><SignInFlow /></Suspense>;
}
