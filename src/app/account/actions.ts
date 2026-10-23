"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DEFAULT_ACCENT, parseHex } from "@/core/color";
import { requireUser } from "@/server/auth";
import type { FormState } from "@/components/ActionForm";

export async function saveAccent(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const hex = parseHex(String(form.get("accent") ?? ""));
  if (!hex) return { error: "That isn't a valid color." };
  // The default is stored as null so it keeps following any future change to the default.
  await db.update(schema.profiles).set({ accentColor: hex === DEFAULT_ACCENT ? null : hex }).where(eq(schema.profiles.id, user.id));
  revalidatePath("/", "layout");
  return { message: "Color saved." };
}
