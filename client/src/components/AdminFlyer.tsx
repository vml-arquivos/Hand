import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

export function AdminFlyer({ rifa }: { rifa: FlyerRifa }) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // URL pública da rifa para o QR Code
  const rifaUrl = useMemo(() => {
    const base = window.location.origin;
    const slug = rifa.slug ?? "rifa-beneficente";
    return `${base}/rifa/${slug}`;
  }, [rifa.slug]);

  const progresso = useMemo(() => {
    if (!rifa.totalBilhetes) return 0;
    return Math.min(100, Math.round((rifa.vendidos / rifa.totalBilhetes) * 100));
  }, [rifa.totalBilhetes, rifa.vendidos]);

  // Gera QR Code da URL da rifa
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
    if (!flyerRef.current) return;
    setIsExporting(true);
    try {
      // Importação dinâmica do html2canvas para não aumentar o bundle inicial
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#120d07",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `flyer-${rifa.nome.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Flyer baixado com sucesso!");
    } catch {
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
        <h3 style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1.25, marginTop: "8px", marginBottom: 0 }}>
          {rifa.nome}
        </h3>
        <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.85)", marginTop: "10px", maxWidth: "560px" }}>
          {rifa.descricao}
        </p>

        {/* Imagem da rifa */}
        {rifa.imagemUrl && (
          <img
            src={rifa.imagemUrl}
            alt={rifa.nome}
            crossOrigin="anonymous"
            style={{
              marginTop: "16px",
              width: "100%",
              height: "220px",
              objectFit: "cover",
              borderRadius: "16px",
              display: "block",
            }}
          />
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
            <p style={{ fontSize: "20px", fontWeight: 700, margin: "2px 0 0" }}>
              {moeda.format(Number(rifa.precoBilhete))}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", margin: 0 }}>Sorteio</p>
            <p style={{ fontSize: "14px", fontWeight: 600, margin: "2px 0 0" }}>
              {formatarData(rifa.dataSorteio)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", margin: 0 }}>Prêmio</p>
            <p style={{ fontSize: "13px", fontWeight: 600, margin: "2px 0 0", lineHeight: 1.3 }}>
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
            <div style={{ background: "#f2cf8d", height: "100%", width: `${progresso}%`, borderRadius: "99px" }} />
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
          {/* QR Code */}
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
          {/* Texto CTA */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#f2cf8d" }}>
              Escaneie e participe!
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", margin: "4px 0 0", lineHeight: 1.4 }}>
              Aponte a câmera do celular para o QR Code ou acesse o link abaixo para comprar seu bilhete.
            </p>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#f2cf8d", margin: "6px 0 0", wordBreak: "break-all" }}>
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
          {isExporting ? "Gerando..." : "Baixar Imagem"}
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
