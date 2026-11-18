import { ItemForm } from "@/components/fields";
import { createItemAction } from "@/server/actions";
import { privatePage } from "@/server/chrome";

export default function NewItemPage() {
  return privatePage(async () => (
    <div className="stack">
      <div>
        <p className="eyebrow">Hang it</p>
        <h1>Put it on the wall</h1>
        <p className="lede">A name and a category is enough. Add a photo and a couple of links if someone should read up first.</p>
      </div>
      <ItemForm action={createItemAction} />
    </div>
  ));
}
