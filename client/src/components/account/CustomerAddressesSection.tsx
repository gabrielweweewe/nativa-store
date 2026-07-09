import AddressForm, {
  emptyAddressFormValues,
  type AddressFormValues,
} from "@/components/address/AddressForm";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AddressApiError,
  createCustomerAddress,
  deleteCustomerAddress,
  fetchCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "@/lib/addressApi";
import { customerAddressSchema } from "@shared/schemas/address";
import type { CustomerAddress } from "@shared/types/address";
import { formatAddressLine, formatCepDisplay } from "@shared/types/address";
import { formatCepInput } from "@shared/lib/viacep";
import { Home, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function addressToFormValues(address: CustomerAddress): AddressFormValues {
  return {
    label: address.label,
    cep: formatCepInput(address.cep),
    rua: address.rua,
    numero: address.numero,
    complemento: address.complemento ?? "",
    bairro: address.bairro,
    cidade: address.cidade,
    estado: address.estado,
    isDefault: address.isDefault,
  };
}

interface CustomerAddressesSectionProps {
  token: string;
}

export default function CustomerAddressesSection({ token }: CustomerAddressesSectionProps) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<AddressFormValues>(emptyAddressFormValues());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function loadAddresses() {
    setLoading(true);
    try {
      const data = await fetchCustomerAddresses(token);
      setAddresses(data);
    } catch {
      toast.error("Erro ao carregar endereços");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
  }, [token]);

  function openCreateForm() {
    setEditingId(null);
    setFormValues(emptyAddressFormValues());
    setFieldErrors({});
    setShowForm(true);
  }

  function openEditForm(address: CustomerAddress) {
    setEditingId(address.id);
    setFormValues(addressToFormValues(address));
    setFieldErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFieldErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload = {
      label: formValues.label ?? "Casa",
      cep: formValues.cep.replace(/\D/g, ""),
      rua: formValues.rua,
      numero: formValues.numero,
      complemento: formValues.complemento || undefined,
      bairro: formValues.bairro,
      cidade: formValues.cidade,
      estado: formValues.estado,
      isDefault: formValues.isDefault ?? false,
    };

    const parsed = customerAddressSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await updateCustomerAddress(token, editingId, parsed.data);
        toast.success("Endereço atualizado");
      } else {
        await createCustomerAddress(token, parsed.data);
        toast.success("Endereço salvo");
      }
      closeForm();
      await loadAddresses();
    } catch (error) {
      toast.error(error instanceof AddressApiError ? error.message : "Erro ao salvar endereço");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!confirm("Deseja excluir este endereço?")) return;

    try {
      await deleteCustomerAddress(token, addressId);
      toast.success("Endereço excluído");
      if (editingId === addressId) closeForm();
      await loadAddresses();
    } catch (error) {
      toast.error(error instanceof AddressApiError ? error.message : "Erro ao excluir endereço");
    }
  }

  async function handleSetDefault(addressId: string) {
    try {
      await setDefaultCustomerAddress(token, addressId);
      toast.success("Endereço padrão atualizado");
      await loadAddresses();
    } catch (error) {
      toast.error(error instanceof AddressApiError ? error.message : "Erro ao definir padrão");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-7 text-[#C4522A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Gerencie seus endereços de entrega. A busca por CEP é feita automaticamente via ViaCEP.
        </p>
        {!showForm && (
          <Button
            type="button"
            onClick={openCreateForm}
            className="nativa-btn-primary shrink-0 rounded-xl"
          >
            <Plus className="mr-2 size-4" />
            Novo endereço
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#E8D5C4] bg-[#FFFCF8] p-5 md:p-6"
        >
          <h3
            className="mb-4 text-lg font-semibold text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {editingId ? "Editar endereço" : "Adicionar endereço"}
          </h3>

          <AddressForm
            values={formValues}
            onChange={setFormValues}
            errors={fieldErrors}
            showLabel
            showDefaultToggle
            disabled={saving}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={saving} className="nativa-btn-primary rounded-xl">
              {saving ? <Spinner className="size-4" /> : editingId ? "Salvar alterações" : "Salvar endereço"}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm} className="rounded-xl">
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-[#E8D5C4] bg-gradient-to-br from-[#FFFCF8] to-[#F5F0E8] px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#C4522A]/10">
            <MapPin className="size-7 text-[#C4522A]" />
          </div>
          <h3
            className="text-lg font-bold text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Nenhum endereço salvo
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Cadastre seu endereço para agilizar o checkout nas próximas compras.
          </p>
          <Button type="button" onClick={openCreateForm} className="nativa-btn-primary mt-6 rounded-xl">
            <Plus className="mr-2 size-4" />
            Cadastrar endereço
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <article
              key={address.id}
              className={`relative rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
                address.isDefault ? "border-[#C4522A]/40 ring-1 ring-[#C4522A]/10" : "border-[#E8D5C4]"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#C4522A]/10">
                    <Home className="size-4 text-[#C4522A]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {address.label}
                    </h4>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#C4522A]">
                        <Star className="size-3 fill-current" />
                        Padrão
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {formatAddressLine(address)}
              </p>
              <p className="mt-1 text-xs text-[#8B6F5E]">CEP {formatCepDisplay(address.cep)}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEditForm(address)}
                  className="rounded-lg border-[#E8D5C4] text-[#3D2B1F]"
                >
                  <Pencil className="mr-1.5 size-3.5" />
                  Editar
                </Button>
                {!address.isDefault && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetDefault(address.id)}
                    className="rounded-lg border-[#C4522A]/30 text-[#C4522A]"
                  >
                    <Star className="mr-1.5 size-3.5" />
                    Tornar padrão
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(address.id)}
                  className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
