import type { CustomerProfileUpdateInput } from "@shared/schemas/customer";
import { customerProfileUpdateSchema } from "@shared/schemas/customer";
import type { CustomerProfile } from "@shared/types/customer";
import type { User } from "@supabase/supabase-js";
import { Router } from "express";
import { supabase } from "../lib/supabase";
import type { CustomerAuthRequest } from "../middleware/requireCustomer";
import { requireCustomer } from "../middleware/requireCustomer";

const router = Router();

function getMetadataName(user: User): string {
  const metadata = user.user_metadata ?? {};
  return String(metadata.full_name ?? metadata.fullName ?? "").trim();
}

function getMetadataPhone(user: User): string | null {
  const metadata = user.user_metadata ?? {};
  const phone = metadata.phone;
  if (phone == null || phone === "") return null;
  return String(phone);
}

function mapCustomerProfileRowToCustomerProfile(row: any, user: User): CustomerProfile {
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    phone: row.phone == null ? null : String(row.phone),
    email: user.email ?? "",
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function ensureProfileFromMetadata(userId: string, user: User, row: any) {
  const metadataName = getMetadataName(user);
  const metadataPhone = getMetadataPhone(user);
  const currentName = String(row.full_name ?? "").trim();
  const currentPhone = row.phone == null ? null : String(row.phone);

  const needsName = !currentName && metadataName;
  const needsPhone = !currentPhone && metadataPhone;

  if (!needsName && !needsPhone) {
    return row;
  }

  const { data, error } = await supabase
    .from("customer_profiles")
    .update({
      full_name: needsName ? metadataName : currentName,
      phone: needsPhone ? metadataPhone : currentPhone,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return row;
  }

  return data;
}

router.get("/me", requireCustomer, async (req: CustomerAuthRequest, res) => {
  try {
    const userId = req.customerUserId!;
    const user = req.customerUser!;

    const { data, error } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    let profileRow = data;

    if (!profileRow) {
      const metadataName = getMetadataName(user);
      const metadataPhone = getMetadataPhone(user);

      const { data: created, error: insertError } = await supabase
        .from("customer_profiles")
        .insert({
          id: userId,
          full_name: metadataName,
          phone: metadataPhone,
        })
        .select("*")
        .single();

      if (insertError) {
        res.status(500).json({ error: insertError.message });
        return;
      }

      profileRow = created;
    } else {
      profileRow = await ensureProfileFromMetadata(userId, user, profileRow);
    }

    res.json(mapCustomerProfileRowToCustomerProfile(profileRow, user));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Erro ao carregar perfil" });
  }
});

router.put("/me", requireCustomer, async (req: CustomerAuthRequest, res) => {
  try {
    const userId = req.customerUserId!;
    const user = req.customerUser!;
    const parsed = customerProfileUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const input: CustomerProfileUpdateInput = parsed.data;

    const { data, error } = await supabase
      .from("customer_profiles")
      .update({
        full_name: input.fullName,
        phone: input.phone ? input.phone : null,
      })
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: "Perfil não encontrado" });
      return;
    }

    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone ? input.phone : null,
      },
    });

    const { data: refreshedUser } = await supabase.auth.admin.getUserById(userId);

    res.json(mapCustomerProfileRowToCustomerProfile(data, refreshedUser?.user ?? user));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Erro ao atualizar perfil" });
  }
});

export default router;
