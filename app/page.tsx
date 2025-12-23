import { getAllEntryDates } from "@/lib/entries";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const allDates = getAllEntryDates();

  // Redirect to the first entry
  if (allDates.length > 0) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    redirect(`${basePath}/${allDates[0]}`);
  }

  // Fallback if no entries exist
  return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-gray-500">No journal entries found.</p>
    </div>
  );
}
