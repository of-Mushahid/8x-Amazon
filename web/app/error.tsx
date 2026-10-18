"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="container empty-state page-space"><h1>A small pause in your everyday.</h1><p>Something went wrong loading this page. Please try again.</p><button className="button" onClick={reset}>Try again</button></div>; }
