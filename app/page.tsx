import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <SiteHeader />
      <div className="flex-1 w-full max-w-5xl p-5">
        <h1 className="font-bold text-2xl">Home</h1>
      </div>
    </main>
  );
}
