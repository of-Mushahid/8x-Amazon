import type { Metadata } from "next";
import { AccountFlow } from "@/components/shop/account-flows";

export const metadata: Metadata = {
  title: "Your account | Everyday",
  description: "Your Everyday account, saved addresses, and order history.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountFlow />;
}
