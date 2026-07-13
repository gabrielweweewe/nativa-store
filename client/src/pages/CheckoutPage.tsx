import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AddressForm, {
  emptyAddressFormValues,
  shippingAddressFromForm,
  type AddressFormValues,
} from "@/components/address/AddressForm";
import CheckoutOrderSummary from "@/components/checkout/CheckoutOrderSummary";
import CheckoutSuccessView from "@/components/checkout/CheckoutSuccessView";
import RequireCustomerAuth from "@/components/RequireCustomerAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { useCart } from "@/contexts/CartContext";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import {
  createCustomerAddress,
  fetchCustomerAddresses,
} from "@/lib/addressApi";
import { fetchCustomerProfile } from "@/lib/customerApi";
import { OrderApiError, checkoutOrder } from "@/lib/orderApi";
import { fetchCustomerOrder, fetchMercadoPagoConfig } from "@/lib/orderApi";
import { checkoutSchema } from "@shared/schemas/order";
import { calculateShippingAmount } from "@shared/const/cart";
import { formatCepInput } from "@shared/lib/viacep";
import type { CustomerProfile } from "@shared/types/customer";
import type { CustomerAddress } from "@shared/types/address";
import {
  customerAddressToShippingAddress,
  formatAddressLine,
} from "@shared/types/address";
import type { Order, PaymentMethod } from "@shared/types/order";
import type {
  CardPaymentData,
  MercadoPagoPublicConfig,
} from "@shared/types/mercadoPago";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Barcode,
  CreditCard,
  Mail,
  Phone,
  Plus,
  QrCode,
  Star,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

function addressToFormValues(address: CustomerAddress): AddressFormValues {
  return {
    cep: formatCepInput(address.cep),
    rua: address.rua,
    numero: address.numero,
    complemento: address.complemento ?? "",
    bairro: address.bairro,
    cidade: address.cidade,
    estado: address.estado,
  };
}

function CheckoutPageContent() {
  const { session } = useCustomerAuth();
  const { items, summary, couponCode, itemCount, isLoading, clearCart } =
    useCart();
  const [, setLocation] = useLocation();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("new");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [addressForm, setAddressForm] = useState<AddressFormValues>(
    emptyAddressFormValues()
  );
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [cpf, setCpf] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID()
  );
  const [mpConfig, setMpConfig] = useState<MercadoPagoPublicConfig | null>(
    null
  );
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [addressSaved, setAddressSaved] = useState(false);

  useEffect(() => {
    document.title = "Checkout — Nativa Store";
    return () => {
      document.title = "Nativa Store — Artesanato com Alma";
    };
  }, []);

  useEffect(() => {
    if (!isLoading && itemCount === 0 && !completedOrder) {
      setLocation("/carrinho");
    }
  }, [isLoading, itemCount, completedOrder, setLocation]);

  useEffect(() => {
    if (!session?.access_token) return;

    let cancelled = false;
    setProfileLoading(true);

    fetchCustomerProfile(session.access_token)
      .then(data => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar seus dados");
      });

    fetchCustomerAddresses(session.access_token)
      .then(addresses => {
        if (cancelled) return;
        setSavedAddresses(addresses);
        const defaultAddress =
          addresses.find(item => item.isDefault) ?? addresses[0];
        if (defaultAddress) {
          setAddressMode("saved");
          setSelectedAddressId(defaultAddress.id);
          setAddressForm(addressToFormValues(defaultAddress));
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar seus endereços");
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    let cancelled = false;
    fetchMercadoPagoConfig()
      .then(config => {
        if (cancelled) return;
        initMercadoPago(config.publicKey, { locale: "pt-BR" });
        setMpConfig(config);
        if (!config.methods.includes(paymentMethod)) {
          setPaymentMethod(config.methods[0] ?? "pix");
        }
      })
      .catch(error => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Pagamento indisponível"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPaymentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !completedOrder ||
      completedOrder.paymentStatus === "approved" ||
      !session?.access_token
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      fetchCustomerOrder(session.access_token, completedOrder.id)
        .then(order => setCompletedOrder(order))
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [
    completedOrder?.id,
    completedOrder?.paymentStatus,
    session?.access_token,
  ]);

  function getShippingAddressFromSelection() {
    if (addressMode === "saved" && selectedAddressId) {
      const selected = savedAddresses.find(
        item => item.id === selectedAddressId
      );
      if (selected) return customerAddressToShippingAddress(selected);
    }
    return shippingAddressFromForm(addressForm);
  }

  async function handleSubmit(card?: CardPaymentData): Promise<boolean> {
    if (!session?.access_token) return false;

    const payload = {
      shippingAddress: getShippingAddressFromSelection(),
      paymentMethod,
      idempotencyKey,
      payer: { identificationNumber: cpf },
      card,
    };

    const parsed = checkoutSchema.safeParse(payload);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      toast.error("Revise os dados de entrega e pagamento");
      return false;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (addressMode === "new" && saveNewAddress && !addressSaved) {
        const shipping = shippingAddressFromForm(addressForm);
        await createCustomerAddress(session.access_token, {
          label: "Entrega",
          cep: shipping.cep,
          rua: shipping.rua,
          numero: shipping.numero,
          complemento: shipping.complemento,
          bairro: shipping.bairro,
          cidade: shipping.cidade,
          estado: shipping.estado,
          isDefault: savedAddresses.length === 0,
        });
        setAddressSaved(true);
      }

      const response = await checkoutOrder(session.access_token, parsed.data);
      if (response.payment.outcome === "rejected") {
        setIdempotencyKey(crypto.randomUUID());
        toast.error(
          response.payment.statusDetail ||
            "Pagamento recusado. Tente novamente."
        );
        return false;
      }
      await clearCart();
      setCompletedOrder(response.order);
      toast.success(
        response.payment.outcome === "approved"
          ? "Pagamento aprovado!"
          : "Pedido criado",
        {
          description:
            response.payment.outcome === "approved"
              ? "Obrigada por comprar na Nativa!"
              : "Conclua o pagamento para confirmarmos seu pedido.",
        }
      );
      return true;
    } catch (error) {
      const message =
        error instanceof OrderApiError
          ? error.message
          : "Não foi possível finalizar a compra";
      toast.error(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || profileLoading || paymentLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
        <Navbar />
        <main className="flex justify-center pt-32 pb-16">
          <Spinner className="size-10 text-[#C4522A]" />
        </main>
        <Footer />
      </div>
    );
  }

  if (completedOrder) {
    return (
      <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
        <Navbar />
        <main className="container max-w-6xl pt-20 pb-16 md:pt-24">
          <CheckoutSuccessView order={completedOrder} />
        </main>
        <Footer />
      </div>
    );
  }

  if (itemCount === 0) return null;

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <Navbar />

      <main className="pt-20 md:pt-24 pb-16">
        <div className="container max-w-6xl">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href="/carrinho"
                    className="text-[#8B6F5E] transition-colors hover:text-[#C4522A]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    Carrinho
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage
                  className="font-medium text-[#3D2B1F]"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  Checkout
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <h1
              className="mb-2 text-3xl font-bold text-[#3D2B1F] md:text-4xl"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Finalizar compra
            </h1>
            <p
              className="text-[#8B6F5E]"
              style={{ fontFamily: "'Lora', serif" }}
            >
              Preencha seus dados para concluir o pedido
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              {/* Identificação */}
              <section className="rounded-2xl border border-[#E8D5C4] bg-white p-5 md:p-6">
                <h2
                  className="mb-4 text-lg font-bold text-[#3D2B1F]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Identificação
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label className="text-[#8B6F5E]">Nome completo</Label>
                    <div className="flex items-center gap-2 rounded-xl border border-[#E8D5C4] bg-[#FAF7F2] px-3.5 py-2.5">
                      <User size={16} className="text-[#8B6F5E]" />
                      <span
                        className="text-sm font-medium text-[#3D2B1F]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        {profile?.fullName ?? "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[#8B6F5E]">E-mail</Label>
                    <div className="flex items-center gap-2 rounded-xl border border-[#E8D5C4] bg-[#FAF7F2] px-3.5 py-2.5">
                      <Mail size={16} className="text-[#8B6F5E]" />
                      <span
                        className="truncate text-sm text-[#3D2B1F]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        {profile?.email ?? "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[#8B6F5E]">Telefone</Label>
                    <div className="flex items-center gap-2 rounded-xl border border-[#E8D5C4] bg-[#FAF7F2] px-3.5 py-2.5">
                      <Phone size={16} className="text-[#8B6F5E]" />
                      <span
                        className="text-sm text-[#3D2B1F]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        {profile?.phone || "Não informado"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Endereço */}
              <section className="rounded-2xl border border-[#E8D5C4] bg-white p-5 md:p-6">
                <h2
                  className="mb-4 text-lg font-bold text-[#3D2B1F]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Endereço de entrega
                </h2>

                {savedAddresses.length > 0 && (
                  <div className="mb-5 space-y-3">
                    <p
                      className="text-sm text-[#8B6F5E]"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      Escolha um endereço salvo ou cadastre um novo
                    </p>
                    <div className="grid gap-3">
                      {savedAddresses.map(item => (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                            addressMode === "saved" &&
                            selectedAddressId === item.id
                              ? "border-[#C4522A] bg-[#C4522A]/5"
                              : "border-[#E8D5C4] hover:border-[#C4522A]/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="checkout-address"
                            checked={
                              addressMode === "saved" &&
                              selectedAddressId === item.id
                            }
                            onChange={() => {
                              setAddressMode("saved");
                              setSelectedAddressId(item.id);
                              setAddressForm(addressToFormValues(item));
                            }}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-semibold text-[#3D2B1F]"
                                style={{ fontFamily: "'Nunito', sans-serif" }}
                              >
                                {item.label}
                              </span>
                              {item.isDefault && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#C4522A]">
                                  <Star className="size-3 fill-current" />
                                  Padrão
                                </span>
                              )}
                            </div>
                            <p
                              className="mt-1 text-sm text-[#8B6F5E]"
                              style={{ fontFamily: "'Nunito', sans-serif" }}
                            >
                              {formatAddressLine(item)}
                            </p>
                          </div>
                        </label>
                      ))}

                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                          addressMode === "new"
                            ? "border-[#C4522A] bg-[#C4522A]/5"
                            : "border-[#E8D5C4] hover:border-[#C4522A]/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="checkout-address"
                          checked={addressMode === "new"}
                          onChange={() => {
                            setAddressMode("new");
                            setSelectedAddressId(null);
                            setAddressForm(emptyAddressFormValues());
                          }}
                        />
                        <Plus size={18} className="text-[#C4522A]" />
                        <span
                          className="font-semibold text-[#3D2B1F]"
                          style={{ fontFamily: "'Nunito', sans-serif" }}
                        >
                          Usar outro endereço
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {(addressMode === "new" || savedAddresses.length === 0) && (
                  <>
                    <AddressForm
                      values={addressForm}
                      onChange={values => {
                        setAddressForm(values);
                        setFieldErrors(prev => {
                          const next = { ...prev };
                          Object.keys(values).forEach(key => {
                            delete next[key];
                            delete next[`shippingAddress.${key}`];
                          });
                          return next;
                        });
                      }}
                      errors={fieldErrors}
                      showLabel={false}
                      disabled={isSubmitting}
                    />

                    <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-[#E8D5C4] bg-[#FAF7F2]/60 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={saveNewAddress}
                        onChange={e => setSaveNewAddress(e.target.checked)}
                        className="size-4 rounded border-[#C4522A]/40 text-[#C4522A]"
                      />
                      <span
                        className="text-sm text-[#3D2B1F]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        Salvar este endereço na minha conta
                      </span>
                    </label>
                  </>
                )}

                <p
                  className="mt-4 text-xs text-[#8B6F5E]"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  CEP preenchido automaticamente via{" "}
                  <a
                    href="https://viacep.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C4522A] underline-offset-2 hover:underline"
                  >
                    ViaCEP
                  </a>
                  .{" "}
                  <Link
                    href="/conta"
                    className="text-[#C4522A] underline-offset-2 hover:underline"
                  >
                    Gerenciar endereços
                  </Link>
                </p>
              </section>

              {/* Pagamento */}
              <section className="rounded-2xl border border-[#E8D5C4] bg-white p-5 md:p-6">
                <h2
                  className="mb-4 text-lg font-bold text-[#3D2B1F]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Forma de pagamento
                </h2>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={value =>
                    setPaymentMethod(value as PaymentMethod)
                  }
                  className="grid gap-3 sm:grid-cols-3"
                >
                  {[
                    { value: "pix", label: "Pix", icon: QrCode },
                    { value: "credit_card", label: "Cartão", icon: CreditCard },
                    { value: "boleto", label: "Boleto", icon: Barcode },
                  ]
                    .filter(({ value }) =>
                      mpConfig?.methods.includes(value as PaymentMethod)
                    )
                    .map(({ value, label, icon: Icon }) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                          paymentMethod === value
                            ? "border-[#C4522A] bg-[#C4522A]/5"
                            : "border-[#E8D5C4] hover:border-[#C4522A]/40"
                        }`}
                      >
                        <RadioGroupItem value={value} id={`payment-${value}`} />
                        <Icon size={18} className="text-[#C4522A]" />
                        <span
                          className="text-sm font-semibold text-[#3D2B1F]"
                          style={{ fontFamily: "'Nunito', sans-serif" }}
                        >
                          {label}
                        </span>
                      </label>
                    ))}
                </RadioGroup>

                <div className="mt-4 flex flex-col gap-2">
                  <Label htmlFor="payer-cpf">CPF do pagador</Label>
                  <Input
                    id="payer-cpf"
                    value={cpf}
                    onChange={event => {
                      const digits = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11);
                      const masked = digits
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                      setCpf(masked);
                      setFieldErrors(previous => {
                        const next = { ...previous };
                        delete next["payer.identificationNumber"];
                        return next;
                      });
                    }}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    className="max-w-xs border-[#E8D5C4]"
                  />
                  {fieldErrors["payer.identificationNumber"] && (
                    <p className="text-xs text-red-600">
                      {fieldErrors["payer.identificationNumber"]}
                    </p>
                  )}
                </div>

                {paymentMethod === "credit_card" && (
                  <div className="mt-4 rounded-xl border border-[#E8D5C4] bg-white p-2 sm:p-4">
                    {mpConfig && (
                      <CardPayment
                        initialization={{
                          amount:
                            summary.subtotal +
                            calculateShippingAmount(summary.subtotal),
                          payer: { email: profile?.email },
                        }}
                        customization={{
                          paymentMethods: {
                            minInstallments: 1,
                            maxInstallments: mpConfig.maxInstallments,
                            types: { included: ["credit_card"] },
                          },
                        }}
                        locale="pt-BR"
                        onSubmit={async formData => {
                          const success = await handleSubmit({
                            token: formData.token,
                            paymentMethodId: formData.payment_method_id,
                            installments: formData.installments,
                            issuerId: formData.issuer_id,
                          });
                          if (!success)
                            throw new Error("Pagamento não concluído");
                        }}
                        onError={() =>
                          toast.error(
                            "Não foi possível carregar o formulário do cartão"
                          )
                        }
                      />
                    )}
                  </div>
                )}

                {paymentMethod === "pix" && (
                  <p
                    className="mt-4 rounded-xl bg-[#2D6A4F]/10 px-4 py-3 text-sm text-[#2D6A4F]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    O QR Code e o código Pix copia e cola serão exibidos
                    imediatamente após gerar o pedido.
                  </p>
                )}

                {paymentMethod === "boleto" && (
                  <p
                    className="mt-4 rounded-xl bg-[#FAF7F2] px-4 py-3 text-sm text-[#8B6F5E]"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    O link para abrir ou imprimir o boleto será exibido após
                    gerar o pedido.
                  </p>
                )}
              </section>
            </div>

            <CheckoutOrderSummary
              items={items}
              subtotal={summary.subtotal}
              couponCode={couponCode}
              isSubmitting={isSubmitting}
              onSubmit={() => void handleSubmit()}
              showSubmit={paymentMethod !== "credit_card"}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireCustomerAuth>
      <CheckoutPageContent />
    </RequireCustomerAuth>
  );
}
