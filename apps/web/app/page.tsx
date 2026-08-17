import { Header } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { CashGapTimeline } from "@/components/marketing/cash-gap-timeline";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Evidence } from "@/components/marketing/evidence";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <CashGapTimeline />
        <HowItWorks />
        <Evidence />
      </main>
    </>
  );
}
