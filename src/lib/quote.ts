export type QuoteInputs = {
  carCost: number;
  carQuantity: number;
  freight: number;
  portableCharger: boolean;
  residentialCharger: boolean;
  extraChargers: number;
  additionalAccessoriesCost: number;
  vehicleType: VehicleType;
};

export type VehicleType = "electric" | "hybrid" | "combustion";

export type QuoteTotals = {
  totalCarCost: number;
  commission: number;
  purchaseManagement: number;
  freight: number;
  portableCharger: number;
  residentialCharger: number;
  extraChargersCost: number;
  additionalAccessoriesCost: number;
  accessoriesCost: number;
  cif: number;
  tariffRate: number;
  tariff: number;
  subtotal: number;
  tax: number;
  total: number;
  deposit30: number;
  balance70: number;
};

const currencyFormatter = new Intl.NumberFormat("es-PA", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function roundToCents(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function calculateQuote(inputs: QuoteInputs): QuoteTotals {
  const totalCarCost = roundToCents(inputs.carCost * inputs.carQuantity);
  const commission = roundToCents(totalCarCost * 0.05);
  const purchaseManagement = roundToCents(totalCarCost * 0.05);

  const portableCharger = inputs.portableCharger ? 30 : 0;
  const residentialCharger = inputs.residentialCharger ? 300 : 0;
  const extraChargersCost = inputs.extraChargers * 330;
  const additionalAccessoriesCost = roundToCents(Math.max(0, inputs.additionalAccessoriesCost || 0));
  const accessoriesCost = roundToCents(
    portableCharger + residentialCharger + extraChargersCost + additionalAccessoriesCost,
  );

  const cif = roundToCents(totalCarCost + accessoriesCost + inputs.freight);
  const tariffRate = inputs.vehicleType === "electric" ? 0 : inputs.vehicleType === "hybrid" ? 0.1 : 0.25;
  const tariff = roundToCents(cif * tariffRate);

  const subtotal = roundToCents(
    totalCarCost + commission + purchaseManagement + inputs.freight + accessoriesCost + tariff + 250 + 850 + 260,
  );
  const tax = roundToCents(subtotal * 0.07);
  const total = roundToCents(subtotal + tax);
  const deposit30 = roundToCents(total * 0.3);
  const balance70 = roundToCents(total - deposit30);

  return {
    totalCarCost,
    commission,
    purchaseManagement,
    freight: inputs.freight,
    portableCharger,
    residentialCharger,
    extraChargersCost,
    additionalAccessoriesCost,
    accessoriesCost,
    cif,
    tariffRate,
    tariff,
    subtotal,
    tax,
    total,
    deposit30,
    balance70,
  };
}
