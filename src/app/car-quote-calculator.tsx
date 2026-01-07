"use client";

import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";

import { mimeToJsPdfFormat, normalizeImageUrl } from "@/lib/image";
import { calculateQuote, formatCurrency } from "@/lib/quote";

const defaultConfig = {
  mainTitle: "Calculadora de Importación de Autos",
  subtitle: "Cotización completa de vehículos eléctricos a Panamá",
  companyName: "Shanghai Autos Pty",
  companyPhone: "6937-0170",
  companyEmail: "ventas@shanghai-autospty.com",
  companyAddress: "Centro Comercial Costa Sur - Local 28, Panamá",
  companyWebsite: "shanghai-autospty.com",
  logoUrl: "/logo.png",
} as const;

const pdfPalette = {
  primary: "#000000",
  secondary: "#0c0a0a",
} as const;

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function buildWebsiteHref(website: string) {
  if (!website) return "#";
  if (website.startsWith("http://") || website.startsWith("https://")) return website;
  return `https://${website}/`;
}

export default function CarQuoteCalculator() {
  const [logoLoadError, setLogoLoadError] = useState(false);

  const [carModel, setCarModel] = useState("");
  const [carImage, setCarImage] = useState("");
  const [carImageFile, setCarImageFile] = useState<File | null>(null);
  const [carImageFilePreviewUrl, setCarImageFilePreviewUrl] = useState<string | null>(null);
  const [carImagePreviewError, setCarImagePreviewError] = useState(false);
  const [imageErrorMessage, setImageErrorMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [carDescription, setCarDescription] = useState("");
  const [carQuantity, setCarQuantity] = useState("1");
  const [carCost, setCarCost] = useState("");
  const [packingInfo, setPackingInfo] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [sellerComments, setSellerComments] = useState("");

  const [freight, setFreight] = useState("1300");
  const [portableCharger, setPortableCharger] = useState(false);
  const [residentialCharger, setResidentialCharger] = useState(false);
  const [extraChargers, setExtraChargers] = useState(0);

  useEffect(() => {
    if (!carImageFile) {
      setCarImageFilePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(carImageFile);
    setCarImageFilePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [carImageFile]);

  const carCostNumber = Number.parseFloat(carCost) || 0;
  const carQuantityNumber = Number.parseInt(carQuantity, 10) || 1;
  const freightNumber = Number.parseFloat(freight) || 1300;

  const totals = useMemo(() => {
    return calculateQuote({
      carCost: carCostNumber,
      carQuantity: carQuantityNumber,
      freight: freightNumber,
      portableCharger,
      residentialCharger,
      extraChargers,
    });
  }, [
    carCostNumber,
    carQuantityNumber,
    freightNumber,
    portableCharger,
    residentialCharger,
    extraChargers,
  ]);

  const quantityLabel = carQuantityNumber > 1 ? `(${carQuantityNumber} unidades)` : "";
  const canDownloadPdf = carCostNumber > 0;

  const normalizedCarImageUrl = useMemo(() => normalizeImageUrl(carImage), [carImage]);
  const imageUrlIsInvalid = carImage.trim() !== "" && !normalizedCarImageUrl && !carImageFile;

  const imagePreviewSrc = carImageFilePreviewUrl ?? normalizedCarImageUrl ?? null;
  const showImagePreview = Boolean(imagePreviewSrc) && !carImagePreviewError;

  const blobToDataUrl = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("File read failed"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  };

  const getImageDimensions = (dataUrl: string) => {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    });
  };

  const resolveImageForPdf = async () => {
    if (carImageFile) {
      const format = mimeToJsPdfFormat(carImageFile.type);
      if (!format) throw new Error("Unsupported image type");
      const dataUrl = await blobToDataUrl(carImageFile);
      const { width, height } = await getImageDimensions(dataUrl);
      return { dataUrl, format, width, height };
    }

    if (!normalizedCarImageUrl) return null;

    const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(normalizedCarImageUrl)}`);
    if (!response.ok) throw new Error("Image fetch failed");
    const blob = await response.blob();
    const format = mimeToJsPdfFormat(blob.type);
    if (!format) throw new Error("Unsupported image type");
    const dataUrl = await blobToDataUrl(blob);
    const { width, height } = await getImageDimensions(dataUrl);
    return { dataUrl, format, width, height };
  };

  const onDownloadPdf = async () => {
    if (!canDownloadPdf || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setImageErrorMessage(null);

    try {
      const doc = new jsPDF();

      const primary = hexToRgb(pdfPalette.primary);
      const secondary = hexToRgb(pdfPalette.secondary);

    const currentDate = new Date().toLocaleDateString("es-PA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const companyName = defaultConfig.companyName;
    const companyPhone = defaultConfig.companyPhone;
    const companyEmail = defaultConfig.companyEmail;
    const companyAddress = defaultConfig.companyAddress;
    const companyWebsite = defaultConfig.companyWebsite;

    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, 210, 50, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyAddress, 105, 28, { align: "center" });
    doc.text(`Tel: ${companyPhone} | Email: ${companyEmail}`, 105, 34, { align: "center" });
    doc.text(`Web: ${companyWebsite}`, 105, 40, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("COTIZACIÓN DE IMPORTACIÓN", 105, 65, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${currentDate}`, 105, 73, { align: "center" });

    let yPos = 90;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text("INFORMACIÓN DEL VEHÍCULO", 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const vehicleInfo: Array<[string, string]> = [
      ["Modelo:", carModel || "No especificado"],
      ["Descripción:", carDescription || "N/A"],
      ["Cantidad:", carQuantityNumber.toString()],
      ["Precio Unitario (FOB):", formatCurrency(carCostNumber)],
      ["Precio Total (FOB):", formatCurrency(totals.totalCarCost)],
      ["Embalaje:", packingInfo || "No especificado"],
      ["Tiempo de Entrega:", deliveryTime || "No especificado"],
    ];

    vehicleInfo.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 25, yPos);
      doc.setFont("helvetica", "normal");
      const textLines = doc.splitTextToSize(value, 140);
      doc.text(textLines, 70, yPos);
      yPos += 6 * Math.max(1, textLines.length);
    });

    try {
      const image = await resolveImageForPdf();
      if (image) {
        const maxWidth = 170;
        const maxHeight = 70;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const imgWidth = image.width * scale;
        const imgHeight = image.height * scale;

        if (yPos + imgHeight + 10 > 270) {
          doc.addPage();
          yPos = 30;
        } else {
          yPos += 6;
        }

        const x = 105 - imgWidth / 2;
        doc.addImage(image.dataUrl, image.format, x, yPos, imgWidth, imgHeight);
        yPos += imgHeight;
      }
    } catch {
      setImageErrorMessage("No se pudo incluir la imagen en el PDF. Se generó la cotización sin imagen.");
    }

    yPos += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text("DESGLOSE DE COSTOS", 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const costs: Array<[string, string]> = [
      ["Costo Total del Auto (FOB)", formatCurrency(totals.totalCarCost)],
      ["Comisión (5% sobre FOB)", formatCurrency(totals.commission)],
      ["Flete Marítimo (incluye seguro)", formatCurrency(totals.freight)],
      ["Inspección Técnica", "$250.00"],
      ["Gastos de Llegada", "$850.00"],
      ["Registro y Placa", "$260.00"],
    ];

    if (totals.portableCharger > 0) {
      costs.push(["Cargador Portátil", "$30.00"]);
    }
    if (totals.residentialCharger > 0) {
      costs.push(["Cargador Residencial + Instalación", "$300.00"]);
    }
    if (totals.extraChargersCost > 0) {
      costs.push([`Conjuntos Adicionales (${extraChargers})`, formatCurrency(totals.extraChargersCost)]);
    }

    costs.forEach(([label, value]) => {
      doc.text(label, 25, yPos);
      doc.text(value, 180, yPos, { align: "right" });
      yPos += 7;
    });

    yPos += 3;
    doc.setDrawColor(secondary.r, secondary.g, secondary.b);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text("Subtotal", 25, yPos);
    doc.text(formatCurrency(totals.subtotal), 180, yPos, { align: "right" });

    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("ITBMS (7%)", 25, yPos);
    doc.text(formatCurrency(totals.tax), 180, yPos, { align: "right" });

    yPos += 5;
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(20, yPos, 170, 15, "F");
    yPos += 10;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL A PAGAR", 25, yPos);
    doc.text(formatCurrency(totals.total), 180, yPos, { align: "right" });

    yPos += 18;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text("CONDICIONES DE PAGO", 20, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`30% para Reservar: ${formatCurrency(totals.deposit30)}`, 25, yPos);

    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`70% antes del Embarque: ${formatCurrency(totals.balance70)}`, 25, yPos);

    if (sellerComments) {
      yPos += 12;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text("COMENTARIOS DEL VENDEDOR", 20, yPos);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const commentLines = doc.splitTextToSize(sellerComments, 170);
      commentLines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 30;
        }
        doc.text(line, 25, yPos);
        yPos += 5;
      });
    }

    if (yPos > 240) {
      doc.addPage();
      yPos = 30;
    } else {
      yPos += 12;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text("INCLUYE:", 20, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("✓ Garantía de 2 años o 2,000 km (lo que ocurra primero)", 25, yPos);

    if (totals.portableCharger > 0) {
      yPos += 6;
      doc.text("✓ Cargador Portátil", 25, yPos);
    }
    if (totals.residentialCharger > 0) {
      yPos += 6;
      doc.text("✓ Cargador Residencial con Instalación", 25, yPos);
    }
    if (extraChargers > 0) {
      yPos += 6;
      doc.text(
        `✓ ${extraChargers} Conjunto${extraChargers > 1 ? "s" : ""} Adicional${extraChargers > 1 ? "es" : ""} de Cargadores`,
        25,
        yPos,
      );
    }

    doc.addPage();
    yPos = 30;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text("TÉRMINOS Y CONDICIONES", 20, yPos);

    yPos += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("1. PRECIO:", 20, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    const terms1 = [
      "• La comisión del 5% se calcula sobre el precio FOB del vehículo",
      "• Validez de precios: 15 días desde la fecha de emisión",
      "• El flete marítimo varía según tamaño y disponibilidad de embarque",
      "• Incluye: costo del producto, documentos de exportación, embalaje,",
      "  despacho de aduana y gastos de salida en origen",
      "• El seguro cubre solo el embalaje, no pérdida o daño de mercancía",
    ];
    terms1.forEach((line) => {
      doc.text(line, 23, yPos);
      yPos += 4.5;
    });

    yPos += 3;
    doc.setFont("helvetica", "bold");
    doc.text("2. CONDICIONES DE PAGO:", 20, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    const terms2 = [
      "• 30% para reservar y confirmar la orden",
      "• 70% antes del embarque",
      "• Control de calidad según estándar AQL para cada envío",
      "• Si el comprador no paga dentro de 30 días del informe de inspección",
      "  aprobado, se perderá el depósito y se podrá revender la mercancía",
    ];
    terms2.forEach((line) => {
      doc.text(line, 23, yPos);
      yPos += 4.5;
    });

    yPos += 3;
    doc.setFont("helvetica", "bold");
    doc.text("3. RESPONSABILIDADES:", 20, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    const terms3 = [
      "• El proveedor es responsable del despacho de aduana en origen",
      "• El proveedor NO es responsable de daños o retrasos durante",
      "  el transporte internacional",
      "• El cliente es completamente responsable del despacho de aduana",
      "  en destino y sus costos asociados",
    ];
    terms3.forEach((line) => {
      doc.text(line, 23, yPos);
      yPos += 4.5;
    });

    yPos += 3;
    doc.setFont("helvetica", "bold");
    doc.text("4. GARANTÍA Y RECLAMOS:", 20, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    const terms4 = [
      "• Garantía: 2 años o 2,000 km (lo que ocurra primero)",
      "• Cualquier reclamo debe hacerse directamente al proveedor dentro",
      "  de 48 horas después de recibir el producto",
      "• No hay garantías adicionales más allá de las contenidas en esta",
      "  factura proforma",
    ];
    terms4.forEach((line) => {
      doc.text(line, 23, yPos);
      yPos += 4.5;
    });

    yPos += 3;
    doc.setFont("helvetica", "bold");
    doc.text("5. TRANSFERENCIAS INTERNACIONALES:", 20, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    const terms5 = [
      "• El comprador debe enviar comprobante bancario y número Swift",
      "• Si el banco beneficiario lo requiere, el comprador debe probar",
      "  el origen de los fondos transferidos",
    ];
    terms5.forEach((line) => {
      doc.text(line, 23, yPos);
      yPos += 4.5;
    });

    yPos += 3;
    doc.setFont("helvetica", "bold");
    doc.text("6. LEY APLICABLE:", 20, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text("• Este acuerdo se rige por las leyes de Panamá", 23, yPos);
    yPos += 4.5;
    doc.text("• Jurisdicción: tribunales competentes de Panamá", 23, yPos);

    yPos = 270;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Cotización válida por 15 días. Para más información, contáctenos.", 105, yPos, {
      align: "center",
    });
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`${companyName} | Tel: ${companyPhone} | ${companyEmail}`, 105, yPos, { align: "center" });

    doc.save(`Cotizacion_${companyName.replace(/\\s+/g, "_")}_${Date.now()}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="calculator-wrapper">
      <div className="calculator-container">
        <header className="header">
          <div className="company-info">
            <div className="company-logo">
              {!logoLoadError ? (
                <img
                  src={defaultConfig.logoUrl}
                  alt="Shanghai Autos Logo"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                "SPTY"
              )}
            </div>
            <div className="company-details">
              <h2 className="company-name">{defaultConfig.companyName}</h2>
              <div className="company-contact">
                📍 <span>{defaultConfig.companyAddress}</span>
                <br />
                📞 <span>{defaultConfig.companyPhone}</span> | ✉️{" "}
                <a href={`mailto:${defaultConfig.companyEmail}`}>{defaultConfig.companyEmail}</a>
                <br />
                🌐{" "}
                <a
                  href={buildWebsiteHref(defaultConfig.companyWebsite)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {defaultConfig.companyWebsite}
                </a>
              </div>
            </div>
          </div>

          <h1>{defaultConfig.mainTitle}</h1>
          <p>{defaultConfig.subtitle}</p>
        </header>

        <main className="calculator-body">
          <div className="input-section">
            <h2 className="section-title">🚗 Datos del Vehículo</h2>

            <div className="input-group">
              <label htmlFor="car-model">Nombre del Modelo</label>
              <input
                type="text"
                id="car-model"
                placeholder="Ejemplo: BYD Seal 2024"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="car-image">Imagen del Vehículo (URL)</label>
              <input
                type="text"
                id="car-image"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={carImage}
                onChange={(e) => {
                  setCarImage(e.target.value);
                  setCarImagePreviewError(false);
                  setImageErrorMessage(null);
                }}
              />

              <label htmlFor="car-image-file">Adjuntar imagen (archivo)</label>
              <input
                type="file"
                id="car-image-file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith("image/")) {
                    setImageErrorMessage("El archivo seleccionado no es una imagen.");
                    return;
                  }
                  setCarImageFile(file);
                  setCarImagePreviewError(false);
                  setImageErrorMessage(null);
                }}
              />

              {carImageFile ? (
                <div className="file-meta">
                  <span className="file-name">{carImageFile.name}</span>
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={() => {
                      setCarImageFile(null);
                      setCarImagePreviewError(false);
                      setImageErrorMessage(null);
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ) : null}

              {imageUrlIsInvalid ? <div className="error-note">URL inválida. Usa un enlace completo (https://...)</div> : null}
              {imageErrorMessage ? <div className="error-note">{imageErrorMessage}</div> : null}

              {showImagePreview ? (
                <div className="image-preview">
                  <img
                    src={imagePreviewSrc ?? ""}
                    alt="Vista previa"
                    onError={() => {
                      setCarImagePreviewError(true);
                      setImageErrorMessage("No se pudo cargar la imagen. Verifica la URL o el archivo.");
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="input-group">
              <label htmlFor="car-description">Descripción del Vehículo</label>
              <textarea
                id="car-description"
                rows={4}
                placeholder="Características principales, color, especificaciones técnicas..."
                value={carDescription}
                onChange={(e) => setCarDescription(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="car-quantity">Cantidad</label>
              <input
                type="number"
                id="car-quantity"
                min={1}
                step={1}
                value={carQuantity}
                onChange={(e) => setCarQuantity(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="car-cost">Precio Unitario (USD FOB)</label>
              <input
                type="number"
                id="car-cost"
                placeholder="Ejemplo: 35000"
                min={0}
                step={100}
                value={carCost}
                onChange={(e) => setCarCost(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="packing-info">Información de Embalaje</label>
              <input
                type="text"
                id="packing-info"
                placeholder="Ejemplo: Contenedor 40' HC"
                value={packingInfo}
                onChange={(e) => setPackingInfo(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="delivery-time">Tiempo de Entrega</label>
              <input
                type="text"
                id="delivery-time"
                placeholder="Ejemplo: 45-60 días"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="seller-comments">Comentarios del Vendedor</label>
              <textarea
                id="seller-comments"
                rows={4}
                placeholder="Notas adicionales, promociones especiales, condiciones particulares..."
                value={sellerComments}
                onChange={(e) => setSellerComments(e.target.value)}
              />
            </div>
          </div>

          <div className="input-section">
            <h2 className="section-title">🚢 Costos de Importación</h2>

            <div className="input-group">
              <label htmlFor="freight">Flete Marítimo (incluye seguro) (USD)</label>
              <input
                type="number"
                id="freight"
                min={1300}
                max={2000}
                step={50}
                value={freight}
                onChange={(e) => setFreight(e.target.value)}
              />
              <div className="range-display">
                <span>Desde: $1,300</span> <span>Hasta: $2,000</span>
              </div>
              <div className="info-note info-note-freight">ℹ️ El flete varía según tamaño del vehículo y disponibilidad</div>
            </div>
          </div>

          <div className="input-section">
            <h2 className="section-title">📋 Costos Fijos</h2>

            <div className="input-group">
              <label>Inspección Técnica</label>
              <input type="number" value={250} readOnly className="readonly-input" />
            </div>

            <div className="input-group">
              <label>Gastos de Llegada (Puerto a Chilibre)</label>
              <input type="number" value={850} readOnly className="readonly-input" />
            </div>

            <div className="input-group">
              <label>Registro y Placa en Panamá</label>
              <input type="number" value={260} readOnly className="readonly-input" />
            </div>
          </div>

          <div className="input-section">
            <h2 className="section-title">🔌 Cargadores Opcionales</h2>

            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={portableCharger}
                onChange={(e) => setPortableCharger(e.target.checked)}
              />
              <span>Cargador Portátil ($30)</span>
            </label>

            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={residentialCharger}
                onChange={(e) => setResidentialCharger(e.target.checked)}
              />
              <span>Cargador Residencial + Instalación ($300)</span>
            </label>

            <div className="charger-counter">
              <button
                type="button"
                className="counter-btn"
                aria-label="Disminuir cargadores"
                onClick={() => setExtraChargers((n) => Math.max(0, n - 1))}
              >
                −
              </button>
              <div className="counter-value" aria-live="polite">
                {extraChargers}
              </div>
              <div className="counter-label">Conjuntos Adicionales de Cargadores ($330 c/u)</div>
              <button
                type="button"
                className="counter-btn"
                aria-label="Aumentar cargadores"
                onClick={() => setExtraChargers((n) => n + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="summary-section">
            <h3 className="summary-title">💰 Resumen de Costos</h3>

            <div className="cost-row">
              <span className="cost-label">
                Costo del Auto (FOB) <span>{quantityLabel}</span>
              </span>{" "}
              <span className="cost-value">{formatCurrency(totals.totalCarCost)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Comisión (5% sobre FOB)</span>{" "}
              <span className="cost-value">{formatCurrency(totals.commission)}</span>
            </div>
            <div className="cost-row freight-cost-row">
              <span className="cost-label">Flete Marítimo (incluye seguro)</span>{" "}
              <span className="cost-value">{formatCurrency(totals.freight)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Inspección Técnica en Origen</span> <span className="cost-value">$250.00</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Gastos de Llegada</span> <span className="cost-value">$850.00</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Registro y Placa</span> <span className="cost-value">$260.00</span>
            </div>

            {totals.portableCharger > 0 ? (
              <div className="cost-row">
                <span className="cost-label">Cargador Portátil</span> <span className="cost-value">$30.00</span>
              </div>
            ) : null}

            {totals.residentialCharger > 0 ? (
              <div className="cost-row">
                <span className="cost-label">Cargador Residencial + Instalación</span> <span className="cost-value">$300.00</span>
              </div>
            ) : null}

            {extraChargers > 0 ? (
              <div className="cost-row">
                <span className="cost-label">Conjuntos Adicionales</span>{" "}
                <span className="cost-value">{formatCurrency(totals.extraChargersCost)}</span>
              </div>
            ) : null}

            <div className="cost-row subtotal-row">
              <span className="cost-label">Subtotal</span> <span className="cost-value">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">ITBMS (7%)</span> <span className="cost-value">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="total-row">
              <span className="total-label">TOTAL A PAGAR</span> <span className="total-value">{formatCurrency(totals.total)}</span>
            </div>

            <div className="info-note info-note-payment">
              💵 <strong>Condiciones de Pago:</strong>
              <br />• 30% para reservar: <span>{formatCurrency(totals.deposit30)}</span>
              <br />• 70% antes del embarque: <span>{formatCurrency(totals.balance70)}</span>
            </div>

            <button
              className="download-btn"
              id="download-pdf"
              disabled={!canDownloadPdf || isGeneratingPdf}
              aria-busy={isGeneratingPdf}
              onClick={onDownloadPdf}
            >
              📄 Descargar Cotización en PDF
            </button>

            <div className="info-note">
              ℹ️ <strong>Garantía:</strong> 2 años o 2,000 km (lo que ocurra primero)
              <br />
              <strong>Validez:</strong> 15 días • <strong>Incluye:</strong> Documentos de exportación, embalaje, despacho de aduana en origen
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
