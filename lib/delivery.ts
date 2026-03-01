export function resolveDeliveryDate(deliveryType: "TODAY" | "TOMORROW" | "CUSTOM", deliveryDate?: string) {
  const date = new Date();

  if (deliveryType === "TOMORROW") {
    date.setDate(date.getDate() + 1);
  }

  if (deliveryType === "CUSTOM") {
    if (!deliveryDate) throw new Error("Aniq sana kiriting");
    const parsed = new Date(deliveryDate);
    if (Number.isNaN(parsed.getTime())) throw new Error("Sana noto'g'ri");
    return parsed;
  }

  return date;
}
