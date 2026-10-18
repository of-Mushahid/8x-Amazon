import type { Metadata } from "next";
import { OrdersFlow } from "@/components/shop/account-flows";

export const metadata: Metadata = {
  title: "Your orders | Everyday",
  description: "Track, return, or buy things again. View your Everyday orders.",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersFlow />;
}
