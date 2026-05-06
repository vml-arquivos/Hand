import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Gift, HeartHandshake, Loader2, LockKeyhole, QrCode, Sparkles, Ticket } from "lucide-react";
import QRCode from "qrcode";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DONOR_STORAGE_KEY = "rifa_doador_v1";

export default function Home() {
  const [, params] = useRoute("/rifa/:slug");
  const slug = params?.slug ?? "rifa-beneficente";
  const [, navigate] = useLocation();
  const { data: rifa, isLoading } = trpc.rifa.public.useQuery({ slug });
  const criarPedido = trpc.rifa.criarPedido.useMutation();
  const [qr, setQr] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });

  const progresso = useMemo(() => (rifa ? Math.min(100, Math.round((rifa.vendidos / rifa.totalBilhetes) * 100)) : 0), [rifa]);
  const total = rifa ? Number(rifa.precoBilhete) * quantidade : 0;
  const escassez = progresso >= 80 ? "🔥 Últimos bilhetes!" : "⚡ Garanta sua chance!";

  useEffect(() => {
    const url = new URL(window.location.href);
    const qtd = Number(url.searchParams.get("qtd") || "1");
    if (Number.isFinite(qtd) && qtd > 0) setQuantidade(Math.floor(qtd));
    const saved = localStorage.getItem(DONOR_STORAGE_KEY);
    if (!saved) return;
    try {
      const donor = JSON.parse(saved) as { nome?: string; telefone?: string };
      setForm((prev) => ({ ...prev, nome: donor.nome ?? "", telefone: donor.telefone ?? "" }));
    } catch {
      localStorage.removeItem(DONOR_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!rifa?.pixCopiaCola) return;
    QRCode.toDataURL(rifa.pixCopiaCola, { margin: 1, width: 220 }).then(setQr);
  }, [rifa?.pixCopiaCola]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!rifa) return;
    const pedido = await criarPedido.mutateAsync({ rifaId: rifa.id, quantidade, ...form });
    localStorage.setItem(DONOR_STORAGE_KEY, JSON.stringify({ nome: form.nome, telefone: form.telefone }));
    navigate(`/comprovante/${pedido?.pedido.codigo}`);
  }

  if (isLoading) return <main className="grid min-h-screen place-items-center bg-[#f7f1e8]"><Loader2 className="h-8 w-8 animate-spin text-[#8a5a2b]" /></main>;
  if (!rifa) return <main className="grid min-h-screen place-items-center"><p>Rifa não encontrada.</p></main>;

  return <main className="min-h-screen bg-[#faf6ef] text-[#22180e]"><section className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-6 md:py-10"><nav className="mb-8 flex items-center justify-between rounded-2xl border border-[#eadbc2] bg-white px-4 py-3 shadow-sm md:px-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#f4dfbc] text-[#593b1f]"><HeartHandshake /></span><strong>Rifas Beneficentes</strong></div><a href="/admin" className="inline-flex items-center gap-2 text-sm text-[#593b1f]"><LockKeyhole className="h-4 w-4" /> Admin</a></nav><div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]"><div className="space-y-6"><Badge className="border-[#e7c782] bg-[#f8ebd2] text-[#7f5525] hover:bg-[#f8ebd2]"><Sparkles className="mr-1 h-3 w-3" /> Campanha ativa</Badge><h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">{rifa.nome}</h1><p className="max-w-2xl text-base leading-8 text-[#493624] md:text-lg">{rifa.descricao}</p>{rifa.imagemUrl ? <img src={rifa.imagemUrl} alt={rifa.nome} className="h-[360px] w-full rounded-3xl object-cover shadow-[0_20px_60px_rgba(28,17,8,0.25)] md:h-[500px]" /> : null}<div className="grid gap-4 md:grid-cols-3"><Card className="border-[#ecdcc5] bg-white"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Prêmio principal</p><p className="mt-2 text-xl font-semibold"><Gift className="mr-2 inline h-5 w-5 text-[#a06a31]" />{rifa.premio || "Prêmio especial da campanha"}</p></CardContent></Card><Card className="border-[#ecdcc5] bg-white"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Valor do bilhete</p><p className="mt-2 text-3xl font-bold text-[#2e2013]">{moeda.format(Number(rifa.precoBilhete))}</p></CardContent></Card><Card className="border-[#ecdcc5] bg-white"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Data do sorteio</p><p className="mt-2 text-xl font-semibold"><CalendarDays className="mr-2 inline h-5 w-5 text-[#a06a31]" />{rifa.dataSorteio || "A definir"}</p></CardContent></Card></div></div><Card className="sticky top-5 h-fit border-[#e8dbc8] bg-white shadow-[0_30px_70px_rgba(37,23,9,0.18)]"><CardContent className="p-6 md:p-8"><p className="text-xs uppercase tracking-[0.25em] text-[#9b6b35]">Checkout rápido</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Faça sua reserva</h2><p className="mt-2 text-sm text-muted-foreground">Bilhetes só são gerados após confirmação manual do administrador.</p><div className="mb-6 mt-5 space-y-2"><div className="flex justify-between text-sm"><span>Progresso confirmado</span><strong>{progresso}%</strong></div><Progress value={progresso} className="h-3" /><Badge className="w-fit bg-[#2b2116] text-white hover:bg-[#2b2116]">{escassez}</Badge><p className="text-xs text-muted-foreground">{rifa.vendidos} de {rifa.totalBilhetes} confirmados • {rifa.pendentes} aguardando validação.</p></div><form onSubmit={onSubmit} className="space-y-4"><div className="grid gap-2"><Label>Quantidade de bilhetes</Label><Input type="number" min={1} max={Math.min(100, rifa.disponiveis)} value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} required /></div><div className="grid gap-2"><Label>Nome completo</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div><div className="grid gap-2"><Label>Telefone/WhatsApp</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} required /></div><div className="grid gap-2"><Label>E-mail opcional</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><Separator /><div className="rounded-2xl bg-[#f7eee0] p-4"><div className="flex items-center justify-between"><span>Total do pedido</span><strong className="text-2xl">{moeda.format(total)}</strong></div></div><Button className="hidden h-12 w-full bg-[#2b2116] text-white md:inline-flex" disabled={criarPedido.isPending || rifa.disponiveis <= 0}>{criarPedido.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />} Finalizar pedido</Button>{criarPedido.error ? <p className="text-sm text-red-700">{criarPedido.error.message}</p> : null}</form><div className="mt-6 rounded-2xl border border-dashed border-[#d5b078] p-4 text-sm text-muted-foreground"><div className="mb-2 flex items-center gap-2 font-medium text-[#5b3a1c]"><QrCode className="h-4 w-4" /> Pix exibido no comprovante</div>{qr ? <img src={qr} className="mx-auto h-28 w-28 rounded-lg bg-white p-2" alt="Prévia do QR Code Pix" /> : null}</div></CardContent></Card></div></section><div className="fixed inset-x-0 bottom-0 border-t border-[#e6d8c1] bg-white/95 p-4 backdrop-blur md:hidden"><Button onClick={() => document.querySelector("form")?.requestSubmit()} className="h-12 w-full bg-[#2b2116] text-white" disabled={criarPedido.isPending || rifa.disponiveis <= 0}>{criarPedido.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />} Finalizar pedido • {moeda.format(total)}</Button></div></main>;
}
