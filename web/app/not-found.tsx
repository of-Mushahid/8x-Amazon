import Link from "next/link";
import { SearchX } from "lucide-react";
export default function NotFound() { return <div className="container empty-state page-space"><SearchX size={44} /><h1>This find has wandered off.</h1><p>We couldn’t find that page. There’s still plenty of good stuff to explore.</p><Link className="button" href="/shop">Back to the collection</Link></div>; }
