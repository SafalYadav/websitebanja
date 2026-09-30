import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLeadsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  sp.set("tab", "leads");
  for (const [k, v] of Object.entries(params)) {
    if (k !== "tab" && typeof v === "string") {
      sp.set(k, v);
    }
  }
  redirect(`/admin?${sp.toString()}`);
}
