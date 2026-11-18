"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="public">
      <main>
        <h1>Something slipped.</h1>
        <p>Try that again.</p>
        <button className="button" onClick={() => reset()}>
          Retry
        </button>
      </main>
    </div>
  );
}
