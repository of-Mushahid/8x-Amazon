import { Suspense } from "react";
import { Catalog } from "@/components/shop/catalog";
import Loading from "../loading";
export const metadata = { title: "The collection | Everyday" };
export default function ShopPage() { return <Suspense fallback={<Loading />}><Catalog /></Suspense>; }
