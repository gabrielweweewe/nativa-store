import type { Product } from "@shared/types/product";

export const products: Product[] = [
  {
    id: 1,
    slug: "bolsa-arara",
    name: "Bolsa Arara",
    category: "Bolsas",
    price: 289.9,
    originalPrice: 349.9,
    image: "/manus-storage/nativa-product-1_89d7d204.jpg",
    images: [
      "/manus-storage/nativa-product-1_89d7d204.jpg",
      "/manus-storage/nativa-product-1_89d7d204.jpg",
      "/manus-storage/nativa-product-1_89d7d204.jpg",
    ],
    badge: "Mais Vendida",
    badgeColor: "#C4522A",
    rating: 0,
    reviews: 0,
    featured: false,
    shortDescription:
      "Bolsa artesanal em algodão com bordado de arara em tons tropicais. Leve, resistente e cheia de personalidade.",
    description:
      "A Bolsa Arara celebra a fauna brasileira com um bordado feito à mão por artesãs de Minas Gerais. Confeccionada em algodão de toque macio, possui alças reforçadas e acabamento impecável. Cada peça leva em média 8 horas de trabalho manual, garantindo exclusividade. Ideal para o dia a dia com um toque autoral.",
    materials: [
      "100% algodão certificado",
      "Linha de bordado em algodão tingido naturalmente",
      "Forro em tecido natural",
    ],
    careInstructions: [
      "Lavar à mão ou ciclo delicado na máquina",
      "Não usar alvejante",
      "Secar à sombra",
      "Passar do avesso em temperatura baixa",
    ],
    artisan: {
      name: "Maria Helena",
      region: "São João del-Rei, MG",
      story:
        "Maria Helena aprendeu o bordado com sua avó aos 12 anos. Hoje lidera um coletivo de 6 mulheres que preservam técnicas tradicionais mineiras, reinterpretando a fauna brasileira em cada ponto.",
    },
    sizes: [{ label: "Único", available: true }],
    colors: [
      { name: "Creme", hex: "#F5F0E8" },
      { name: "Terracota", hex: "#C4522A" },
    ],
    sku: "NAT-BOL-001",
    inStock: true,
    stockCount: 12,
    highlights: [
      "Bordado 100% à mão",
      "Algodão certificado",
      "Produção limitada",
      "Frete grátis acima de R$ 299",
    ],
    faq: [
      {
        question: "O bordado desbota com o tempo?",
        answer:
          "Não. Utilizamos linhas tingidas naturalmente e técnicas que garantem durabilidade. Seguindo as instruções de cuidado, o bordado mantém as cores vibrantes por anos.",
      },
      {
        question: "Qual o prazo de entrega?",
        answer:
          "Produção artesanal: 3 a 5 dias úteis. Envio: 5 a 12 dias úteis conforme sua região.",
      },
    ],
  },
  {
    id: 2,
    slug: "bolsa-floresta",
    name: "Bolsa Floresta",
    category: "Bolsas",
    price: 459.9,
    originalPrice: null,
    image: "/manus-storage/nativa-product-2_2d8939e3.jpg",
    images: [
      "/manus-storage/nativa-product-2_2d8939e3.jpg",
      "/manus-storage/nativa-product-2_2d8939e3.jpg",
      "/manus-storage/nativa-product-2_2d8939e3.jpg",
    ],
    badge: "Exclusiva",
    badgeColor: "#2D6A4F",
    rating: 0,
    reviews: 0,
    featured: true,
    shortDescription:
      "Bolsa em tecido natural com estampa exclusiva inspirada na Mata Atlântica. Espaçosa e elegante.",
    description:
      "A Bolsa Floresta é a peça assinatura da coleção. Sua estampa foi pintada à mão por artista plástica carioca e transferida em edição limitada de 50 unidades. O tecido oferece resistência e leveza. Com alça reforçada e bolsos internos, combina sofisticação e praticidade.",
    materials: [
      "Tecido natural sustentável",
      "Estampa em pigmentos ecológicos",
      "Forro em algodão leve",
    ],
    careInstructions: [
      "Lavar à mão em água fria",
      "Não torcer",
      "Secar à sombra",
      "Guardar em local seco",
    ],
    artisan: {
      name: "Ana Beatriz",
      region: "Paraty, RJ",
      story:
        "Ana Beatriz é artista visual e artesã. Suas estampas nascem de caminhadas pela Mata Atlântica, capturando folhas, samambaias e a luz filtrada entre as árvores.",
    },
    sizes: [{ label: "Único", available: true }],
    colors: [{ name: "Verde Floresta", hex: "#2D6A4F" }],
    sku: "NAT-BOL-002",
    inStock: true,
    stockCount: 8,
    highlights: [
      "Edição limitada — 50 unidades",
      "Estampa pintada à mão",
      "Tecido sustentável",
      "Alça reforçada",
    ],
    faq: [
      {
        question: "Qual a capacidade da bolsa?",
        answer:
          "Comporta confortavelmente caderno, garrafa d'água, carteira e itens do dia a dia sem perder a forma.",
      },
    ],
  },
  {
    id: 3,
    slug: "bolsa-tucano",
    name: "Bolsa Tucano",
    category: "Bolsas",
    price: 199.9,
    originalPrice: 249.9,
    image: "/manus-storage/nativa-product-3_8bc1b061.jpg",
    images: [
      "/manus-storage/nativa-product-3_8bc1b061.jpg",
      "/manus-storage/nativa-product-3_8bc1b061.jpg",
    ],
    badge: "Promoção",
    badgeColor: "#E8821A",
    rating: 0,
    reviews: 0,
    featured: false,
    shortDescription:
      "Bolsa transversal em couro legítimo com aplicação de tucano em couro colorido. Compacta e cheia de charme.",
    description:
      "A Bolsa Tucano é feita em couro legítimo curtido de forma vegetal, com aplicação artesanal do icônico tucano brasileiro. Possui alça ajustável, bolso interno com zíper e fecho magnético. Perfeita para o dia a dia, comporta celular, carteira, chaves e essenciais com estilo.",
    materials: [
      "Couro bovino curtido vegetal",
      "Aplicação em couro colorido",
      "Ferragens em metal escovado",
    ],
    careInstructions: [
      "Limpar com pano úmido",
      "Aplicar hidratante de couro a cada 3 meses",
      "Evitar exposição prolongada ao sol",
    ],
    artisan: {
      name: "João Pedro",
      region: "Nova Friburgo, RJ",
      story:
        "João Pedro é coureiro de terceira geração. Suas bolsas misturam técnicas tradicionais com design contemporâneo, sempre celebrando a fauna nacional.",
    },
    sizes: [{ label: "Único", available: true }],
    colors: [
      { name: "Caramelo", hex: "#C9922A" },
      { name: "Marrom", hex: "#3D2B1F" },
    ],
    sku: "NAT-BOL-003",
    inStock: true,
    stockCount: 15,
    highlights: [
      "Couro legítimo curtido vegetal",
      "Aplicação artesanal",
      "Alça ajustável",
      "Bolso interno com zíper",
    ],
    faq: [
      {
        question: "Qual o tamanho da bolsa?",
        answer: "20cm x 15cm x 8cm — ideal para uso diário sem ser volumosa.",
      },
      {
        question: "O couro é legítimo?",
        answer:
          "Sim, 100% couro bovino com curtimento vegetal, processo mais sustentável e que desenvolve pátina natural com o uso.",
      },
    ],
  },
  {
    id: 4,
    slug: "bolsa-tropical",
    name: "Bolsa Tropical",
    category: "Bolsas",
    price: 379.9,
    originalPrice: null,
    image: "/manus-storage/nativa-product-4_189ffa42.jpg",
    images: [
      "/manus-storage/nativa-product-4_189ffa42.jpg",
      "/manus-storage/nativa-product-4_189ffa42.jpg",
      "/manus-storage/nativa-product-4_189ffa42.jpg",
    ],
    badge: "Nova",
    badgeColor: "#1B7A8C",
    rating: 0,
    reviews: 0,
    featured: false,
    shortDescription:
      "Bolsa oversized com estampa tropical exclusiva. Versátil para o dia a dia e viagens.",
    description:
      "A Bolsa Tropical traz a exuberância brasileira em uma peça espaçosa e prática. Em tecido de toque acetinado, apresenta estampa com folhagens e flores tropicais em tons de turquesa e laranja. Ideal para o dia, a praia ou uma escapada de fim de semana.",
    materials: [
      "Tecido premium resistente",
      "Estampa digital em pigmentos ecológicos",
      "Forro impermeável leve",
    ],
    careInstructions: [
      "Lavar à mão em água fria",
      "Não usar secadora",
      "Secar à sombra",
    ],
    artisan: {
      name: "Camila Rocha",
      region: "Florianópolis, SC",
      story:
        "Camila une referências contemporâneas com a estética tropical brasileira. Cada bolsa é cortada individualmente para alinhar a estampa de forma única.",
    },
    sizes: [{ label: "Único", available: true }],
    colors: [{ name: "Turquesa Tropical", hex: "#1B7A8C" }],
    sku: "NAT-BOL-004",
    inStock: true,
    stockCount: 10,
    highlights: [
      "Estampa exclusiva Nativa",
      "Corte oversized",
      "Forro impermeável",
      "Versátil — do dia à praia",
    ],
    faq: [
      {
        question: "Serve como bolsa de viagem?",
        answer:
          "Sim! O tamanho oversized comporta o essencial de um fim de semana, mantendo o estilo artesanal.",
      },
    ],
  },
  {
    id: 5,
    slug: "bolsa-onca",
    name: "Bolsa Onça",
    category: "Bolsas",
    price: 319.9,
    originalPrice: null,
    image: "/manus-storage/nativa-product-5_c99b2e11.jpg",
    images: [
      "/manus-storage/nativa-product-5_c99b2e11.jpg",
      "/manus-storage/nativa-product-5_c99b2e11.jpg",
    ],
    badge: "Artesanal",
    badgeColor: "#C9922A",
    rating: 0,
    reviews: 0,
    featured: false,
    shortDescription:
      "Bolsa com estampa de onça pintada em tons terrosos. Acabamento artesanal e alças reforçadas.",
    description:
      "A Bolsa Onça homenageia o felino mais icônico do Brasil com uma estampa sofisticada em tons terrosos e dourados. Costurada à mão com acabamento reforçado, possui forro interno e alças confortáveis para uso diário.",
    materials: [
      "Tecido reciclado PET",
      "Forro em microfibra",
      "Alças reforçadas",
    ],
    careInstructions: [
      "Lavar à máquina em ciclo delicado",
      "Secar à sombra",
      "Não usar alvejante",
    ],
    artisan: {
      name: "Fernanda Lima",
      region: "Belo Horizonte, MG",
      story:
        "Fernanda transforma resíduos têxteis em tecidos reciclados de alta qualidade. Sua especialidade é o acabamento artesanal aplicado às bolsas Nativa.",
    },
    sizes: [{ label: "Único", available: true }],
    colors: [{ name: "Onça Dourada", hex: "#C9922A" }],
    sku: "NAT-BOL-005",
    inStock: true,
    stockCount: 14,
    highlights: [
      "Estampa exclusiva",
      "Tecido reciclado PET",
      "Alças reforçadas",
      "Produção artesanal",
    ],
    faq: [
      {
        question: "A estampa desbota?",
        answer:
          "Não. Usamos pigmentos ecológicos de alta fixação. Com os cuidados indicados, a estampa permanece viva por anos.",
      },
    ],
  },
  {
    id: 6,
    slug: "bolsa-mandala",
    name: "Bolsa Mandala",
    category: "Bolsas",
    price: 129.9,
    originalPrice: 159.9,
    image: "/manus-storage/nativa-product-6_b60f7138.jpg",
    images: [
      "/manus-storage/nativa-product-6_b60f7138.jpg",
      "/manus-storage/nativa-product-6_b60f7138.jpg",
    ],
    badge: "Edição Limitada",
    badgeColor: "#C4522A",
    rating: 0,
    reviews: 0,
    featured: false,
    shortDescription:
      "Bolsa de praia artesanal com estampa mandala colorida. Leve, resistente e cheia de charme.",
    description:
      "A Bolsa Mandala é feita à mão com tecido resistente e alças reforçadas. Ideal para praia, feira ou o dia a dia, carrega a energia das cores brasileiras em uma peça prática e exclusiva.",
    materials: [
      "Algodão resistente",
      "Palha trançada nas alças",
      "Forro impermeável leve",
    ],
    careInstructions: [
      "Lavar à mão",
      "Não usar alvejante",
      "Secar à sombra",
    ],
    artisan: {
      name: "Maria das Graças",
      region: "Nordeste",
      story:
        "Artesã há mais de 20 anos, Maria das Graças mantém viva a tradição da trança de palha e do bordado colorido do Nordeste.",
    },
    sizes: [{ label: "Único", available: true }],
    colors: [
      { name: "Multicolor", hex: "#C4522A" },
      { name: "Terra", hex: "#8B6F5E" },
    ],
    sku: "NAT-BOL-006",
    inStock: true,
    stockCount: 6,
    highlights: [
      "Edição limitada",
      "Feita à mão",
      "Alças reforçadas",
      "Ideal para praia e dia a dia",
    ],
    faq: [
      {
        question: "Serve para a praia?",
        answer:
          "Sim! O forro impermeável leve e o tecido resistente tornam a Bolsa Mandala perfeita para areia e sol.",
      },
    ],
  },
];
