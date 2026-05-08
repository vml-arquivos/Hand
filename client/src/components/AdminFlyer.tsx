import { Button } from "@/components/ui/button";
import { Download, ExternalLink, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type FlyerRifa = {
  nome: string;
  descricao: string;
  imagemUrl?: string | null;
  premio?: string | null;
  dataSorteio?: string | null;
  pixChave: string;
  vendidos: number;
  totalBilhetes: number;
  precoBilhete: string;
  slug?: string | null;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarData(data?: string | null) {
  if (!data) return "A definir";
  const d = new Date(data);
  if (isNaN(d.getTime())) return data;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Carrega uma imagem como base64 via proxy do servidor para evitar CORS */
async function carregarImagemBase64(url: string): Promise<string | null> {
  try {
    // Tenta carregar diretamente primeiro (funciona para /uploads/ local)
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Gera o flyer como PNG usando Canvas API nativa — sem dependência de html2canvas */
async function gerarFlyerCanvas(params: {
  nome: string;
  descricao: string;
  premio: string;
  dataSorteio: string;
  precoBilhete: string;
  vendidos: number;
  totalBilhetes: number;
  imagemBase64: string | null;
  qrDataUrl: string;
  rifaUrl: string;
}): Promise<string> {
  const W = 800;
  const H = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Fundo gradiente
  const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
  grad.addColorStop(0, "#120d07");
  grad.addColorStop(0.45, "#2a1c0e");
  grad.addColorStop(1, "#1a0f06");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  let y = 40;

  // Label topo
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillStyle = "#f2cf8d";
  ctx.letterSpacing = "4px";
  ctx.fillText("RIFA BENEFICENTE", 40, y);
  ctx.letterSpacing = "0px";
  y += 16;

  // Linha decorativa
  ctx.strokeStyle = "#f2cf8d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(W - 40, y);
  ctx.stroke();
  y += 24;

  // Título
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  const maxW = W - 80;
  // Quebra de linha automática para o título
  const palavras = params.nome.split(" ");
  let linha = "";
  for (const palavra of palavras) {
    const teste = linha ? `${linha} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > maxW && linha) {
      ctx.fillText(linha, 40, y);
      y += 44;
      linha = palavra;
    } else {
      linha = teste;
    }
  }
  if (linha) { ctx.fillText(linha, 40, y); y += 44; }
  y += 8;

  // Descrição
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const descPalavras = params.descricao.split(" ");
  let descLinha = "";
  let descLinhas = 0;
  for (const p of descPalavras) {
    if (descLinhas >= 3) break;
    const t = descLinha ? `${descLinha} ${p}` : p;
    if (ctx.measureText(t).width > maxW && descLinha) {
      ctx.fillText(descLinha, 40, y);
      y += 22;
      descLinha = p;
      descLinhas++;
    } else {
      descLinha = t;
    }
  }
  if (descLinha && descLinhas < 3) { ctx.fillText(descLinha, 40, y); y += 22; }
  y += 16;

  // Imagem da rifa
  if (params.imagemBase64) {
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = params.imagemBase64!;
      });
      const imgH = 220;
      // Arredondamento de cantos via clip
      ctx.save();
      ctx.beginPath();
      const r = 16;
      ctx.moveTo(40 + r, y);
      ctx.lineTo(W - 40 - r, y);
      ctx.quadraticCurveTo(W - 40, y, W - 40, y + r);
      ctx.lineTo(W - 40, y + imgH - r);
      ctx.quadraticCurveTo(W - 40, y + imgH, W - 40 - r, y + imgH);
      ctx.lineTo(40 + r, y + imgH);
      ctx.quadraticCurveTo(40, y + imgH, 40, y + imgH - r);
      ctx.lineTo(40, y + r);
      ctx.quadraticCurveTo(40, y, 40 + r, y);
      ctx.closePath();
      ctx.clip();

      const boxX = 40;
      const boxY = y;
      const boxW = W - 80;
      const boxH = imgH;
      ctx.fillStyle = "#1f160d";
      ctx.fillRect(boxX, boxY, boxW, boxH);
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = boxX + (boxW - drawW) / 2;
      const drawY = boxY + (boxH - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
      y += imgH + 20;
    } catch {
      // Imagem falhou — continua sem ela
    }
  }

  // Cards de info (Bilhete | Sorteio | Prêmio)
  const cardY = y;
  const cardH = 80;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.roundRect(40, cardY, W - 80, cardH, 16);
  ctx.fill();

  const cols = [40 + 20, 40 + (W - 80) / 3 + 20, 40 + (2 * (W - 80)) / 3 + 20];
  const labels = ["Bilhete", "Sorteio", "Prêmio"];
  const values = [
    moeda.format(Number(params.precoBilhete)),
    formatarData(params.dataSorteio),
    params.premio || "Prêmio da campanha",
  ];

  for (let i = 0; i < 3; i++) {
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(labels[i], cols[i], cardY + 24);
    ctx.font = i === 0 ? "bold 22px system-ui, sans-serif" : "bold 15px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    // Truncar texto longo para o prêmio
    let val = values[i];
    const maxColW = (W - 80) / 3 - 30;
    while (ctx.measureText(val).width > maxColW && val.length > 4) {
      val = val.slice(0, -1);
    }
    if (val !== values[i]) val += "…";
    ctx.fillText(val, cols[i], cardY + 52);
  }
  y = cardY + cardH + 16;

  // Barra de progresso
  const prog = params.totalBilhetes > 0
    ? Math.min(100, Math.round((params.vendidos / params.totalBilhetes) * 100))
    : 0;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(`${params.vendidos} bilhetes confirmados`, 40, y);
  ctx.fillText(`${prog}% vendido`, W - 40 - ctx.measureText(`${prog}% vendido`).width, y);
  y += 10;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.roundRect(40, y, W - 80, 8, 4);
  ctx.fill();
  if (prog > 0) {
    ctx.fillStyle = "#f2cf8d";
    ctx.beginPath();
    ctx.roundRect(40, y, Math.max(8, (W - 80) * prog / 100), 8, 4);
    ctx.fill();
  }
  y += 24;

  // Rodapé: QR Code + CTA
  const rodapeH = 120;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(40, y, W - 80, rodapeH, 16);
  ctx.fill();
  ctx.stroke();

  // QR Code
  if (params.qrDataUrl) {
    try {
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject();
        qrImg.src = params.qrDataUrl;
      });
      ctx.fillStyle = "#fffbf5";
      ctx.beginPath();
      ctx.roundRect(56, y + 16, 88, 88, 8);
      ctx.fill();
      ctx.drawImage(qrImg, 60, y + 20, 80, 80);
    } catch { /* ignora */ }
  }

  // Texto CTA
  const ctaX = 40 + 104 + 16;
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillStyle = "#f2cf8d";
  ctx.fillText("Escaneie e participe!", ctaX, y + 36);
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Aponte a câmera para o QR Code ou acesse:", ctaX, y + 58);
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.fillStyle = "#f2cf8d";
  // Truncar URL se necessário
  let urlText = params.rifaUrl;
  const maxUrlW = W - 40 - ctaX - 10;
  while (ctx.measureText(urlText).width > maxUrlW && urlText.length > 10) {
    urlText = urlText.slice(0, -1);
  }
  ctx.fillText(urlText, ctaX, y + 80);

  return canvas.toDataURL("image/png", 0.95);
}

export function AdminFlyer({ rifa }: { rifa: FlyerRifa }) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const rifaUrl = useMemo(() => {
    const base = window.location.origin;
    const slug = rifa.slug ?? "rifa-beneficente";
    return `${base}/rifa/${slug}`;
  }, [rifa.slug]);

  const progresso = useMemo(() => {
    if (!rifa.totalBilhetes) return 0;
    return Math.min(100, Math.round((rifa.vendidos / rifa.totalBilhetes) * 100));
  }, [rifa.totalBilhetes, rifa.vendidos]);

  useEffect(() => {
    QRCode.toDataURL(rifaUrl, {
      margin: 1,
      width: 180,
      color: { dark: "#120d07", light: "#fffbf5" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [rifaUrl]);

  async function downloadFlyer() {
    setIsExporting(true);
    try {
      // Carrega imagem da rifa como base64 para evitar CORS no canvas
      let imagemBase64: string | null = null;
      if (rifa.imagemUrl) {
        imagemBase64 = await carregarImagemBase64(rifa.imagemUrl);
      }

      const dataUrl = await gerarFlyerCanvas({
        nome: rifa.nome,
        descricao: rifa.descricao,
        premio: rifa.premio || "",
        dataSorteio: rifa.dataSorteio || "",
        precoBilhete: rifa.precoBilhete,
        vendidos: rifa.vendidos,
        totalBilhetes: rifa.totalBilhetes,
        imagemBase64,
        qrDataUrl,
        rifaUrl,
      });

      const link = document.createElement("a");
      link.download = `flyer-${rifa.nome.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Flyer baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar flyer:", err);
      toast.error("Erro ao gerar imagem. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(rifaUrl);
      toast.success("Link copiado! Compartilhe com seus contatos.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Prévia do flyer */}
      <div
        ref={flyerRef}
        className="overflow-hidden rounded-3xl"
        style={{
          background: "linear-gradient(145deg, #120d07 0%, #2a1c0e 45%, #1a0f06 100%)",
          padding: "28px",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Topo: label + título */}
        <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#f2cf8d", margin: 0 }}>
          Rifa Beneficente
        </p>
        <h3 style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700, lineHeight: 1.25, marginTop: "8px", marginBottom: 0 }}>
          {rifa.nome}
        </h3>
        <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.85)", marginTop: "10px", maxWidth: "560px" }}>
          {rifa.descricao}
        </p>

        {/* Imagem da rifa */}
        {rifa.imagemUrl && (
          <div style={{ marginTop: "16px", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: "16px" }}>
            <img
              src={rifa.imagemUrl}
              alt={rifa.nome}
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#1f160d" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}

        {/* Info cards */}
        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", margin: 0 }}>Bilhete</p>
            <p style={{ fontSize: "clamp(16px, 3vw, 20px)", fontWeight: 700, margin: "2px 0 0" }}>
              {moeda.format(Number(rifa.precoBilhete))}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", margin: 0 }}>Sorteio</p>
            <p style={{ fontSize: "13px", fontWeight: 600, margin: "2px 0 0" }}>
              {formatarData(rifa.dataSorteio)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", margin: 0 }}>Prêmio</p>
            <p style={{ fontSize: "12px", fontWeight: 600, margin: "2px 0 0", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {rifa.premio || "Prêmio da campanha"}
            </p>
          </div>
        </div>

        {/* Progresso */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.75)", marginBottom: "6px" }}>
            <span>{rifa.vendidos} bilhetes confirmados</span>
            <span>{progresso}% vendido</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "99px", height: "8px", overflow: "hidden" }}>
            <div style={{ background: "#f2cf8d", height: "100%", width: `${progresso}%`, borderRadius: "99px", transition: "width 0.5s ease" }} />
          </div>
        </div>

        {/* Rodapé: QR Code + CTA */}
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "16px",
            padding: "14px 16px",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div style={{ flexShrink: 0 }}>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                style={{ width: "80px", height: "80px", borderRadius: "8px", background: "#fffbf5", padding: "4px" }}
              />
            ) : (
              <div style={{ width: "80px", height: "80px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <QrCode size={32} color="rgba(255,255,255,0.4)" />
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#f2cf8d" }}>
              Escaneie e participe!
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", margin: "4px 0 0", lineHeight: 1.4 }}>
              Aponte a câmera do celular para o QR Code ou acesse o link abaixo.
            </p>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#f2cf8d", margin: "6px 0 0", wordBreak: "break-all", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {rifaUrl}
            </p>
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          className="h-11 bg-[#21180f] text-white hover:bg-[#3d2e1e]"
          onClick={downloadFlyer}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Gerando imagem..." : "Baixar Imagem"}
        </Button>
        <Button
          variant="outline"
          className="h-11 border-[#d5b078] text-[#593b1f] hover:bg-[#f4dfbc]"
          onClick={copiarLink}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Copiar Link
        </Button>
        <a
          href={rifaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d5b078] px-4 text-sm font-medium text-[#593b1f] transition hover:bg-[#f4dfbc]"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir Rifa
        </a>
      </div>

      {/* Instrução */}
      <p className="text-center text-xs text-[#9b6b35]">
        Baixe a imagem e compartilhe no WhatsApp, Instagram ou qualquer rede social. Quem receber pode escanear o QR Code ou clicar no link para comprar o bilhete diretamente.
      </p>
    </div>
  );
}
