import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

async function SignedInAs() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <p>Signed in as {data.claims.email}</p>;
}

export default function ProtectedPage() {
  return (
    <Suspense>
      <SignedInAs />
    </Suspense>
  );
}
