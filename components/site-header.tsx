import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "./auth-button";

export function SiteHeader() {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <Link href="/" className="font-semibold">
          Home
        </Link>
        <Suspense>
          <AuthButton />
        </Suspense>
      </div>
    </nav>
  );
}
