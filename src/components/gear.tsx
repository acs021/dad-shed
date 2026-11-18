import { Status } from "@/components/bits";

const TINTS = ["#0d7377", "#1c4067", "#8d3d32", "#24556b", "#5c3d55", "#1a5c62", "#3e4a62", "#6a3a2a"];

export function GearCard({
  href,
  title,
  category,
  ownerName,
  city,
  photo,
  availability,
  note,
  index = 0,
}: {
  href: string;
  title: string;
  category: string;
  ownerName: string;
  city?: string;
  photo?: string;
  availability?: { label: string; tone: "good" | "warn" | "muted" };
  note?: string;
  index?: number;
}) {
  return (
    <a className="gear" href={href}>
      {photo ? (
        <img className="gear-photo" src={photo} alt="" />
      ) : (
        <span className="monogram" style={{ background: TINTS[index % TINTS.length] }}>
          {title.slice(0, 1)}
        </span>
      )}
      <span className="gear-copy">
        <p className="eyebrow">{category}</p>
        <strong>{title}</strong>
        <span className="muted">
          {ownerName}
          {city ? ` · ${city}` : ""}
        </span>
        {availability ? (
          <span className="gear-meta">
            <Status label={availability.label} tone={availability.tone} />
          </span>
        ) : null}
        {note ? <span className="hint">{note}</span> : null}
      </span>
    </a>
  );
}

export function PageHead({
  kicker,
  title,
  lede,
  action,
}: {
  kicker: string;
  title: string;
  lede?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p className="muted">{body}</p>
      {action}
    </div>
  );
}
