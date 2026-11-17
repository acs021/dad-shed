import { CATEGORIES, CONDITIONS } from "@/lib/constants";
import { PhotoField } from "@/components/photo-field";
import { LookupButtons } from "@/components/lookup";
import { ShedForm, Submit } from "@/components/forms";
import type { ActionState } from "@/lib/action-state";

export function MemberFields({
  values,
  email = true,
}: {
  values?: {
    name?: string;
    household?: string;
    email?: string;
    phone?: string;
    addressLine?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    pickupNotes?: string;
    bio?: string;
  };
  email?: boolean;
}) {
  const value = values ?? {};
  return (
    <>
      <label>
        Name
        <input name="name" required maxLength={80} defaultValue={value.name ?? ""} autoComplete="name" />
      </label>
      <label>
        Household
        <input name="household" maxLength={80} defaultValue={value.household ?? ""} placeholder="The Okonkwos" />
      </label>
      {email ? (
        <label>
          Email
          <input name="email" type="email" required maxLength={200} defaultValue={value.email ?? ""} autoComplete="email" />
        </label>
      ) : null}
      <label>
        Phone
        <input name="phone" required maxLength={40} defaultValue={value.phone ?? ""} autoComplete="tel" />
      </label>
      <label>
        Street address
        <input name="address_line" required maxLength={120} defaultValue={value.addressLine ?? ""} autoComplete="street-address" />
      </label>
      <div className="split">
        <label>
          City
          <input name="city" required maxLength={80} defaultValue={value.city ?? ""} autoComplete="address-level2" />
        </label>
        <label>
          State
          <input name="region" required maxLength={40} defaultValue={value.region ?? ""} autoComplete="address-level1" />
        </label>
        <label>
          Postal code
          <input name="postal_code" required maxLength={20} defaultValue={value.postalCode ?? ""} autoComplete="postal-code" />
        </label>
      </div>
      <label>
        Pickup notes
        <textarea
          name="pickup_notes"
          maxLength={500}
          defaultValue={value.pickupNotes ?? ""}
          placeholder="Gate code, which door, when not to ring."
        />
        <span className="hint">Hidden until you approve a borrow. Admins can see them.</span>
      </label>
      <label>
        About you
        <textarea name="bio" maxLength={400} defaultValue={value.bio ?? ""} />
      </label>
    </>
  );
}

export function ItemForm({
  action,
  item,
  links = [],
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  item?: {
    id: string;
    title: string;
    description: string;
    category: string;
    condition: string;
    quantity: number;
    listing: string;
    maxDays: number;
    needsApproval: boolean;
    consumable: boolean;
    safetyNotes: string;
    replacementNote: string;
    photo: string;
  };
  links?: { label: string; url: string }[];
}) {
  return (
    <ShedForm action={action}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <label>
        Name
        <input name="title" required maxLength={120} defaultValue={item?.title ?? ""} placeholder="Pressure washer" />
      </label>
      <LookupButtons />
      <fieldset>
        <legend>Category</legend>
        <div className="choices">
          {CATEGORIES.map((category) => (
            <label key={category.id} className="choice">
              <input
                type="radio"
                name="category"
                value={category.id}
                required
                defaultChecked={item ? item.category === category.id : category.id === "tools"}
              />
              {category.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="split">
        <label>
          Condition
          <select name="condition" defaultValue={item?.condition ?? "good"}>
            {CONDITIONS.map((condition) => (
              <option key={condition.id} value={condition.id}>
                {condition.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          How many
          <input name="quantity" type="number" min={1} max={100} defaultValue={item?.quantity ?? 1} />
        </label>
        <label>
          Max days
          <input name="max_days" type="number" min={1} max={90} defaultValue={item?.maxDays ?? 7} />
        </label>
      </div>
      {item ? (
        <label>
          On the wall
          <select name="listing" defaultValue={item.listing}>
            <option value="available">On the wall</option>
            <option value="maintenance">In the shop</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      ) : null}
      <PhotoField initial={item?.photo} />
      <label>
        Description
        <textarea name="description" maxLength={2000} defaultValue={item?.description ?? ""} />
      </label>
      <label>
        Safety notes
        <textarea name="safety_notes" maxLength={500} defaultValue={item?.safetyNotes ?? ""} />
      </label>
      <label>
        If it breaks
        <textarea
          name="replacement_note"
          maxLength={300}
          defaultValue={item?.replacementNote ?? ""}
          placeholder="Repair it, or replace the blade."
        />
      </label>
      <label className="check">
        <input type="checkbox" name="needs_approval" defaultChecked={item ? item.needsApproval : true} />
        I want to approve each borrow
      </label>
      <label className="check">
        <input type="checkbox" name="consumable" defaultChecked={item?.consumable ?? false} />
        Borrower replaces what they use
      </label>
      <fieldset>
        <legend>Links worth keeping</legend>
        {[0, 1, 2].map((index) => (
          <div className="split" key={index}>
            <label>
              Label
              <input name={`link_label_${index}`} maxLength={80} defaultValue={links[index]?.label ?? ""} />
            </label>
            <label>
              URL
              <input name={`link_url_${index}`} type="url" maxLength={500} defaultValue={links[index]?.url ?? ""} placeholder="https://" />
            </label>
          </div>
        ))}
      </fieldset>
      <Submit>{item ? "Save changes" : "Put it on the wall"}</Submit>
    </ShedForm>
  );
}
