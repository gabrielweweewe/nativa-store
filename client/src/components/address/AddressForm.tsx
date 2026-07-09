import AuthInputField from "@/components/auth/AuthInputField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { formatCepInput, fetchAddressByCep } from "@shared/lib/viacep";
import type { ShippingAddress } from "@shared/types/address";
import { Building2, Hash, Loader2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface AddressFormValues {
  label?: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  isDefault?: boolean;
}

interface AddressFormProps {
  values: AddressFormValues;
  onChange: (values: AddressFormValues) => void;
  errors?: Record<string, string>;
  showLabel?: boolean;
  showDefaultToggle?: boolean;
  disabled?: boolean;
}

export function emptyAddressFormValues(): AddressFormValues {
  return {
    label: "Casa",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    isDefault: false,
  };
}

export function shippingAddressFromForm(values: AddressFormValues): ShippingAddress {
  return {
    cep: values.cep.replace(/\D/g, ""),
    rua: values.rua,
    numero: values.numero,
    complemento: values.complemento || undefined,
    bairro: values.bairro,
    cidade: values.cidade,
    estado: values.estado,
  };
}

export default function AddressForm({
  values,
  onChange,
  errors = {},
  showLabel = true,
  showDefaultToggle = false,
  disabled = false,
}: AddressFormProps) {
  const [cepLoading, setCepLoading] = useState(false);

  function updateField(field: keyof AddressFormValues, value: string | boolean) {
    onChange({ ...values, [field]: value });
  }

  async function handleCepLookup() {
    setCepLoading(true);
    try {
      const result = await fetchAddressByCep(values.cep);
      if (!result) {
        toast.error("CEP não encontrado", { description: "Verifique o número informado." });
        return;
      }

      onChange({
        ...values,
        cep: formatCepInput(values.cep),
        rua: result.rua || values.rua,
        bairro: result.bairro || values.bairro,
        cidade: result.cidade || values.cidade,
        estado: result.estado || values.estado,
        complemento: values.complemento || result.complemento || "",
      });
      toast.success("Endereço encontrado!");
    } catch {
      toast.error("Erro ao buscar CEP", { description: "Tente novamente em instantes." });
    } finally {
      setCepLoading(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showLabel && (
        <div className="sm:col-span-2">
          <AuthInputField
            id="address-label"
            label="Identificação do endereço"
            icon={MapPin}
            value={values.label ?? "Casa"}
            onChange={(e) => updateField("label", e.target.value)}
            placeholder="Ex: Casa, Trabalho"
            disabled={disabled}
            error={errors.label}
          />
        </div>
      )}

      <div className="sm:col-span-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-cep" className="text-[#3D2B1F]">
            CEP
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
              <input
                id="address-cep"
                value={values.cep}
                onChange={(e) => updateField("cep", formatCepInput(e.target.value))}
                onBlur={() => {
                  if (values.cep.replace(/\D/g, "").length === 8) void handleCepLookup();
                }}
                placeholder="00000-000"
                maxLength={9}
                disabled={disabled || cepLoading}
                className="h-11 w-full rounded-xl border border-[#E8D5C4] bg-[#FFFCF8] pl-10 text-sm transition-colors focus-visible:border-[#C4522A]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4522A]/20"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCepLookup}
              disabled={disabled || cepLoading || values.cep.replace(/\D/g, "").length !== 8}
              className="shrink-0 rounded-xl border-[#C4522A]/30 text-[#C4522A] hover:bg-[#C4522A]/5"
            >
              {cepLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              <span className="ml-2 hidden sm:inline">Buscar</span>
            </Button>
          </div>
          {errors.cep && <p className="text-xs text-destructive">{errors.cep}</p>}
        </div>
      </div>

      <AuthInputField
        id="address-numero"
        label="Número"
        icon={Hash}
        value={values.numero}
        onChange={(e) => updateField("numero", e.target.value)}
        placeholder="123"
        disabled={disabled}
        error={errors.numero}
      />

      <AuthInputField
        id="address-estado"
        label="Estado (UF)"
        icon={MapPin}
        value={values.estado}
        onChange={(e) => updateField("estado", e.target.value.toUpperCase().slice(0, 2))}
        placeholder="SP"
        maxLength={2}
        disabled={disabled}
        error={errors.estado}
      />

      <div className="sm:col-span-2">
        <AuthInputField
          id="address-rua"
          label="Rua"
          icon={MapPin}
          value={values.rua}
          onChange={(e) => updateField("rua", e.target.value)}
          placeholder="Nome da rua"
          disabled={disabled || cepLoading}
          error={errors.rua}
        />
      </div>

      <AuthInputField
        id="address-complemento"
        label="Complemento"
        icon={Building2}
        value={values.complemento}
        onChange={(e) => updateField("complemento", e.target.value)}
        placeholder="Apto, bloco (opcional)"
        disabled={disabled}
        error={errors.complemento}
      />

      <AuthInputField
        id="address-bairro"
        label="Bairro"
        icon={MapPin}
        value={values.bairro}
        onChange={(e) => updateField("bairro", e.target.value)}
        placeholder="Bairro"
        disabled={disabled || cepLoading}
        error={errors.bairro}
      />

      <AuthInputField
        id="address-cidade"
        label="Cidade"
        icon={MapPin}
        value={values.cidade}
        onChange={(e) => updateField("cidade", e.target.value)}
        placeholder="Cidade"
        disabled={disabled || cepLoading}
        error={errors.cidade}
      />

      {showDefaultToggle && (
        <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-[#E8D5C4] bg-[#FAF7F2]/60 px-4 py-3">
          <input
            type="checkbox"
            checked={Boolean(values.isDefault)}
            onChange={(e) => updateField("isDefault", e.target.checked)}
            disabled={disabled}
            className="size-4 rounded border-[#C4522A]/40 text-[#C4522A] focus:ring-[#C4522A]/30"
          />
          <span className="text-sm text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Definir como endereço padrão
          </span>
        </label>
      )}

      {cepLoading && (
        <div className="sm:col-span-2 flex items-center gap-2 text-sm text-[#8B6F5E]">
          <Spinner className="size-4 text-[#C4522A]" />
          Buscando endereço via ViaCEP...
        </div>
      )}
    </div>
  );
}
