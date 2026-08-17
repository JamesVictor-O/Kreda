import { formatCurrency, formatDateTime, formatDate } from "@/lib/dashboard/format";
import { ACTIVITY_EVENTS } from "@/lib/dashboard/investor";
import { DECLINED_APPLICATIONS } from "@/lib/dashboard/fixtures";
import type { ActivityEvent, ActivityEventType } from "@/lib/dashboard/types";
import { HashLink } from "@/components/dashboard/hash-link";
import { EmptyState } from "@/components/dashboard/empty-state";

const EVENT_LABELS: Record<ActivityEventType, string> = {
  deposit: "Deposit",
  settlement: "Settlement confirmed",
  redemption: "Redeemed",
};

function EventRow({ event }: { event: ActivityEvent }) {
  return (
    <tr>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        {formatDateTime(event.timestamp)}
      </td>
      <td className="px-4 py-3 text-foreground">{EVENT_LABELS[event.type]}</td>
      <td className="px-4 py-3 font-mono text-foreground">#{event.receivableId}</td>
      <td className="px-4 py-3 text-right font-mono text-foreground">
        {formatCurrency(event.amount)}
      </td>
      <td className="px-4 py-3">
        <HashLink label={EVENT_LABELS[event.type]} hash={event.txHash} />
      </td>
    </tr>
  );
}

function EventCard({ event }: { event: ActivityEvent }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">{EVENT_LABELS[event.type]}</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(event.amount)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="font-mono">#{event.receivableId}</span>
        <span>{formatDateTime(event.timestamp)}</span>
      </div>
      <div className="mt-2">
        <HashLink label={EVENT_LABELS[event.type]} hash={event.txHash} />
      </div>
    </li>
  );
}

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A record of your deposits, settlements, and redemptions.
        </p>
      </div>

      <div className="mt-8">
        {ACTIVITY_EVENTS.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <EmptyState
              title="No activity yet"
              description="Deposits, settlements, and redemptions will appear here as they happen."
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                      Time
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                      Event
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                      Receivable
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-medium text-muted-foreground"
                    >
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ACTIVITY_EVENTS.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {ACTIVITY_EVENTS.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
          </>
        )}
      </div>

      <div id="declines" className="mt-10 scroll-mt-6">
        <h2 className="text-xl font-semibold text-foreground">Declined</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Declines are published too — a receivable that never became a vault is still part of the
          record.
        </p>

        <div className="mt-4 rounded-2xl border border-border bg-surface p-3 sm:p-4">
          {DECLINED_APPLICATIONS.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                title="No declines on record"
                description="Every decision the agent makes is published here, approved or not."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {DECLINED_APPLICATIONS.map((application) => (
                <li key={application.decision.receivableId} className="px-3 py-4 sm:px-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono text-sm text-foreground">
                        #{application.decision.receivableId}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {application.storeName}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(application.declinedAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {application.decision.declineReason}
                  </p>
                  <div className="mt-2">
                    <HashLink
                      label="Decision blob"
                      hash={application.decision.decisionBlobHash}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
