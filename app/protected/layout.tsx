import { SiteHeader } from "@/components/site-header";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <SiteHeader />
      <div className="flex-1 w-full max-w-5xl p-5">{children}</div>
    </main>
  );
}
