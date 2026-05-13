import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Copy,
  Gift,
  HeartHandshake,
  Loader2,
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
import { Link, useLocation, useRoute } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DONOR_KEY = "rifa_doador_v1";
const PEDIDO_KEY = "rifa_ultimo_pedido_v1";

function formatarData(data?: string | null) {
  if (!data) return "A definir";
  const d = new Date(data);
  if (isNaN(d.getTime())) return data;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Vitrine de Rifas (página inicial /) ─────────────────────────────────────
function Vitrine() {
  const { data: rifas, isLoading } = trpc.rifa.list.useQuery();
  const ativas = rifas?.filter((r) => r.ativa) ?? [];

  return (
    <main className="min-h-screen bg-[#fdf8f0]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e6d8c1] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-[#a06a31]" />
            <span className="text-base font-bold text-[#2b2116]">Rifas Beneficentes</span>
          </div>
          <Link href="/meus-bilhetes">
            <Button variant="outline" size="sm" className="border-[#d5b078] text-[#5b3a1c] hover:bg-[#f4dfbc]">
              <Ticket className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Meus Bilhetes</span>
              <span className="sm:hidden">Bilhetes</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#2b2116] to-[#3d2e1e] px-4 py-12 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[#f4dfbc]">
              <Sparkles className="h-3.5 w-3.5" />
              Rifas com propósito
            </span>
          </div>
          <h1 className="mb-3 text-3xl font-extrabold leading-tight sm:text-4xl">
            Participe e faça a diferença
          </h1>
          <p className="text-sm leading-relaxed text-[#d5b078] sm:text-base">
            Compre seus bilhetes, concorra a prêmios incríveis e ajude causas que transformam vidas.
          </p>
        </div>
      </section>

      {/* Grid de rifas */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#a06a31]" />
          </div>
        ) : ativas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white p-12 text-center">
            <Gift className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
            <p className="text-base font-semibold text-[#5b3a1c]">Nenhuma rifa ativa no momento</p>
            <p className="mt-1 text-sm text-[#9b6b35]">Volte em breve para conferir as novidades!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ativas.map((rifa) => (
              <RifaCard key={rifa.id} rifa={rifa} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e6d8c1] bg-white py-6 text-center">
        <p className="text-xs text-[#9b6b35]">
          © {new Date().getFullYear()} Rifas Beneficentes · Todos os direitos reservados
        </p>
      </footer>
    </main>
  );
}

type RifaListItem = {
  id: number;
  slug: string;
  nome: string;
  descricao: string;
  imagemUrl?: string | null;
  thumbnailUrl?: string | null;
  precoBilhete: string;
  totalBilhetes: number;
  dataSorteio?: string | null;
  ativa: boolean;
};

function RifaCard({ rifa }: { rifa: RifaListItem }) {
  const thumb = rifa.thumbnailUrl || rifa.imagemUrl;
  const preco = parseFloat(String(rifa.precoBilhete));

  return (
    <Link href={`/rifa/${rifa.slug}`}>
      <Card className="group cursor-pointer overflow-hidden border-[#e6d8c1] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        {/* Imagem da vitrine: moldura 16:9 fixa, sem corte e com cards alinhados */}
        <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-[#f7eee0]">
          {thumb ? (
            <img
              src={thumb}
              alt={rifa.nome}
              className="h-full w-full object-contain p-1 transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f7eee0]">
              <Gift className="h-16 w-16 text-[#d5b078]" />
            </div>
          )}
          {/* Badge preço */}
          <div className="absolute bottom-3 left-3">
            <span className="rounded-full bg-[#2b2116]/90 px-3 py-1 text-sm font-bold text-white backdrop-blur-sm">
              {moeda.format(preco)} / bilhete
            </span>
          </div>
        </div>
        <CardContent className="p-4">
          <h2 className="mb-1 line-clamp-2 text-base font-bold text-[#2b2116]">{rifa.nome}</h2>
          <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[#9b6b35]">{rifa.descricao}</p>
          {rifa.dataSorteio && (
            <div className="mb-3 flex items-center gap-1.5 text-xs text-[#7a5a3a]">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>Sorteio: {formatarData(rifa.dataSorteio)}</span>
            </div>
          )}
          <Button className="h-9 w-full bg-[#2b2116] text-sm font-semibold text-white hover:bg-[#3d2e1e]">
            <Ticket className="mr-1.5 h-4 w-4" />
            Participar
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Página de Rifa Individual (/rifa/:slug) ──────────────────────────────────
function RifaPage({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const { data: rifa, isLoading, error } = trpc.rifa.public.useQuery({ slug });
  const [vendedorCodigo, setVendedorCodigo] = useState<string | null>(null);
  const [vendedorData, setVendedorData] = useState<{ nome: string; professor?: string | null; turma?: string | null } | null>(null);
  
  // Busca dados do vendedor se houver código
  trpc.admin.getVendedorByCodigo.useQuery(
    { rifaId: rifa?.id!, codigo: vendedorCodigo! },
    { 
      enabled: !!rifa?.id && !!vendedorCodigo,
      onSuccess: (data) => data && setVendedorData(data)
    }
  );

  const criarPedido = trpc.rifa.criarPedido.useMutation();
  const [quantidade, setQuantidade] = useState(1);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });
  const [qrPreview, setQrPreview] = useState("");
  const [ultimoPedido, setUltimoPedido] = useState<{ codigo: string; nome: string } | null>(null);
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DONOR_KEY);
      if (saved) {
        const donor = JSON.parse(saved) as { nome?: string; telefone?: string };
        setForm((p) => ({ ...p, nome: donor.nome ?? "", telefone: donor.telefone ?? "" }));
      }
      const pedidoSalvo = localStorage.getItem(PEDIDO_KEY);
      if (pedidoSalvo) {
        const p = JSON.parse(pedidoSalvo) as { codigo: string; nome: string };
        setUltimoPedido(p);
      }
      
      // Captura vendedor da URL
      const params = new URLSearchParams(window.location.search);
      const v = params.get("v");
      if (v) {
        setVendedorCodigo(v);
        localStorage.setItem(`rifa_vendedor_${slug}`, v);
      } else {
        const savedV = localStorage.getItem(`rifa_vendedor_${slug}`);
        if (savedV) setVendedorCodigo(savedV);
      }
    } catch {
      localStorage.removeItem(DONOR_KEY);
    }
  }, [slug]);

  useEffect(() => {
    if (rifa) setQuantidade((p) => Math.max(1, Math.min(p, maxQtd)));
  }, [rifa, maxQtd]);

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
        vendedorCodigo: vendedorCodigo || undefined,
      });
      localStorage.setItem(DONOR_KEY, JSON.stringify({ nome: form.nome.trim(), telefone: form.telefone.trim() }));
      const codigo = (pedido as { codigo?: string; pedido?: { codigo?: string } })?.codigo
        ?? (pedido as { pedido?: { codigo?: string } })?.pedido?.codigo
        ?? "";
      if (codigo) {
        localStorage.setItem(PEDIDO_KEY, JSON.stringify({ codigo, nome: form.nome.trim() }));
        navigate(`/comprovante/${codigo}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdf8f0]">
        <Loader2 className="h-8 w-8 animate-spin text-[#a06a31]" />
      </div>
    );
  }

  if (error || !rifa) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fdf8f0] px-4 text-center">
        <Gift className="h-12 w-12 text-[#d5b078]" />
        <h1 className="text-xl font-bold text-[#2b2116]">Rifa não encontrada</h1>
        <p className="text-sm text-[#9b6b35]">Esta rifa não existe ou foi encerrada.</p>
        <Link href="/">
          <Button variant="outline" className="border-[#d5b078] text-[#5b3a1c] hover:bg-[#f4dfbc]">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Ver todas as rifas
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fdf8f0] pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e6d8c1] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm font-medium text-[#5b3a1c] transition hover:text-[#2b2116]">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Todas as rifas</span>
              <span className="sm:hidden">Voltar</span>
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-[#a06a31]" />
            <span className="text-sm font-bold text-[#2b2116]">Rifas Beneficentes</span>
          </div>
          <Link href="/meus-bilhetes">
            <Button variant="outline" size="sm" className="border-[#d5b078] text-[#5b3a1c] hover:bg-[#f4dfbc]">
              <Ticket className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Meus Bilhetes</span>
              <span className="sm:hidden">Bilhetes</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Banner pedido pendente */}
      {ultimoPedido && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2.5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-yellow-800">
              Olá, <strong>{ultimoPedido.nome.split(" ")[0]}</strong>! Você tem um pedido recente.
            </p>
            <div className="flex gap-2">
              <Link href={`/comprovante/${ultimoPedido.codigo}`}>
                <button className="text-xs font-semibold text-yellow-700 underline underline-offset-2">
                  Ver comprovante
                </button>
              </Link>
              <button
                onClick={() => { localStorage.removeItem(PEDIDO_KEY); setUltimoPedido(null); }}
                className="text-xs text-yellow-600 hover:text-yellow-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">

          {/* ── Coluna esquerda: info da rifa ── */}
          <div className="space-y-6">

            {/* Imagem principal: moldura 16:9 responsiva, sem corte em mobile/tablet/desktop */}
            <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-2xl bg-[#1f160d] shadow-sm">
              {rifa.imagemUrl ? (
                <img
                  src={rifa.imagemUrl}
                  alt={rifa.nome}
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#f7eee0]">
                  <Gift className="h-20 w-20 text-[#d5b078]" />
                </div>
              )}
            </div>

            {/* Título, badge e descrição */}
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-[#2b2116] sm:text-3xl">{rifa.nome}</h1>
                {rifa.ativa ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativa</Badge>
                ) : (
                  <Badge variant="secondary">Encerrada</Badge>
                )}
              </div>
              {vendedorData && (
                <div className="mb-3 flex flex-col gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Você está comprando com o aluno: <span className="font-bold">{vendedorData.nome}</span>
                  </div>
                  {(vendedorData.professor || vendedorData.turma) && (
                    <p className="ml-6 text-[10px] text-amber-700 opacity-80">
                      {vendedorData.professor && `Prof: ${vendedorData.professor}`} {vendedorData.turma && `· Turma: ${vendedorData.turma}`}
                    </p>
                  )}
                </div>
              )}
              <p className="leading-relaxed text-[#5b3a1c]">{rifa.descricao}</p>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#e6d8c1] bg-white p-3 text-center">
                <Ticket className="mx-auto mb-1 h-5 w-5 text-[#a06a31]" />
                <p className="text-xs text-[#9b6b35]">Preço</p>
                <p className="text-sm font-bold text-[#2b2116]">{moeda.format(Number(rifa.precoBilhete))}</p>
              </div>
              <div className="rounded-xl border border-[#e6d8c1] bg-white p-3 text-center">
                <CalendarDays className="mx-auto mb-1 h-5 w-5 text-[#a06a31]" />
                <p className="text-xs text-[#9b6b35]">Sorteio</p>
                <p className="text-sm font-bold text-[#2b2116]">{formatarData(rifa.dataSorteio)}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-[#e6d8c1] bg-white p-3 text-center sm:col-span-1">
                <Sparkles className="mx-auto mb-1 h-5 w-5 text-[#a06a31]" />
                <p className="text-xs text-[#9b6b35]">Disponíveis</p>
                <p className="text-sm font-bold text-[#2b2116]">{escassez}</p>
              </div>
            </div>

            {/* Progresso */}
            <div className="rounded-xl border border-[#e6d8c1] bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-[#9b6b35]">
                <span>{rifa.vendidos} vendidos</span>
                <span>{progresso}% preenchido</span>
                <span>{rifa.totalBilhetes} total</span>
              </div>
              <Progress value={progresso} className="h-2.5 bg-[#f0e4d0]" />
            </div>

            {/* Prêmios: cards grandes 16:9, sem corte das fotos */}
            {rifa.premios && rifa.premios.length > 0 && (
              <section className="rounded-2xl border border-[#e6d8c1] bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-[#2b2116]">
                    <Trophy className="h-5 w-5 text-[#a06a31]" />
                    Conheça a premiação
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#7a5a3a]">
                    Veja as fotos e os detalhes cadastrados para o prêmio desta rifa.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rifa.premios.map((p, i) => (
                    <article key={p.id} className="overflow-hidden rounded-2xl border border-[#ecdcc5] bg-[#fffaf2]">
                      <div className="flex aspect-[16/9] w-full items-center justify-center bg-[#1f160d]">
                        {p.imagemUrl ? (
                          <img
                            src={p.imagemUrl}
                            alt={p.titulo}
                            className="h-full w-full object-contain"
                            loading={i === 0 ? "eager" : "lazy"}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#f7eee0]">
                            <Gift className="h-10 w-10 text-[#d5b078]" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2b2116] text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <h3 className="text-base font-bold text-[#2b2116]">{p.titulo}</h3>
                        </div>
                        {p.descricao ? (
                          <p className="text-sm leading-relaxed text-[#7a5a3a]">{p.descricao}</p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Coluna direita: formulário de compra ── */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card className="border-[#e6d8c1] bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="mb-4 text-lg font-bold text-[#2b2116]">Reservar bilhetes</h2>
                <form ref={formRef} onSubmit={onSubmit} className="space-y-4">

                  {/* Seletor de quantidade */}
                  <div>
                    <Label className="mb-2 block text-sm font-semibold text-[#5b3a1c]">
                      Quantidade de bilhetes
                    </Label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => ajustar(-1)}
                        disabled={quantidade <= 1}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d5b078] bg-white text-[#5b3a1c] transition hover:bg-[#f4dfbc] disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="flex-1 rounded-xl border border-[#d5b078] bg-[#fdf8f0] px-3 py-2 text-center text-xl font-bold text-[#2b2116]">
                        {quantidade}
                      </div>
                      <button
                        type="button"
                        onClick={() => ajustar(1)}
                        disabled={quantidade >= maxQtd}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d5b078] bg-white text-[#5b3a1c] transition hover:bg-[#f4dfbc] disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Atalhos rápidos */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[1, 3, 5, 10, 20].filter((n) => n <= maxQtd).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setQuantidade(n)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                            quantidade === n
                              ? "border-[#2b2116] bg-[#2b2116] text-white"
                              : "border-[#d5b078] bg-white text-[#5b3a1c] hover:bg-[#f4dfbc]"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-[#ecdcc5]" />

                  {/* Dados do comprador */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="nome" className="mb-1.5 block text-sm font-semibold text-[#5b3a1c]">
                        Nome completo *
                      </Label>
                      <Input
                        id="nome"
                        required
                        value={form.nome}
                        onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                        placeholder="Seu nome"
                        className="h-11 border-[#d5b078] bg-[#fdf8f0] focus-visible:ring-[#a06a31]"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefone" className="mb-1.5 block text-sm font-semibold text-[#5b3a1c]">
                        WhatsApp *
                      </Label>
                      <Input
                        id="telefone"
                        required
                        value={form.telefone}
                        onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                        placeholder="(61) 99999-9999"
                        className="h-11 border-[#d5b078] bg-[#fdf8f0] focus-visible:ring-[#a06a31]"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#5b3a1c]">
                        E-mail <span className="font-normal text-[#9b6b35]">(opcional)</span>
                      </Label>
                      <Input
                        id="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="seu@email.com"
                        className="h-11 border-[#d5b078] bg-[#fdf8f0] focus-visible:ring-[#a06a31]"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
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
                      <p className="text-sm font-semibold text-[#5b3a1c]">Pré-visualização do Pix</p>
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
                    Seus dados são protegidos. Os bilhetes são gerados somente após a confirmação manual do pagamento.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Botão flutuante mobile ── */}
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

// ─── Componente raiz — decide entre vitrine e rifa individual ─────────────────
export default function Home() {
  const [matchRifa, paramsRifa] = useRoute("/rifa/:slug");
  if (matchRifa && paramsRifa?.slug) {
    return <RifaPage slug={paramsRifa.slug} />;
  }
  return <Vitrine />;
}
