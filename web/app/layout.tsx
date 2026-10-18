import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Providers } from "@/components/shop/providers";
import { Header } from "@/components/shop/header";
import { Footer } from "@/components/shop/footer";
import { CartDrawer } from "@/components/shop/cart";
import "./globals.css";

const font = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Everyday | Good things for your everyday",
  description: "Thoughtful finds, transparent prices and a calmer way to shop. An independent shopping demo inspired by Amazon.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={font.variable}><body><a className="skip-link" href="#main">Skip to content</a><Providers><Header /><main id="main">{children}</main><Footer /><CartDrawer /></Providers></body></html>;
}
