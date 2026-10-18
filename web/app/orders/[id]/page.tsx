import type { Metadata } from "next";
import { OrderDetailFlow } from "@/components/shop/account-flows";

export const metadata: Metadata = {
  title: "Your demo receipt | Everyday",
  description: "Your Everyday demo order receipt. No payment was taken and no shipment is scheduled.",
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailFlow id={id} />;
}
