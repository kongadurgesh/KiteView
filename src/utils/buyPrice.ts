export function calculateBuyPrice(candle3Close: number): number {
  return parseFloat((0.98 * candle3Close).toFixed(2));
}

export function calculateBuyTriggerPrice(candle3Close: number): number {
  return parseFloat((0.985 * candle3Close).toFixed(2));
}
