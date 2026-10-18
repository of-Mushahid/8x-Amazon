import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/shop/account-flows";

export const metadata: Metadata = {
  title: "Checkout | Everyday",
  description: "Guest-friendly checkout for the independent Everyday shopping demo. No real payments or shipments.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
