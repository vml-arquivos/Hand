import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, HeartHandshake, Loader2, LockKeyhole, QrCode, Sparkles, Ticket } from "lucide-react";
import QRCode from "qrcode";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Home() {
  const [, params] = useRoute("/rifa/:slug");
  const slug = params?.slug ?? "rifa-beneficente";
  const [, navigate] = useLocation();
  const { data: rifa, isLoading } = trpc.rifa.public.useQuery({ slug });
  const criarPedido = trpc.rifa.criarPedido.useMutation();
  const [qr, setQr] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });

  const progresso = useMemo(() => rifa ? Math.min(100, Math.round((rifa.vendidos / rifa.totalBilhetes) * 100)) : 0, [rifa]);
  const total = rifa ? Number(rifa.precoBilhete) * quantidade : 0;

  useEffect(() => {
    if (!rifa?.pixCopiaCola) return;
    QRCode.toDataURL(rifa.pixCopiaCola, { margin: 1, width: 220, color: { dark: "#1d1b16", light: "#ffffff" } }).then(setQr);
  }, [rifa?.pixCopiaCola]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!rifa) return;
    const pedido = await criarPedido.mutateAsync({ rifaId: rifa.id, quantidade, ...form });
    navigate(`/comprovante/${pedido?.pedido.codigo}`);
  }

  if (isLoading) return <main className="min-h-screen grid place-items-center bg-[#f7f1e8]"><Loader2 className="h-8 w-8 animate-spin text-[#8a5a2b]" /></main>;

  if (!rifa) return <main className="min-h-screen grid place-items-center"><p>Rifa não encontrada.</p></main>;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7df,transparent_32%),linear-gradient(135deg,#18130d,#352515_42%,#f6efe3_42%)] text-[#22180e]">
      <section className="container py-8 md:py-12">
        <nav className="mb-8 flex items-center justify-between rounded-full border border-white/20 bg-white/10 px-5 py-3 text-white backdrop-blur">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#d6a75d] text-[#1e160c]"><HeartHandshake /></span><strong>Rifas Beneficentes</strong></div>
          <a href="/admin" className="inline-flex items-center gap-2 text-sm opacity-90 hover:opacity-100"><LockKeyhole className="h-4 w-4" /> Admin</a>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div className="space-y-6 text-white">
            <Badge className="border-[#e7c782] bg-[#e7c782]/20 text-[#ffe7a9] hover:bg-[#e7c782]/20"><Sparkles className="mr-1 h-3 w-3" /> Campanha ativa</Badge>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">{rifa.nome}</h1>
            <p className="max-w-2xl text-lg leading-8 text-white/80">{rifa.descricao}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-white/10 bg-white/10 text-white backdrop-blur"><CardContent className="p-5"><p className="text-sm text-white/70">Valor por bilhete</p><strong className="text-2xl">{moeda.format(Number(rifa.precoBilhete))}</strong></CardContent></Card>
              <Card className="border-white/10 bg-white/10 text-white backdrop-blur"><CardContent className="p-5"><p className="text-sm text-white/70">Confirmados</p><strong className="text-2xl">{rifa.vendidos}</strong></CardContent></Card>
              <Card className="border-white/10 bg-white/10 text-white backdrop-blur"><CardContent className="p-5"><p className="text-sm text-white/70">Disponíveis</p><strong className="text-2xl">{rifa.disponiveis}</strong></CardContent></Card>
            </div>
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              {rifa.imagemUrl ? <img src={rifa.imagemUrl} alt={rifa.nome} className="h-[340px] w-full rounded-[1.5rem] object-cover shadow-2xl" /> : null}
            </div>
          </div>

          <Card className="border-0 bg-[#fffaf2] shadow-[0_30px_90px_rgba(30,18,7,.35)]">
            <CardContent className="p-6 md:p-8">
              <div className="mb-6">
                <p className="text-sm uppercase tracking-[0.25em] text-[#9b6b35]">Compra segura por pré-reserva</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Escolha seus bilhetes</h2>
                <p className="mt-2 text-sm text-muted-foreground">Os números só serão liberados após a conferência manual do Pix pelo administrador.</p>
              </div>
              <div className="mb-6 space-y-2">
                <div className="flex justify-between text-sm"><span>Progresso confirmado</span><strong>{progresso}%</strong></div>
                <Progress value={progresso} className="h-3" />
                <p className="text-xs text-muted-foreground">{rifa.vendidos} de {rifa.totalBilhetes} bilhetes confirmados. Há {rifa.pendentes} bilhetes em pedidos pendentes.</p>
              </div>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-2"><Label>Quantidade de bilhetes</Label><Input type="number" min={1} max={Math.min(100, rifa.disponiveis)} value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} required /></div>
                <div className="grid gap-2"><Label>Nome completo</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required placeholder="Nome do comprador" /></div>
                <div className="grid gap-2"><Label>Telefone/WhatsApp</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} required placeholder="(00) 00000-0000" /></div>
                <div className="grid gap-2"><Label>E-mail opcional</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="voce@email.com" /></div>
                <Separator />
                <div className="rounded-2xl bg-[#f3eadb] p-4">
                  <div className="flex items-center justify-between"><span>Total do pedido</span><strong className="text-2xl">{moeda.format(total)}</strong></div>
                </div>
                <Button className="h-12 w-full bg-[#2b2116] text-white hover:bg-[#4a341f]" disabled={criarPedido.isPending || rifa.disponiveis <= 0}>{criarPedido.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />} Finalizar pedido pendente</Button>
                {criarPedido.error ? <p className="text-sm text-red-700">{criarPedido.error.message}</p> : null}
              </form>
              <div className="mt-6 rounded-2xl border border-dashed border-[#caa66f] p-4 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-[#5b3a1c]"><QrCode className="h-4 w-4" /> Pix exibido no comprovante</div>
                {qr ? <img src={qr} className="mx-auto h-28 w-28 rounded-lg bg-white p-2" alt="Prévia do QR Code Pix" /> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
