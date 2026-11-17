"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";

export function ShedForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className ?? "stack"}>
      {children}
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? <p className="banner good">Saved.</p> : null}
    </form>
  );
}

export function Submit({
  children,
  variant = "primary",
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: "primary" | "quiet" | "danger" | "brass";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={`button ${variant}`} name={name} value={value} disabled={pending}>
      {pending ? "Working…" : children}
    </button>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="button quiet"
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => setDone(true));
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}
