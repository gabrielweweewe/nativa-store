import {
  mapCustomerAddressRowToCustomerAddress,
  mapCustomerAddressToRow,
  type CustomerAddressRow,
} from "@shared/lib/addressMapper";
import type { CustomerAddressInput, CustomerAddressUpdateInput } from "@shared/schemas/address";
import type { CustomerAddress } from "@shared/types/address";
import { supabase } from "../lib/supabase";

async function clearDefaultAddress(customerId: string, exceptId?: string) {
  let query = supabase
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("customer_id", customerId)
    .eq("is_default", true);

  if (exceptId) {
    query = query.neq("id", exceptId);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function listCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCustomerAddressRowToCustomerAddress(row as CustomerAddressRow));
}

export async function createCustomerAddress(
  customerId: string,
  input: CustomerAddressInput,
): Promise<CustomerAddress> {
  if (input.isDefault) {
    await clearDefaultAddress(customerId);
  }

  const { data: existing } = await supabase
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", customerId)
    .limit(1);

  const shouldBeDefault = input.isDefault || !(existing?.length);

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert(mapCustomerAddressToRow(customerId, { ...input, isDefault: shouldBeDefault }))
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCustomerAddressRowToCustomerAddress(data as CustomerAddressRow);
}

export async function updateCustomerAddress(
  customerId: string,
  addressId: string,
  input: CustomerAddressUpdateInput,
): Promise<CustomerAddress> {
  const { data: current, error: fetchError } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!current) throw new Error("Endereço não encontrado");

  if (input.isDefault) {
    await clearDefaultAddress(customerId, addressId);
  }

  const payload: Record<string, unknown> = {};
  if (input.label !== undefined) payload.label = input.label;
  if (input.cep !== undefined) payload.cep = input.cep;
  if (input.rua !== undefined) payload.rua = input.rua;
  if (input.numero !== undefined) payload.numero = input.numero;
  if (input.complemento !== undefined) payload.complemento = input.complemento ?? null;
  if (input.bairro !== undefined) payload.bairro = input.bairro;
  if (input.cidade !== undefined) payload.cidade = input.cidade;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.isDefault !== undefined) payload.is_default = input.isDefault;

  const { data, error } = await supabase
    .from("customer_addresses")
    .update(payload)
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCustomerAddressRowToCustomerAddress(data as CustomerAddressRow);
}

export async function deleteCustomerAddress(customerId: string, addressId: string): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!current) throw new Error("Endereço não encontrado");

  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", customerId);

  if (error) throw new Error(error.message);

  if (current.is_default) {
    const { data: nextDefault } = await supabase
      .from("customer_addresses")
      .select("id")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nextDefault?.id) {
      await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", nextDefault.id);
    }
  }
}

export async function setDefaultCustomerAddress(
  customerId: string,
  addressId: string,
): Promise<CustomerAddress> {
  return updateCustomerAddress(customerId, addressId, { isDefault: true });
}
