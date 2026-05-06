import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, QrCode } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type FlyerRifa = {
  nome: string;
  descricao: string;
  imagemUrl?: string | null;
  premio?: string | null;
  dataSorteio?: string | null;
  pixChave: string;
  vendidos: number;
  totalBilhetes: number;
  precoBilhete: string;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AdminFlyer({ rifa }: { rifa: FlyerRifa }) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const progresso = useMemo(() => {
    if (!rifa.totalBilhetes) return 0;
    return Math.min(100, Math.round((rifa.vendidos / rifa.totalBilhetes) * 100));
  }, [rifa.totalBilhetes, rifa.vendidos]);

  async function downloadFlyer() {
    if (!flyerRef.current) return;
    setIsExporting(true);
    try {
      const node = flyerRef.current;
      const data = new XMLSerializer().serializeToString(node);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><foreignObject width="100%" height="100%">${data}</foreignObject></svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#120d07";
          ctx.fillRect(0, 0, 1080, 1350);
          ctx.drawImage(image, 0, 0, 1080, 1350);
          const link = document.createElement("a");
          link.download = `flyer-${rifa.nome.toLowerCase().replace(/\s+/g, "-")}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }
        URL.revokeObjectURL(url);
      };
      image.src = url;
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={flyerRef}
        className="overflow-hidden rounded-3xl border border-[#e6d8c0] bg-[radial-gradient(circle_at_top,#5d4326,transparent_40%),linear-gradient(145deg,#120d07,#2a1c0e_45%,#f7f0e4_46%)] p-6 text-white"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-[#f2cf8d]">Rifa Beneficente</p>
        <h3 className="mt-2 text-3xl font-semibold leading-tight">{rifa.nome}</h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">{rifa.descricao}</p>
        <p className="mt-2 text-sm"><strong>Prêmio:</strong> {rifa.premio || "Prêmio da campanha"}</p>
        <p className="mt-1 text-sm"><strong>Data do sorteio:</strong> {rifa.dataSorteio || "A definir"}</p>

        {rifa.imagemUrl ? (
          <img src={rifa.imagemUrl} alt={rifa.nome} className="mt-5 h-56 w-full rounded-2xl object-cover shadow-2xl" />
        ) : null}

        <div className="mt-6 grid gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur md:grid-cols-3">
          <div>
            <p className="text-xs text-white/70">Bilhete</p>
            <p className="text-xl font-semibold">{moeda.format(Number(rifa.precoBilhete))}</p>
          </div>
          <div>
            <p className="text-xs text-white/70">Progresso</p>
            <p className="text-xl font-semibold">{progresso}%</p>
          </div>
          <div>
            <p className="text-xs text-white/70">PIX (chave)</p>
            <p className="truncate text-sm font-semibold">{rifa.pixChave}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-white/80">
            <span>{rifa.vendidos} bilhetes confirmados</span>
            <span>{rifa.totalBilhetes} total</span>
          </div>
          <Progress value={progresso} className="h-3 bg-white/25" />
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs">
          <QrCode className="h-3.5 w-3.5" /> Doe e compartilhe essa campanha
        </div>
      </div>

      <Button className="w-full" onClick={downloadFlyer} disabled={isExporting}>
        <Download className="mr-2 h-4 w-4" /> {isExporting ? "Gerando imagem..." : "Baixar Flyer"}
      </Button>
    </div>
  );
}
