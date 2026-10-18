import type { Metadata } from "next";
import { OrdersFlow } from "@/components/shop/account-flows";

export const metadata: Metadata = {
  title: "Your orders | Everyday",
  description: "View your simulated Everyday orders and receipts.",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersFlow />;
}
