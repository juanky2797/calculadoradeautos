export type QuoteInputs = {
  carCost: number;
  carQuantity: number;
  freight: number;
  portableCharger: boolean;
  residentialCharger: boolean;
  extraChargers: number;
};

export type QuoteTotals = {
  totalCarCost: number;
  commission: number;
  freight: number;
  portableCharger: number;
  residentialCharger: number;
  extraChargersCost: number;
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

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function calculateQuote(inputs: QuoteInputs): QuoteTotals {
  const totalCarCost = inputs.carCost * inputs.carQuantity;
  const commission = totalCarCost * 0.05;

  const portableCharger = inputs.portableCharger ? 30 : 0;
  const residentialCharger = inputs.residentialCharger ? 300 : 0;
  const extraChargersCost = inputs.extraChargers * 330;

  const subtotal =
    totalCarCost + commission + inputs.freight + 250 + 850 + 260 + portableCharger + residentialCharger + extraChargersCost;
  const tax = subtotal * 0.07;
  const total = subtotal + tax;
  const deposit30 = total * 0.3;
  const balance70 = total * 0.7;

  return {
    totalCarCost,
    commission,
    freight: inputs.freight,
    portableCharger,
    residentialCharger,
    extraChargersCost,
    subtotal,
    tax,
    total,
    deposit30,
    balance70,
  };
}
