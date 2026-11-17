import { logoutAction } from "@/server/actions";
import { SideNav } from "@/components/nav";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/inventory", label: "Wall" },
  { href: "/borrows", label: "Loans" },
  { href: "/asks", label: "Asks" },
  { href: "/members", label: "Block" },
  { href: "/account", label: "You" },
];

export function Shell({
  frame,
  children,
}: {
  frame: {
    groupName: string;
    memberName: string;
    role: "admin" | "member";
    unread: number;
    pending: number;
    demo: boolean;
  };
  children: React.ReactNode;
}) {
  const side = frame.role === "admin" ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;
  const tabs = LINKS.filter((link) => link.href !== "/");
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/">
          <Mark />
          <span>
            <strong>Dad Shed</strong>
            <small>{frame.groupName}</small>
          </span>
        </a>
        <div className="top-actions">
          {frame.role === "admin" ? (
            <a className="text-link" href="/admin">
              Admin{frame.pending ? ` · ${frame.pending}` : ""}
            </a>
          ) : null}
          <a className="bell" href="/inbox" aria-label={frame.unread ? `${frame.unread} unread notes` : "Notes"}>
            Notes
            {frame.unread ? <span>{frame.unread}</span> : null}
          </a>
          <form action={logoutAction}>
            <button className="button quiet desktop-only">Sign out</button>
          </form>
        </div>
      </header>
      {frame.demo ? (
        <p className="demo-ribbon">Sample block. People, addresses, and the password are made up.</p>
      ) : null}
      <div className="frame">
        <aside className="sidebar">
          <SideNav links={side} variant="side" />
        </aside>
        <main id="content">{children}</main>
      </div>
      <SideNav links={tabs} variant="tab" />
    </div>
  );
}

export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="28" height="28">
        <path d="M5 14 L16 6 L27 14 V26 H5 Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M13 26 V18 H19 V26" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    </span>
  );
}

export function PublicFrame({
  children,
  demo,
}: {
  children: React.ReactNode;
  demo?: boolean;
}) {
  return (
    <div className="public">
      <header className="topbar">
        <a className="brand" href="/">
          <Mark />
          <span>
            <strong>Dad Shed</strong>
          </span>
        </a>
        <div className="top-actions">
          <a className="text-link" href="/login">
            Sign in
          </a>
          <a className="button" href="/join">
            Join
          </a>
        </div>
      </header>
      {demo ? <p className="demo-ribbon">Sample block, so you can click around before inviting anyone.</p> : null}
      <main id="content">{children}</main>
    </div>
  );
}
