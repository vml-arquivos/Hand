import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Gift,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  Minus,
  Plus,
  QrCode,
  Sparkles,
  Ticket,
  Trophy,
} from "lucide-react";
import QRCode from "qrcode";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DONOR_KEY = "rifa_doador_v1";

function formatarData(data?: string | null) {
  if (!data) return "A definir";
  const d = new Date(data);
  if (isNaN(d.getTime())) return data;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
export default function Home() {
  const [, params] = useRoute("/rifa/:slug");
  const slug = params?.slug ?? "rifa-beneficente";
  const [, navigate] = useLocation();
  const { data: rifa, isLoading } = trpc.rifa.public.useQuery({ slug });
  const criarPedido = trpc.rifa.criarPedido.useMutation();

  const [quantidade, setQuantidade] = useState(1);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });
  const [qrPreview, setQrPreview] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const total = rifa ? Number(rifa.precoBilhete) * quantidade : 0;
  const progresso = rifa ? Math.min(100, Math.round((rifa.vendidos / rifa.totalBilhetes) * 100)) : 0;
  const maxQtd = rifa ? Math.min(100, rifa.disponiveis || 1) : 1;
  const disponivel = (rifa?.disponiveis ?? 0) > 0;

  const escassez =
    !rifa || rifa.disponiveis === 0
      ? "Esgotado"
      : rifa.disponiveis <= 10
        ? `Apenas ${rifa.disponiveis} restantes!`
        : rifa.disponiveis <= 50
          ? `${rifa.disponiveis} disponíveis`
          : `${rifa.disponiveis} bilhetes disponíveis`;

  // Carrega dados salvos do comprador
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DONOR_KEY);
      if (saved) {
        const donor = JSON.parse(saved) as { nome?: string; telefone?: string };
        setForm((p) => ({ ...p, nome: donor.nome ?? "", telefone: donor.telefone ?? "" }));
      }
    } catch {
      localStorage.removeItem(DONOR_KEY);
    }
  }, []);

  // Ajusta quantidade quando a rifa carrega
  useEffect(() => {
    if (rifa) setQuantidade((p) => Math.max(1, Math.min(p, maxQtd)));
  }, [rifa, maxQtd]);

  // Gera preview do QR Code Pix
  useEffect(() => {
    if (!rifa?.pixCopiaCola) return;
    QRCode.toDataURL(rifa.pixCopiaCola, {
      margin: 1,
      width: 200,
      color: { dark: "#21180f", light: "#fffbf5" },
    })
      .then(setQrPreview)
      .catch(() => setQrPreview(""));
  }, [rifa?.pixCopiaCola]);

  function ajustar(delta: number) {
    setQuantidade((p) => Math.max(1, Math.min(maxQtd, p + delta)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rifa) return;
    if (!form.nome.trim() || !form.telefone.trim()) {
      toast.error("Preencha nome e WhatsApp.");
      return;
    }
    try {
      const pedido = await criarPedido.mutateAsync({
        rifaId: rifa.id,
        quantidade,
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim() || undefined,
      });
      localStorage.setItem(DONOR_KEY, JSON.stringify({ nome: form.nome, telefone: form.telefone }));
      navigate(`/comprovante/${pedido?.pedido.codigo}`);
    } catch {
      // erro exibido via criarPedido.error
    }
  }

  // ── Estados de carregamento e erro ────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#8a5a2b]" />
          <p className="text-sm text-[#8a5a2b]">Carregando...</p>
        </div>
      </main>
    );
  }

  if (!rifa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4">
        <div className="text-center">
          <HeartHandshake className="mx-auto mb-4 h-12 w-12 text-[#a06a31]" />
          <h1 className="text-xl font-semibold text-[#2e2013]">Rifa não encontrada</h1>
          <p className="mt-2 text-sm text-[#7a5a3a]">Nenhuma rifa ativa no momento.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] text-[#22180e]">
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-[#e6d8c1] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f4dfbc] text-[#593b1f]">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <span className="font-semibold text-[#2e2013]">Rifas Beneficentes</span>
          </div>
          <a
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[#593b1f] transition hover:bg-[#f4dfbc]"
          >
            <LockKeyhole className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </a>
        </div>
      </nav>

      {/* ── Conteúdo principal ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-10 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">

          {/* ── Coluna esquerda ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Badge + Título + Descrição */}
            <div className="space-y-3">
              <Badge className="border-[#e7c782] bg-[#f8ebd2] text-[#7f5525] hover:bg-[#f8ebd2]">
                <Sparkles className="mr-1.5 h-3 w-3" />
                Campanha ativa
              </Badge>
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#1a0f06] sm:text-3xl md:text-4xl">
                {rifa.nome}
              </h1>
              <p className="text-base leading-relaxed text-[#493624] md:text-lg">
                {rifa.descricao}
              </p>
            </div>

            {/* Imagem principal */}
            {rifa.imagemUrl && (
              <div className="overflow-hidden rounded-2xl shadow-lg md:rounded-3xl">
                <img
                  src={rifa.imagemUrl}
                  alt={rifa.nome}
                  className="h-56 w-full object-cover sm:h-72 md:h-96"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}

            {/* Cards de informação */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Card className="border-[#ecdcc5] bg-white shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9b6b35]">Bilhete</p>
                  <p className="mt-1.5 text-2xl font-bold text-[#1a0f06]">
                    {moeda.format(Number(rifa.precoBilhete))}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-[#ecdcc5] bg-white shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9b6b35]">Sorteio</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 shrink-0 text-[#a06a31]" />
                    <p className="text-sm font-semibold leading-tight">{formatarData(rifa.dataSorteio)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-2 border-[#ecdcc5] bg-white shadow-sm sm:col-span-1">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9b6b35]">Prêmio</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Gift className="h-4 w-4 shrink-0 text-[#a06a31]" />
                    <p className="text-sm font-semibold leading-tight">
                      {rifa.premio || "Prêmio especial"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prêmios detalhados */}
            {Array.isArray((rifa as any).premios) && (rifa as any).premios.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#a06a31]" />
                  <h2 className="text-lg font-bold text-[#1a0f06]">Prêmios da campanha</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(rifa as any).premios.map((p: any, i: number) => (
                    <div
                      key={p.id}
                      className="flex items-start gap-3 rounded-2xl border border-[#ecdcc5] bg-white p-4 shadow-sm"
                    >
                      {p.imagemUrl ? (
                        <img
                          src={p.imagemUrl}
                          alt={p.titulo}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[#f4dfbc]">
                          <Gift className="h-7 w-7 text-[#a06a31]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2b2116] text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <p className="truncate font-semibold text-[#1a0f06]">{p.titulo}</p>
                        </div>
                        {p.descricao && (
                          <p className="mt-1 text-sm leading-snug text-[#7a5a3a]">{p.descricao}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progresso */}
            <div className="rounded-2xl border border-[#ecdcc5] bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#493624]">Progresso da campanha</span>
                <span className="text-sm font-bold text-[#1a0f06]">{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-3 bg-[#f0e4d0]" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Badge
                  className={`text-xs ${
                    rifa.disponiveis === 0
                      ? "bg-red-100 text-red-800"
                      : rifa.disponiveis <= 10
                        ? "bg-orange-100 text-orange-800"
                        : "bg-[#2b2116] text-white hover:bg-[#2b2116]"
                  }`}
                >
                  {escassez}
                </Badge>
                <p className="text-xs text-[#9b6b35]">
                  {rifa.vendidos} confirmados · {rifa.pendentes} aguardando
                </p>
              </div>
            </div>
          </div>

          {/* ── Coluna direita: formulário de compra ─────────────────────────── */}
          <div className="lg:sticky lg:top-20 lg:h-fit">
            <Card className="overflow-hidden border-[#e8dbc8] shadow-xl">
              {/* Header escuro */}
              <div className="bg-[#21180f] px-5 py-5 text-white sm:px-6">
                <p className="text-xs font-medium uppercase tracking-widest text-[#e5c07b]">
                  Checkout rápido
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Faça sua reserva</h2>
                <p className="mt-1 text-sm text-[#c9a87c]">
                  Bilhetes gerados após confirmação do pagamento.
                </p>
              </div>

              <CardContent className="p-5 sm:p-6">
                <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
                  {/* Seletor de quantidade */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Quantidade de bilhetes</Label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => ajustar(-1)}
                        disabled={quantidade <= 1}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#d5b078] bg-white text-[#2b2116] transition hover:bg-[#f4dfbc] disabled:opacity-40"
                        aria-label="Diminuir"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <Input
                        type="number"
                        min={1}
                        max={maxQtd}
                        value={quantidade}
                        onChange={(e) =>
                          setQuantidade(Math.max(1, Math.min(maxQtd, Number(e.target.value) || 1)))
                        }
                        className="h-11 text-center text-lg font-bold"
                        required
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        onClick={() => ajustar(1)}
                        disabled={quantidade >= maxQtd}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#d5b078] bg-white text-[#2b2116] transition hover:bg-[#f4dfbc] disabled:opacity-40"
                        aria-label="Aumentar"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Dados do comprador */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome" className="text-sm font-semibold">
                        Nome completo *
                      </Label>
                      <Input
                        id="nome"
                        placeholder="Seu nome completo"
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        required
                        autoComplete="name"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="telefone" className="text-sm font-semibold">
                        WhatsApp *
                      </Label>
                      <Input
                        id="telefone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={form.telefone}
                        onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                        required
                        autoComplete="tel"
                        inputMode="tel"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-semibold">
                        E-mail{" "}
                        <span className="font-normal text-[#9b6b35]">(opcional)</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        autoComplete="email"
                        inputMode="email"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <Separator className="bg-[#ecdcc5]" />

                  {/* Total */}
                  <div className="flex items-center justify-between rounded-2xl bg-[#f7eee0] px-4 py-3">
                    <div>
                      <p className="text-xs text-[#9b6b35]">Total do pedido</p>
                      <p className="text-sm text-[#7a5a3a]">
                        {quantidade}× {moeda.format(Number(rifa.precoBilhete))}
                      </p>
                    </div>
                    <strong className="text-2xl font-bold text-[#1a0f06]">
                      {moeda.format(total)}
                    </strong>
                  </div>

                  {/* Botão desktop */}
                  <Button
                    type="submit"
                    className="hidden h-12 w-full bg-[#2b2116] text-base font-semibold text-white hover:bg-[#3d2e1e] md:flex"
                    disabled={criarPedido.isPending || !disponivel}
                  >
                    {criarPedido.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Ticket className="mr-2 h-5 w-5" />
                    )}
                    {disponivel ? "Reservar bilhetes" : "Esgotado"}
                  </Button>

                  {criarPedido.error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      {criarPedido.error.message}
                    </p>
                  )}
                </form>

                {/* Preview QR Code Pix */}
                {qrPreview && (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#d5b078] bg-[#fffaf2] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-[#a06a31]" />
                      <p className="text-sm font-semibold text-[#5b3a1c]">
                        Pré-visualização do Pix
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <img
                        src={qrPreview}
                        alt="QR Code Pix"
                        className="h-28 w-28 shrink-0 rounded-xl bg-white p-2 shadow-sm"
                      />
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="text-xs leading-relaxed text-[#9b6b35]">
                          O QR Code completo aparece no comprovante após a reserva.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(rifa.pixCopiaCola);
                            toast.success("Pix copiado!");
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#d5b078] bg-white px-3 py-1.5 text-xs font-medium text-[#5b3a1c] transition hover:bg-[#f4dfbc]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar Pix Copia e Cola
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Segurança */}
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#f0f9f0] px-3 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <p className="text-xs leading-relaxed text-green-800">
                    Seus dados são protegidos. Os bilhetes são gerados somente após a confirmação
                    manual do pagamento pelo administrador.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Botão flutuante mobile ───────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e6d8c1] bg-white/95 p-3 backdrop-blur-sm md:hidden">
        <Button
          onClick={() => formRef.current?.requestSubmit()}
          className="h-13 w-full bg-[#2b2116] text-base font-semibold text-white hover:bg-[#3d2e1e]"
          disabled={criarPedido.isPending || !disponivel}
        >
          {criarPedido.isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Ticket className="mr-2 h-5 w-5" />
          )}
          {disponivel
            ? `Reservar ${quantidade} bilhete${quantidade > 1 ? "s" : ""} · ${moeda.format(total)}`
            : "Esgotado"}
        </Button>
      </div>
    </main>
  );
}
