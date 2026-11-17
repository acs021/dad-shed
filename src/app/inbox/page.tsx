import { safePath } from "@/lib/text";
import { privatePage } from "@/server/chrome";
import { inboxFor } from "@/server/queries";

export default function InboxPage() {
  return privatePage(async (ctx) => {
    const notes = await inboxFor(ctx.actor);
    return (
      <div className="stack">
        <h1>Notes</h1>
        {notes.length === 0 ? <p className="muted">Nothing yet.</p> : null}
        {notes.map((note) => (
          <a className="card" key={note.id} href={safePath(note.href)}>
            <strong>{note.title}</strong>
            {note.body ? <p className="muted">{note.body}</p> : null}
          </a>
        ))}
      </div>
    );
  });
}
