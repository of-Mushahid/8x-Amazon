import type { Metadata } from "next";
import { HelpFlow } from "@/components/shop/help-flow";

export const metadata: Metadata = { title: "Customer Service | Everyday", description: "Get help with your orders, shipping, returns, payments and account." };

export default function HelpPage() {
  return <HelpFlow />;
}
