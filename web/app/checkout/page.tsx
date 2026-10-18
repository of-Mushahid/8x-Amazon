import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/shop/account-flows";

export const metadata: Metadata = {
  title: "Checkout | Everyday",
  description: "Sign in to place your Everyday order. Fast, secure checkout.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
