type Severity = "low" | "medium" | "high";
type Urgency = "immediate" | "soon" | "eventually";

export interface ReportItem {
  title?: string;
  description?: string;
  action?: string;
  severity?: Severity;
  priority?: Severity;
  urgency?: Urgency;
  owner?: string;
}

interface ReportSectionProps {
  title: string;
  items: ReportItem[];
  emptyMessage?: string;
}

const severityClasses: Record<Severity, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const urgencyClasses: Record<Urgency, string> = {
  immediate: "bg-red-100 text-red-700",
  soon: "bg-amber-100 text-amber-700",
  eventually: "bg-emerald-100 text-emerald-700",
};

export function ReportSection({
  title,
  items,
  emptyMessage = "None identified.",
}: ReportSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic px-1">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const chipLabel = item.severity ?? item.priority ?? item.urgency ?? null;
            const chipClass = item.severity
              ? severityClasses[item.severity]
              : item.priority
              ? severityClasses[item.priority]
              : item.urgency
              ? urgencyClasses[item.urgency]
              : "";

            return (
              <div
                key={i}
                className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800 leading-snug">
                    {item.title ?? item.action}
                  </p>
                  {chipLabel && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${chipClass}`}
                    >
                      {chipLabel}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    {item.description}
                  </p>
                )}
                {item.owner && (
                  <p className="mt-1.5 text-[10px] text-gray-400">
                    → {item.owner}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
