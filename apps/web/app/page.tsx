import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Kreda</h1>
      <p className="max-w-md text-center text-sm text-gray-500">
        Receivables financing where the underwriting is auditable.
      </p>
      <nav className="flex gap-4">
        <Link href="/seller" className="underline">
          Seller
        </Link>
        <Link href="/investor" className="underline">
          Investor
        </Link>
        <Link href="/evidence" className="underline">
          Evidence
        </Link>
      </nav>
    </main>
  );
}
