import type { Metadata } from "next";
import { OrderDetailFlow } from "@/components/shop/account-flows";

export const metadata: Metadata = {
  title: "Order details | Everyday",
  description: "View your Everyday order confirmation and details.",
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailFlow id={id} />;
}
