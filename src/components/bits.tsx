import { ACTION_LABEL, type BorrowAction } from "@/lib/present";
import { ShedForm, Submit } from "@/components/forms";
import { borrowAction } from "@/server/actions";

export function BorrowActions({
  id,
  actions,
  next,
}: {
  id: string;
  actions: BorrowAction[];
  next: string;
}) {
  if (actions.length === 0) return null;
  const withNote = actions.some((action) => action === "checkout" || action === "checkin" || action === "confirm");
  return (
    <ShedForm action={borrowAction} className="stack tight">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={next} />
      {withNote ? <input name="note" maxLength={500} placeholder="Condition, or a short note" /> : null}
      <div className="actions">
        {actions.map((action) => (
          <Submit
            key={action}
            name="decision"
            value={action}
            variant={action === "decline" || action === "cancel" ? "danger" : "primary"}
          >
            {ACTION_LABEL[action]}
          </Submit>
        ))}
      </div>
    </ShedForm>
  );
}

export function Status({ label, tone }: { label: string; tone: "good" | "warn" | "muted" }) {
  return <span className={`pill ${tone}`}>{label}</span>;
}
