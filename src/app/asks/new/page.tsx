import { CATEGORIES } from "@/lib/constants";
import { ShedForm, Submit } from "@/components/forms";
import { createAskAction } from "@/server/actions";
import { privatePage } from "@/server/chrome";

export default async function NewAskPage({ searchParams }: { searchParams: Promise<{ title?: string }> }) {
  const params = await searchParams;
  return privatePage(async () => (
    <div className="stack">
      <div>
        <p className="eyebrow">Not on the wall</p>
        <h1>Ask the block</h1>
      </div>
      <ShedForm action={createAskAction}>
        <label>
          What you need
          <input name="title" required maxLength={120} defaultValue={params.title ?? ""} />
        </label>
        <label>
          Category
          <select name="category" defaultValue="">
            <option value="">Any</option>
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Details
          <textarea name="details" maxLength={1000} placeholder="When you need it, and what kind." />
        </label>
        <Submit>Post to the shed</Submit>
      </ShedForm>
    </div>
  ));
}
