import { describe, expect, it } from "vitest";
import { applyFreeShipping, groupShipmentVolumes } from "./shipping";

const options = [
  {
    id: "1",
    name: "PAC",
    company: "Correios",
    price: 24.9,
    customPrice: 24.9,
    deliveryTime: 6,
    customDeliveryTime: 6,
    currency: "R$",
    packages: [],
  },
  {
    id: "2",
    name: "Expresso",
    company: "Outra",
    price: 35,
    customPrice: 35,
    deliveryTime: 2,
    customDeliveryTime: 2,
    currency: "R$",
    packages: [],
  },
];

describe("regras de frete do checkout", () => {
  it("zera somente a opção mais barata quando há frete grátis", () => {
    const result = applyFreeShipping(options, 299);
    expect(result.applied).toBe(true);
    expect(result.options[0].customPrice).toBe(0);
    expect(result.options[1].customPrice).toBe(35);
    expect(options[0].customPrice).toBe(24.9);
  });

  it("mantém o preço abaixo do limite", () => {
    const result = applyFreeShipping(options, 298.99);
    expect(result.applied).toBe(false);
    expect(result.options[0].customPrice).toBe(24.9);
  });

  it("divide múltiplos volumes para Correios, J&T e Loggi", () => {
    const volumes = [
      { height: 10, width: 20, length: 30, weight: 1 },
      { height: 15, width: 25, length: 35, weight: 2 },
    ];
    expect(groupShipmentVolumes("Correios", volumes)).toHaveLength(2);
    expect(groupShipmentVolumes("J&T Express", volumes)).toHaveLength(2);
    expect(groupShipmentVolumes("Loggi", volumes)).toHaveLength(2);
    expect(groupShipmentVolumes("Jadlog", volumes)).toEqual([volumes]);
  });
});
