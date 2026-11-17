import { ItemForm } from "@/components/fields";
import { createItemAction } from "@/server/actions";
import { privatePage } from "@/server/chrome";

export default function NewItemPage() {
  return privatePage(async () => (
    <div className="stack">
      <div>
        <p className="eyebrow">New</p>
        <h1>Put it on the wall</h1>
        <p className="muted">A name and a category is enough. Add a photo and a couple of links if you have them.</p>
      </div>
      <ItemForm action={createItemAction} />
    </div>
  ));
}
