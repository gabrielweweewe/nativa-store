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
import { fetchCheckoutShippingQuote } from "@/lib/shippingApi";
import { OrderApiError, checkoutOrder } from "@/lib/orderApi";
import { fetchCustomerOrder, fetchMercadoPagoConfig } from "@/lib/orderApi";
import { checkoutSchema } from "@shared/schemas/order";
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
import type {
  ShippingQuoteOption,
  ShippingQuoteResult,
} from "@shared/types/melhorEnvio";
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
  Truck,
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
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingQuote, setShippingQuote] =
    useState<ShippingQuoteResult | null>(null);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(
    null
  );
  const [shippingLoading, setShippingLoading] = useState(false);

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
        if (!cancelled) {
          setProfile(data);
          setRecipientName(data.fullName ?? "");
          setRecipientEmail(data.email ?? "");
          setRecipientPhone(data.phone ?? "");
        }
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
    const token = session?.access_token;
    const postalCode = addressForm.cep.replace(/\D/g, "");
    if (!token || postalCode.length !== 8 || itemCount === 0) {
      setShippingQuote(null);
      setSelectedShippingId(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setShippingLoading(true);
      fetchCheckoutShippingQuote(token, postalCode)
        .then(result => {
          if (cancelled) return;
          setShippingQuote(result);
          setSelectedShippingId(result.options[0]?.id ?? null);
          setIdempotencyKey(crypto.randomUUID());
        })
        .catch(error => {
          if (cancelled) return;
          setShippingQuote(null);
          setSelectedShippingId(null);
          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível calcular a entrega"
          );
        })
        .finally(() => {
          if (!cancelled) setShippingLoading(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addressForm.cep, itemCount, session?.access_token, summary.subtotal]);

  const selectedShipping: ShippingQuoteOption | null =
    shippingQuote?.options.find(option => option.id === selectedShippingId) ??
    null;

  function clearFieldError(key: string) {
    setFieldErrors(previous => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

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

    const token = session.access_token;
    const orderId = completedOrder.id;
    let cancelled = false;

    async function pollPaymentStatus() {
      try {
        const order = await fetchCustomerOrder(token, orderId);
        if (cancelled) return;
        setCompletedOrder(prev => {
          if (
            prev &&
            prev.paymentStatus !== "approved" &&
            order.paymentStatus === "approved"
          ) {
            toast.success("Pagamento confirmado!", {
              description: "Seu pedido foi aprovado com sucesso.",
            });
          }
          return order;
        });
      } catch {
        // Mantém a tela de aguardo; tenta de novo no próximo ciclo
      }
    }

    void pollPaymentStatus();
    const timer = window.setInterval(() => {
      void pollPaymentStatus();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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
      shipping: {
        quoteId: shippingQuote?.quoteId ?? "",
        serviceId: selectedShippingId ?? "",
      },
      recipient: {
        name: recipientName,
        email: recipientEmail,
        phone: recipientPhone,
        document: cpf,
      },
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
      setIdempotencyKey(crypto.randomUUID());
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

      <main className="pb-32 pt-20 md:pt-24 lg:pb-16">
        <div className="container max-w-7xl px-4 sm:px-6">
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

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-10">
            <div className="space-y-6">
              <section className="rounded-3xl border border-[#E8D5C4] bg-white p-5 shadow-[0_14px_40px_rgba(61,43,31,0.05)] md:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#C4522A] text-sm font-bold text-white">
                    1
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-[#3D2B1F] [font-family:'Playfair_Display',serif]">
                      Quem vai receber?
                    </h2>
                    <p className="text-xs text-[#8B6F5E]">
                      Usamos estes dados somente para entrega e rastreio.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="recipient-name">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 size-4 text-[#8B6F5E]" />
                      <Input
                        id="recipient-name"
                        value={recipientName}
                        onChange={event => {
                          setRecipientName(event.target.value);
                          clearFieldError("recipient.name");
                        }}
                        className="h-11 rounded-xl border-[#E8D5C4] pl-10"
                        autoComplete="name"
                      />
                    </div>
                    {fieldErrors["recipient.name"] && (
                      <p className="text-xs text-red-600">{fieldErrors["recipient.name"]}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 size-4 text-[#8B6F5E]" />
                      <Input
                        id="recipient-email"
                        type="email"
                        value={recipientEmail}
                        onChange={event => {
                          setRecipientEmail(event.target.value);
                          clearFieldError("recipient.email");
                        }}
                        className="h-11 rounded-xl border-[#E8D5C4] pl-10"
                        autoComplete="email"
                      />
                    </div>
                    {fieldErrors["recipient.email"] && (
                      <p className="text-xs text-red-600">{fieldErrors["recipient.email"]}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient-phone">Celular</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 size-4 text-[#8B6F5E]" />
                      <Input
                        id="recipient-phone"
                        value={recipientPhone}
                        onChange={event => {
                          setRecipientPhone(event.target.value);
                          clearFieldError("recipient.phone");
                        }}
                        className="h-11 rounded-xl border-[#E8D5C4] pl-10"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>
                    {fieldErrors["recipient.phone"] && (
                      <p className="text-xs text-red-600">{fieldErrors["recipient.phone"]}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Endereço */}
              <section className="rounded-3xl border border-[#E8D5C4] bg-white p-5 shadow-[0_14px_40px_rgba(61,43,31,0.05)] md:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#C4522A] text-sm font-bold text-white">2</span>
                  <h2 className="text-lg font-bold text-[#3D2B1F] [font-family:'Playfair_Display',serif]">
                    Endereço de entrega
                  </h2>
                </div>

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

              <section className="rounded-3xl border border-[#E8D5C4] bg-white p-5 shadow-[0_14px_40px_rgba(61,43,31,0.05)] md:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#C4522A] text-sm font-bold text-white">3</span>
                  <div>
                    <h2 className="text-lg font-bold text-[#3D2B1F] [font-family:'Playfair_Display',serif]">
                      Escolha a entrega
                    </h2>
                    <p className="text-xs text-[#8B6F5E]">Prazo contado após a postagem.</p>
                  </div>
                </div>

                {shippingLoading ? (
                  <div className="flex items-center justify-center gap-3 rounded-2xl bg-[#FAF7F2] py-8 text-sm text-[#8B6F5E]">
                    <Spinner className="size-5 text-[#C4522A]" />
                    Buscando as melhores opções...
                  </div>
                ) : shippingQuote?.options.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {shippingQuote.options.map(option => {
                      const selected = selectedShippingId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedShippingId(option.id);
                            setIdempotencyKey(crypto.randomUUID());
                            clearFieldError("shipping.serviceId");
                          }}
                          className={`min-h-24 rounded-2xl border p-4 text-left transition-all ${
                            selected
                              ? "border-[#C4522A] bg-[#C4522A]/5 ring-2 ring-[#C4522A]/10"
                              : "border-[#E8D5C4] hover:border-[#C4522A]/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex size-9 items-center justify-center rounded-xl bg-[#FAF7F2] text-[#C4522A]">
                              <Truck className="size-4" />
                            </span>
                            <span className={`size-4 rounded-full border-2 ${selected ? "border-[5px] border-[#C4522A]" : "border-[#CBB5A4]"}`} />
                          </div>
                          <p className="mt-3 font-bold text-[#3D2B1F]">{option.company}</p>
                          <p className="text-xs text-[#8B6F5E]">{option.name} · até {option.customDeliveryTime} dias úteis</p>
                          <p className="mt-2 font-bold text-[#2D6A4F]">
                            {option.customPrice === 0
                              ? "Grátis"
                              : option.customPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#D9C2AF] bg-[#FAF7F2] px-5 py-7 text-center">
                    <Truck className="mx-auto mb-2 size-6 text-[#C4522A]" />
                    <p className="text-sm font-semibold text-[#3D2B1F]">Informe um CEP válido</p>
                    <p className="mt-1 text-xs text-[#8B6F5E]">As transportadoras disponíveis aparecerão aqui.</p>
                  </div>
                )}
                {fieldErrors["shipping.serviceId"] && (
                  <p className="mt-2 text-xs text-red-600">{fieldErrors["shipping.serviceId"]}</p>
                )}
              </section>

              {/* Pagamento */}
              <section className="rounded-3xl border border-[#E8D5C4] bg-white p-5 shadow-[0_14px_40px_rgba(61,43,31,0.05)] md:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#C4522A] text-sm font-bold text-white">4</span>
                  <h2 className="text-lg font-bold text-[#3D2B1F] [font-family:'Playfair_Display',serif]">
                    Forma de pagamento
                  </h2>
                </div>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={value => {
                    setPaymentMethod(value as PaymentMethod);
                    setIdempotencyKey(crypto.randomUUID());
                  }}
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
                  <Label htmlFor="payer-cpf">CPF do destinatário e pagador</Label>
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
                        delete next["recipient.document"];
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
                  {!fieldErrors["payer.identificationNumber"] &&
                    fieldErrors["recipient.document"] && (
                      <p className="text-xs text-red-600">
                        {fieldErrors["recipient.document"]}
                      </p>
                    )}
                </div>

                {paymentMethod === "credit_card" && (
                  <div className="mt-4 rounded-xl border border-[#E8D5C4] bg-white p-2 sm:p-4">
                    {mpConfig && selectedShipping ? (
                      <CardPayment
                        initialization={{
                          amount:
                            summary.subtotal +
                            (selectedShipping?.customPrice ?? 0),
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
                    ) : (
                      <p className="px-3 py-5 text-center text-sm text-[#8B6F5E]">
                        Escolha uma opção de entrega para liberar o cartão.
                      </p>
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
              shipping={selectedShipping}
              shippingLoading={shippingLoading}
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
