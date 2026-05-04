import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, Copy, Loader2, Printer, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useRoute } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Comprovante() {
  const [, params] = useRoute("/comprovante/:codigo");
  const codigo = params?.codigo ?? "";
  const { data, isLoading } = trpc.rifa.comprovante.useQuery({ codigo }, { enabled: Boolean(codigo) });
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!data?.rifa.pixCopiaCola) return;
    QRCode.toDataURL(data.rifa.pixCopiaCola, { margin: 1, width: 260 }).then(setQr);
  }, [data?.rifa.pixCopiaCola]);

  if (isLoading) return <main className="min-h-screen grid place-items-center bg-[#f7f1e8]"><Loader2 className="h-8 w-8 animate-spin text-[#8a5a2b]" /></main>;
  if (!data) return <main className="min-h-screen grid place-items-center"><p>Comprovante não encontrado.</p></main>;

  const status = data.pedido.status;
  const Icon = status === "confirmado" ? CheckCircle2 : status === "cancelado" ? XCircle : Clock3;

  return (
    <main className="min-h-screen bg-[#f7f1e8] py-8 text-[#22180e] print:bg-white print:py-0">
      <section className="container max-w-4xl">
        <div className="mb-5 flex items-center justify-between print:hidden"><a href="/" className="text-sm underline">Voltar para a rifa</a><Button onClick={() => window.print()} className="bg-[#2b2116]"><Printer className="mr-2 h-4 w-4" /> Imprimir / salvar PDF</Button></div>
        <Card className="overflow-hidden border-0 shadow-2xl print:shadow-none">
          <div className="bg-[#21180f] p-8 text-white"><p className="text-sm uppercase tracking-[0.25em] text-[#e5c07b]">Comprovante de rifa</p><h1 className="mt-2 text-3xl font-semibold">Pedido {data.pedido.codigo}</h1></div>
          <CardContent className="space-y-7 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-sm text-muted-foreground">Status do pedido</p><Badge className="mt-2 gap-2 px-3 py-1 text-sm" variant={status === "cancelado" ? "destructive" : "default"}><Icon className="h-4 w-4" /> {status}</Badge></div>
              <div className="text-right"><p className="text-sm text-muted-foreground">Valor total</p><strong className="text-3xl">{moeda.format(Number(data.pedido.valorTotal))}</strong></div>
            </div>
            <Separator />
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl bg-[#faf3e7] p-5"><h2 className="font-semibold">Comprador</h2><p className="mt-3">{data.comprador.nome}</p><p>{data.comprador.telefone}</p><p>{data.comprador.email || "E-mail não informado"}</p></div>
              <div className="rounded-2xl bg-[#faf3e7] p-5"><h2 className="font-semibold">Rifa</h2><p className="mt-3">{data.rifa.nome}</p><p>{data.pedido.quantidade} bilhete(s)</p><p>Criado em {new Date(data.pedido.createdAt).toLocaleString("pt-BR")}</p></div>
            </div>
            {status === "pendente" ? (
              <div className="grid gap-5 rounded-3xl border border-dashed border-[#b78a50] bg-[#fffaf2] p-5 md:grid-cols-[auto_1fr]">
                {qr ? <img src={qr} alt="QR Code Pix" className="h-48 w-48 rounded-xl bg-white p-3" /> : null}
                <div><h2 className="text-xl font-semibold">Pagamento via Pix</h2><p className="mt-2 text-sm text-muted-foreground">Após pagar, aguarde a confirmação manual do administrador. Os números ainda não foram atribuídos.</p><div className="mt-4 rounded-xl bg-white p-3 text-xs break-all">{data.rifa.pixCopiaCola}</div><Button type="button" variant="outline" className="mt-3" onClick={() => navigator.clipboard.writeText(data.rifa.pixCopiaCola)}><Copy className="mr-2 h-4 w-4" /> Copiar Pix Copia e Cola</Button></div>
              </div>
            ) : null}
            <div><h2 className="mb-3 text-xl font-semibold">Bilhetes</h2>{data.bilhetes.length ? <div className="flex flex-wrap gap-2">{data.bilhetes.map(b => <span key={b.id} className="rounded-full bg-[#21180f] px-4 py-2 font-semibold text-white">{String(b.numero).padStart(4, "0")}</span>)}</div> : <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Os números serão gerados somente após a confirmação manual do pagamento pelo administrador.</p>}</div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
