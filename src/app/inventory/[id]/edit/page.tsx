import { notFound, redirect } from "next/navigation";
import { ItemForm } from "@/components/fields";
import { updateItemAction } from "@/server/actions";
import { privatePage } from "@/server/chrome";
import { ShedError } from "@/server/errors";
import { getEditableItem } from "@/server/queries";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return privatePage(async (ctx) => {
    try {
      const page = await getEditableItem(ctx.actor, id);
      return (
        <div className="stack">
          <h1>Edit {page.item.title}</h1>
          <ItemForm action={updateItemAction} item={page.item} links={page.links} />
        </div>
      );
    } catch (error) {
      if (error instanceof ShedError && error.message.includes("only edit")) redirect(`/inventory/${id}`);
      if (error instanceof ShedError) notFound();
      throw error;
    }
  });
}
