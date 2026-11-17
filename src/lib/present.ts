export const HOLDING_STATUSES = ["approved", "checked_out", "return_pending"] as const;
export const OPEN_STATUSES = ["requested", "approved", "checked_out", "return_pending"] as const;
export const ADDRESS_STATUSES = ["approved", "checked_out", "return_pending"] as const;

export type Viewer = { id: string; role: "admin" | "member" };
export type BorrowSlice = { borrowerId: string; status: string };

export function holdsSlot(status: string) {
  return (HOLDING_STATUSES as readonly string[]).includes(status);
}

export function isOverdue(status: string, dueOn: string, today: string) {
  return (status === "checked_out" || status === "return_pending") && dueOn < today;
}

export function canSeePickup(viewer: Viewer, ownerId: string, borrows: BorrowSlice[]) {
  if (viewer.id === ownerId || viewer.role === "admin") return true;
  return borrows.some(
    (borrow) =>
      borrow.borrowerId === viewer.id &&
      (ADDRESS_STATUSES as readonly string[]).includes(borrow.status),
  );
}

export function canSeeBorrowerContact(
  viewer: Viewer,
  borrow: { borrowerId: string; ownerId: string; status: string },
) {
  if (viewer.id === borrow.borrowerId || viewer.role === "admin") return true;
  return (
    viewer.id === borrow.ownerId &&
    (OPEN_STATUSES as readonly string[]).includes(borrow.status)
  );
}

export type BorrowAction = "approve" | "decline" | "cancel" | "checkout" | "checkin" | "confirm";

export function actionsFor(
  viewer: Viewer,
  borrow: { status: string; borrowerId: string; ownerId: string },
): BorrowAction[] {
  const owner = viewer.id === borrow.ownerId || viewer.role === "admin";
  const borrower = viewer.id === borrow.borrowerId;
  const actions: BorrowAction[] = [];
  if (borrow.status === "requested") {
    if (owner) actions.push("approve", "decline");
    if (borrower) actions.push("cancel");
  } else if (borrow.status === "approved") {
    if (owner || borrower) actions.push("checkout", "cancel");
  } else if (borrow.status === "checked_out") {
    if (borrower) actions.push("checkin");
    if (owner && viewer.id !== borrow.borrowerId) actions.push("confirm");
  } else if (borrow.status === "return_pending") {
    if (owner) actions.push("confirm");
  }
  return actions;
}

export function borrowStatusLabel(status: string, overdue: boolean) {
  if (overdue && status === "checked_out") return "Overdue";
  if (overdue && status === "return_pending") return "Returned late, needs a look";
  switch (status) {
    case "requested":
      return "Waiting on the owner";
    case "approved":
      return "Approved, not picked up";
    case "checked_out":
      return "Checked out";
    case "return_pending":
      return "Back, waiting on the owner";
    case "returned":
      return "Returned";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export const ACTION_LABEL: Record<BorrowAction, string> = {
  approve: "Approve",
  decline: "Decline",
  cancel: "Cancel",
  checkout: "Mark picked up",
  checkin: "I brought it back",
  confirm: "It's back",
};

export function availabilityLabel(input: {
  listing: string;
  quantity: number;
  holds: { status: string; dueOn: string; borrowerName: string }[];
  today: string;
}) {
  if (input.listing === "hidden") return { label: "Hidden", tone: "muted" as const };
  if (input.listing === "maintenance") return { label: "In the shop", tone: "muted" as const };
  const holding = input.holds.filter((hold) => holdsSlot(hold.status));
  const free = input.quantity - holding.length;
  if (holding.length === 0) return { label: "On the wall", tone: "good" as const };
  const overdue = holding.find((hold) => isOverdue(hold.status, hold.dueOn, input.today));
  if (free <= 0 && overdue) {
    return { label: `Overdue with ${overdue.borrowerName}`, tone: "warn" as const };
  }
  if (free <= 0 && holding.length === 1) {
    const hold = holding[0];
    const verb = hold.status === "approved" ? "Reserved for" : "With";
    return { label: `${verb} ${hold.borrowerName}`, tone: "warn" as const };
  }
  if (free <= 0) return { label: "All out", tone: "warn" as const };
  return { label: `${holding.length} of ${input.quantity} out`, tone: "warn" as const };
}
