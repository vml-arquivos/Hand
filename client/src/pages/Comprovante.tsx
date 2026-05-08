import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock3,
  Copy,
  HeartHandshake,
  Loader2,
  Printer,
  QrCode,
  XCircle,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Comprovante() {
  const [, params] = useRoute("/comprovante/:codigo");
  const codigo = params?.codigo ?? "";
  const { data, isLoading } = trpc.rifa.comprovante.useQuery(
    { codigo },
    { enabled: Boolean(codigo) },
  );
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!data?.rifa.pixCopiaCola) return;
    QRCode.toDataURL(data.rifa.pixCopiaCola, {
      margin: 1,
      width: 280,
      color: { dark: "#21180f", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [data?.rifa.pixCopiaCola]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#8a5a2b]" />
          <p className="text-sm text-[#8a5a2b]">Carregando comprovante...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-xl font-semibold text-[#2e2013]">Comprovante não encontrado</h1>
          <p className="mt-2 text-sm text-[#7a5a3a]">Verifique o código e tente novamente.</p>
          <a href="/" className="mt-4 inline-block text-sm text-[#a06a31] underline">
            Voltar para a rifa
          </a>
        </div>
      </main>
    );
  }

  const status = data.pedido.status;

  return (
    <main className="min-h-screen bg-[#f7f1e8] py-6 text-[#22180e] print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4">
        {/* Ações */}
        <div className="mb-5 flex items-center justify-between print:hidden">
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#593b1f] hover:underline"
          >
            <HeartHandshake className="h-4 w-4" />
            Voltar para a rifa
          </a>
          <Button
            onClick={() => window.print()}
            className="bg-[#2b2116] text-white hover:bg-[#3d2e1e]"
            size="sm"
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Salvar / Imprimir
          </Button>
        </div>

        <Card className="overflow-hidden border-0 shadow-2xl print:shadow-none">
          {/* Header */}
          <div className="bg-[#21180f] px-6 py-6 text-white">
            <p className="text-xs font-medium uppercase tracking-widest text-[#e5c07b]">
              Comprovante de rifa
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">
              Pedido {data.pedido.codigo}
            </h1>
            <p className="mt-1 text-sm text-[#c9a87c]">{data.rifa.nome}</p>
          </div>

          <CardContent className="space-y-6 p-5 sm:p-7">
            {/* Status e valor */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Status do pedido</p>
                <Badge
                  className={`mt-1.5 gap-1.5 px-3 py-1 text-sm ${
                    status === "confirmado"
                      ? "bg-green-100 text-green-800"
                      : status === "cancelado"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {status === "confirmado" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : status === "cancelado" ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <Clock3 className="h-4 w-4" />
                  )}
                  {status === "confirmado"
                    ? "Confirmado"
                    : status === "cancelado"
                      ? "Cancelado"
                      : "Aguardando pagamento"}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Valor total</p>
                <strong className="text-2xl font-bold text-[#1a0f06] sm:text-3xl">
                  {moeda.format(Number(data.pedido.valorTotal))}
                </strong>
              </div>
            </div>

            <Separator className="bg-[#ecdcc5]" />

            {/* Dados do comprador e da rifa */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#faf3e7] p-4">
                <h2 className="mb-3 font-semibold text-[#1a0f06]">Comprador</h2>
                <div className="space-y-1 text-sm text-[#493624]">
                  <p className="font-medium">{data.comprador.nome}</p>
                  <p>{data.comprador.telefone}</p>
                  {data.comprador.email && <p>{data.comprador.email}</p>}
                </div>
              </div>
              <div className="rounded-2xl bg-[#faf3e7] p-4">
                <h2 className="mb-3 font-semibold text-[#1a0f06]">Pedido</h2>
                <div className="space-y-1 text-sm text-[#493624]">
                  <p>{data.pedido.quantidade} bilhete(s)</p>
                  <p>{moeda.format(Number(data.rifa.precoBilhete))} cada</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(data.pedido.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>

            {/* Pagamento Pix — apenas para pedidos pendentes */}
            {status === "pendente" && (
              <div className="rounded-2xl border border-dashed border-[#b78a50] bg-[#fffaf2] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-[#a06a31]" />
                  <h2 className="text-lg font-bold text-[#1a0f06]">Pagamento via Pix</h2>
                </div>
                <p className="mb-4 text-sm text-[#7a5a3a]">
                  Escaneie o QR Code ou copie o código Pix abaixo. Após o pagamento, aguarde a
                  confirmação manual pelo administrador.
                </p>
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  {qr && (
                    <div className="shrink-0">
                      <img
                        src={qr}
                        alt="QR Code Pix"
                        className="h-44 w-44 rounded-2xl bg-white p-3 shadow-md sm:h-48 sm:w-48"
                      />
                    </div>
                  )}
                  <div className="w-full min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#9b6b35]">
                        Pix Copia e Cola
                      </p>
                      <div className="rounded-xl bg-white p-3 font-mono text-xs break-all text-[#493624] shadow-sm">
                        {data.rifa.pixCopiaCola}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-[#d5b078] text-[#5b3a1c] hover:bg-[#f4dfbc]"
                      onClick={() => {
                        navigator.clipboard.writeText(data.rifa.pixCopiaCola);
                        toast.success("Pix copiado!");
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Pix Copia e Cola
                    </Button>
                    <p className="text-xs text-[#9b6b35]">✓ QR Code estático — não expira</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bilhetes */}
            <div>
              <h2 className="mb-3 text-lg font-bold text-[#1a0f06]">
                Seus bilhetes ({data.bilhetes.length})
              </h2>
              {data.bilhetes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.bilhetes.map((b: any) => (
                    <span
                      key={b.id}
                      className="rounded-full bg-[#21180f] px-4 py-2 font-mono text-sm font-bold text-white"
                    >
                      {String(b.numero).padStart(4, "0")}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-900">
                    Os números serão gerados somente após a confirmação manual do pagamento pelo
                    administrador.
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="rounded-xl bg-[#f7f1e8] px-4 py-3 text-center text-xs text-[#9b6b35]">
              Guarde este comprovante. Código:{" "}
              <strong className="font-semibold">{data.pedido.codigo}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
