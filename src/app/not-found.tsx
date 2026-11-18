import { PublicFrame } from "@/components/shell";

export default function NotFound() {
  return (
    <PublicFrame>
      <div className="stack">
        <h1>That isn't on the wall.</h1>
        <p>
          <a href="/">Back to the shed</a>
        </p>
      </div>
    </PublicFrame>
  );
}
