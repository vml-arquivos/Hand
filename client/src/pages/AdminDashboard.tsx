import { AdminFlyer } from "@/components/AdminFlyer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock3,
  Edit2,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Settings,
  ShieldCheck,
  TicketCheck,
  Trash2,
  UploadCloud,
  XCircle,
  LogOut,
  Gift,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// ─── Tipos ───────────────────────────────────────────────────────────────────

type RifaRow = {
  id: number;
  slug: string;
  nome: string;
  descricao: string;
  premio?: string | null;
  dataSorteio?: string | null;
  imagemUrl?: string | null;
  totalBilhetes: number;
  precoBilhete: string;
  pixChave: string;
  pixCopiaCola: string;
  ativa: boolean;
};

type PremioRow = {
  id: number;
  rifaId: number;
  titulo: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  ordem: number;
  ativo: boolean;
};

// ─── Utilitários ─────────────────────────────────────────────────────────────

/** Converte um arquivo em base64 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:image/...;base64,"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Formata valor numérico para exibição no input (ex: "10.00" → "10,00") */
function formatarPrecoParaInput(valor: string | number): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  if (isNaN(num)) return "";
  return num.toFixed(2).replace(".", ",");
}

/** Converte valor do input para número (ex: "R$ 10,50" → 10.50) */
function parsearPreco(valor: string): number {
  const limpo = valor
    .trim()
    .replace(/R\$\s*/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(limpo);
}

// ─── Componente de Upload de Imagem ──────────────────────────────────────────

function ImageUpload({
  currentUrl,
  onUploaded,
  assetType,
  rifaId,
  label = "Imagem",
}: {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  assetType: "rifa_main" | "premio" | "comprovante";
  rifaId?: number;
  label?: string;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.admin.uploadImagem.useMutation();

  // Atualiza preview quando a URL externa muda
  useEffect(() => {
    setPreview(currentUrl ?? null);
  }, [currentUrl]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 8MB.");
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        contentType: file.type,
        base64,
        assetType,
        rifaId,
      });
      setPreview(result.url);
      onUploaded(result.url);
      toast.success("Imagem enviada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + (err?.message ?? "Tente novamente."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className="relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d5b078] bg-[#fdf8f0] transition hover:border-[#a06a31] hover:bg-[#faf0e0]"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[#a06a31]" />
        ) : preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="max-h-[120px] max-w-full rounded-lg object-contain"
              onError={() => setPreview(null)}
            />
            <p className="text-xs text-muted-foreground">Clique para trocar</p>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-[#a06a31]" />
            <p className="text-sm text-muted-foreground">Clique para selecionar imagem</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP — máx. 8MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ─── Formulário de Rifa ───────────────────────────────────────────────────────

function RifaForm({
  rifa,
  onSaved,
}: {
  rifa?: RifaRow | null;
  onSaved: () => void;
}) {
  const isEdit = !!rifa?.id;

  const [form, setForm] = useState({
    slug: rifa?.slug ?? "",
    nome: rifa?.nome ?? "",
    descricao: rifa?.descricao ?? "",
    premio: rifa?.premio ?? "",
    dataSorteio: rifa?.dataSorteio ?? "",
    imagemUrl: rifa?.imagemUrl ?? "",
    totalBilhetes: String(rifa?.totalBilhetes ?? "100"),
    precoBilhete: formatarPrecoParaInput(rifa?.precoBilhete ?? "10"),
    pixChave: rifa?.pixChave ?? "",
    pixCopiaCola: rifa?.pixCopiaCola ?? "",
    ativa: rifa?.ativa ?? true,
  });

  const salvarRifa = trpc.admin.salvarRifa.useMutation({
    onSuccess: () => {
      toast.success(isEdit ? "Rifa atualizada com sucesso!" : "Rifa criada com sucesso!");
      onSaved();
    },
    onError: (err) => {
      toast.error("Erro ao salvar rifa: " + err.message);
    },
  });

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const precoNumerico = parsearPreco(form.precoBilhete);
    if (isNaN(precoNumerico) || precoNumerico <= 0) {
      toast.error("Informe um preço de bilhete válido (ex: 10,00).");
      return;
    }

    const totalBilhetes = parseInt(form.totalBilhetes, 10);
    if (isNaN(totalBilhetes) || totalBilhetes < 1) {
      toast.error("Informe um número total de bilhetes válido.");
      return;
    }

    salvarRifa.mutate({
      ...(isEdit ? { id: rifa!.id } : {}),
      slug: form.slug.trim(),
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      premio: form.premio.trim() || "",
      dataSorteio: form.dataSorteio.trim() || "",
      imagemUrl: form.imagemUrl.trim() || "",
      totalBilhetes,
      // Envia o preço já como string numérica limpa (ex: "10.50")
      precoBilhete: precoNumerico.toFixed(2),
      pixChave: form.pixChave.trim(),
      pixCopiaCola: form.pixCopiaCola.trim(),
      ativa: form.ativa,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome da rifa *</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => handleChange("nome", e.target.value)}
            placeholder="Ex: Rifa Beneficente da Escola"
            required
            minLength={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL) *</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) =>
              handleChange(
                "slug",
                e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
              )
            }
            placeholder="Ex: rifa-beneficente"
            required
            minLength={3}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Textarea
          id="descricao"
          value={form.descricao}
          onChange={(e) => handleChange("descricao", e.target.value)}
          placeholder="Descreva o objetivo da rifa..."
          rows={3}
          required
          minLength={10}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="premio">Prêmio principal</Label>
          <Input
            id="premio"
            value={form.premio}
            onChange={(e) => handleChange("premio", e.target.value)}
            placeholder="Ex: Notebook Dell Inspiron"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataSorteio">Data do sorteio</Label>
          <Input
            id="dataSorteio"
            value={form.dataSorteio}
            onChange={(e) => handleChange("dataSorteio", e.target.value)}
            placeholder="Ex: 25/12/2025"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="totalBilhetes">Total de bilhetes *</Label>
          <Input
            id="totalBilhetes"
            type="number"
            min={1}
            value={form.totalBilhetes}
            onChange={(e) => handleChange("totalBilhetes", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="precoBilhete">Preço do bilhete (R$) *</Label>
          <Input
            id="precoBilhete"
            value={form.precoBilhete}
            onChange={(e) => handleChange("precoBilhete", e.target.value)}
            placeholder="Ex: 10,00"
            required
          />
          <p className="text-xs text-muted-foreground">
            Use vírgula como separador decimal. Ex: 10,00 ou 25,50
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pixChave">Chave Pix *</Label>
          <Input
            id="pixChave"
            value={form.pixChave}
            onChange={(e) => handleChange("pixChave", e.target.value)}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            required
            minLength={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pixCopiaCola">Pix Copia e Cola *</Label>
          <Input
            id="pixCopiaCola"
            value={form.pixCopiaCola}
            onChange={(e) => handleChange("pixCopiaCola", e.target.value)}
            placeholder="Código completo do Pix Copia e Cola"
            required
            minLength={10}
          />
        </div>
      </div>

      {/* Upload de imagem principal da rifa */}
      <ImageUpload
        label="Imagem principal da rifa"
        currentUrl={form.imagemUrl || null}
        assetType="rifa_main"
        rifaId={rifa?.id}
        onUploaded={(url) => handleChange("imagemUrl", url)}
      />

      {form.imagemUrl && (
        <div className="space-y-1">
          <Label>URL da imagem (gerada automaticamente)</Label>
          <Input value={form.imagemUrl} readOnly className="text-xs text-muted-foreground" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch
          id="ativa"
          checked={form.ativa}
          onCheckedChange={(v) => handleChange("ativa", v)}
        />
        <Label htmlFor="ativa">Rifa ativa (visível ao público)</Label>
      </div>

      <Button
        type="submit"
        className="w-full bg-[#2b2116] text-white"
        disabled={salvarRifa.isPending}
      >
        {salvarRifa.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Settings className="mr-2 h-4 w-4" />
        )}
        {isEdit ? "Salvar alterações" : "Criar rifa"}
      </Button>
    </form>
  );
}

// ─── Formulário de Prêmio ─────────────────────────────────────────────────────

function PremioForm({
  rifaId,
  premio,
  onSaved,
  onCancel,
}: {
  rifaId: number;
  premio?: PremioRow | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!premio?.id;
  const [form, setForm] = useState({
    titulo: premio?.titulo ?? "",
    descricao: premio?.descricao ?? "",
    imagemUrl: premio?.imagemUrl ?? "",
    ordem: String(premio?.ordem ?? "0"),
    ativo: premio?.ativo ?? true,
  });

  const salvarPremio = trpc.admin.salvarPremio.useMutation({
    onSuccess: () => {
      toast.success(isEdit ? "Prêmio atualizado!" : "Prêmio adicionado!");
      onSaved();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvarPremio.mutate({
      ...(isEdit ? { id: premio!.id } : {}),
      rifaId,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || undefined,
      imagemUrl: form.imagemUrl.trim() || undefined,
      ordem: parseInt(form.ordem, 10) || 0,
      ativo: form.ativo,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-4">
      <h4 className="font-semibold">{isEdit ? "Editar prêmio" : "Novo prêmio"}</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input
            value={form.titulo}
            onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
            placeholder="Ex: 1º Prêmio — Notebook"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Ordem de exibição</Label>
          <Input
            type="number"
            min={0}
            value={form.ordem}
            onChange={(e) => setForm((p) => ({ ...p, ordem: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={form.descricao}
          onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
          placeholder="Detalhes do prêmio..."
          rows={2}
        />
      </div>

      {/* Upload de imagem do prêmio */}
      <ImageUpload
        label="Imagem do prêmio"
        currentUrl={form.imagemUrl || null}
        assetType="premio"
        rifaId={rifaId}
        onUploaded={(url) => setForm((p) => ({ ...p, imagemUrl: url }))}
      />

      <div className="flex items-center gap-3">
        <Switch
          checked={form.ativo}
          onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))}
        />
        <Label>Prêmio ativo</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={salvarPremio.isPending} className="bg-[#2b2116] text-white">
          {salvarPremio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ─── Aba de Prêmios ───────────────────────────────────────────────────────────

function PremiosTab({ rifas }: { rifas: RifaRow[] }) {
  const [selectedRifaId, setSelectedRifaId] = useState<number | null>(
    rifas.length > 0 ? rifas[0].id : null,
  );
  const [showForm, setShowForm] = useState(false);
  const [editingPremio, setEditingPremio] = useState<PremioRow | null>(null);
  const utils = trpc.useUtils();

  const premiosQuery = trpc.admin.listPremios.useQuery(
    { rifaId: selectedRifaId! },
    { enabled: !!selectedRifaId },
  );

  const removerPremio = trpc.admin.removerPremio.useMutation({
    onSuccess: () => {
      toast.success("Prêmio removido.");
      utils.admin.listPremios.invalidate();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  function handleSaved() {
    setShowForm(false);
    setEditingPremio(null);
    utils.admin.listPremios.invalidate();
  }

  return (
    <div className="space-y-4">
      {rifas.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhuma rifa cadastrada. Crie uma rifa primeiro.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Selecionar rifa</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedRifaId ?? ""}
              onChange={(e) => {
                setSelectedRifaId(Number(e.target.value));
                setShowForm(false);
                setEditingPremio(null);
              }}
            >
              {rifas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </div>

          {selectedRifaId && (
            <>
              {!showForm && !editingPremio && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-[#2b2116] text-white"
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar prêmio
                </Button>
              )}

              {(showForm || editingPremio) && (
                <PremioForm
                  rifaId={selectedRifaId}
                  premio={editingPremio}
                  onSaved={handleSaved}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingPremio(null);
                  }}
                />
              )}

              {premiosQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#8a5a2b]" />
                </div>
              ) : (premiosQuery.data ?? []).length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Nenhum prêmio cadastrado para esta rifa.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {(premiosQuery.data as PremioRow[]).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 rounded-2xl border bg-white p-4"
                    >
                      {p.imagemUrl ? (
                        <img
                          src={p.imagemUrl}
                          alt={p.titulo}
                          className="h-16 w-16 rounded-xl object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#f4dfbc]">
                          <Gift className="h-6 w-6 text-[#a06a31]" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{p.titulo}</p>
                        {p.descricao && (
                          <p className="text-sm text-muted-foreground">{p.descricao}</p>
                        )}
                        <Badge variant={p.ativo ? "default" : "secondary"} className="mt-1">
                          {p.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPremio(p);
                            setShowForm(false);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Remover este prêmio?")) {
                              removerPremio.mutate({ id: p.id });
                            }
                          }}
                          disabled={removerPremio.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const dashboard = trpc.admin.dashboard.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => setLocation("/admin/login"),
  });

  const [editingRifa, setEditingRifa] = useState<RifaRow | null>(null);
  const [showNewRifaForm, setShowNewRifaForm] = useState(false);

  const confirmarPedido = trpc.admin.confirmarPedido.useMutation({
    onSuccess: () => {
      toast.success("Pedido confirmado! Bilhetes gerados.");
      utils.admin.dashboard.invalidate();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const cancelarPedido = trpc.admin.cancelarPedido.useMutation({
    onSuccess: () => {
      toast.success("Pedido cancelado.");
      utils.admin.dashboard.invalidate();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  if (me.isLoading || dashboard.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f1e8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8a5a2b]" />
      </main>
    );
  }

  if (!me.data) {
    setLocation("/admin/login");
    return null;
  }

  const pedidos = dashboard.data?.pedidos ?? [];
  const stats = dashboard.data?.stats;
  const rifas = (dashboard.data?.rifas ?? []) as RifaRow[];

  function handleRifaSaved() {
    setEditingRifa(null);
    setShowNewRifaForm(false);
    utils.admin.dashboard.invalidate();
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] text-[#22180e]">
      <section className="container py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#9b6b35]">Bem-vindo</p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">{me.data.name}</h1>
            <p className="text-sm text-muted-foreground">Papel: {me.data.role}</p>
          </div>
          <Button variant="outline" onClick={() => logout.mutate()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="rifas">Rifas</TabsTrigger>
            <TabsTrigger value="premios">Prêmios</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            <TabsTrigger value="flyer">Flyer</TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD ── */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Rifas Ativas</p>
                  <strong className="text-3xl">{rifas.filter((r) => r.ativa).length}</strong>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
                  <strong className="text-3xl">{Number(stats?.pendente.quantidade ?? 0)}</strong>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Receita Confirmada</p>
                  <strong className="text-3xl">
                    {moeda.format(Number(stats?.confirmado.valor ?? 0))}
                  </strong>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Bilhetes Vendidos</p>
                  <strong className="text-3xl">{stats?.bilhetesConfirmados ?? 0}</strong>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── RIFAS ── */}
          <TabsContent value="rifas" className="space-y-6">
            {/* Formulário de nova rifa */}
            {showNewRifaForm ? (
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle>Nova Rifa</CardTitle>
                </CardHeader>
                <CardContent>
                  <RifaForm onSaved={handleRifaSaved} />
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => setShowNewRifaForm(false)}
                  >
                    Cancelar
                  </Button>
                </CardContent>
              </Card>
            ) : editingRifa ? (
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle>Editar Rifa — {editingRifa.nome}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RifaForm rifa={editingRifa} onSaved={handleRifaSaved} />
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => setEditingRifa(null)}
                  >
                    Cancelar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Button
                  className="bg-[#2b2116] text-white"
                  onClick={() => setShowNewRifaForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Nova Rifa
                </Button>

                <div className="grid gap-6">
                  {rifas.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        Nenhuma rifa cadastrada. Clique em "Nova Rifa" para começar.
                      </CardContent>
                    </Card>
                  ) : (
                    rifas.map((rifa) => (
                      <Card key={rifa.id} className="border-0 shadow-xl">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>{rifa.nome}</CardTitle>
                            <Badge variant={rifa.ativa ? "default" : "secondary"}>
                              {rifa.ativa ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {rifa.imagemUrl && (
                            <img
                              src={rifa.imagemUrl}
                              alt={rifa.nome}
                              className="h-40 w-full rounded-xl object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <p className="text-sm text-muted-foreground">{rifa.descricao}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-semibold">Preço:</span>{" "}
                              {moeda.format(Number(rifa.precoBilhete))}
                            </div>
                            <div>
                              <span className="font-semibold">Total:</span>{" "}
                              {rifa.totalBilhetes} bilhetes
                            </div>
                            {rifa.premio && (
                              <div>
                                <span className="font-semibold">Prêmio:</span> {rifa.premio}
                              </div>
                            )}
                            {rifa.dataSorteio && (
                              <div>
                                <span className="font-semibold">Sorteio:</span> {rifa.dataSorteio}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-[#2b2116] text-white"
                              onClick={() => setEditingRifa(rifa)}
                            >
                              <Edit2 className="mr-2 h-4 w-4" /> Editar
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`/rifa/${rifa.slug}`} target="_blank" rel="noreferrer">
                                Ver página pública
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── PRÊMIOS ── */}
          <TabsContent value="premios">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" /> Gestão de Prêmios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PremiosTab rifas={rifas} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PEDIDOS ── */}
          <TabsContent value="pedidos" className="space-y-6">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TicketCheck /> Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pedidos.length === 0 ? (
                  <p className="text-center text-muted-foreground">Nenhum pedido encontrado.</p>
                ) : (
                  pedidos.map((item) => {
                    const numeros = item.bilhetes.map((b) =>
                      String(b.numero).padStart(4, "0"),
                    );
                    const mensagem = `Olá ${item.comprador.nome}! Pagamento confirmado ✅ Seus bilhetes: ${numeros.join(", ")}. Boa sorte!`;
                    const waLink = `https://wa.me/${item.comprador.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;

                    return (
                      <div key={item.pedido.id} className="rounded-2xl border bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong>{item.pedido.codigo}</strong>
                              <StatusBadge status={item.pedido.status} />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.comprador.nome} · {item.comprador.telefone}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {moeda.format(Number(item.pedido.valorTotal))} ·{" "}
                              {item.pedido.quantidade} bilhete(s)
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {item.pedido.status === "pendente" && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() =>
                                  confirmarPedido.mutate({ pedidoId: item.pedido.id })
                                }
                                disabled={confirmarPedido.isPending}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirmar
                              </Button>
                            )}
                            {item.pedido.status !== "cancelado" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Cancelar este pedido?")) {
                                    cancelarPedido.mutate({ pedidoId: item.pedido.id });
                                  }
                                }}
                                disabled={cancelarPedido.isPending}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar
                              </Button>
                            )}
                            {item.pedido.status === "confirmado" && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={waLink} target="_blank" rel="noreferrer">
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  WhatsApp
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                        {item.bilhetes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.bilhetes.map((b) => (
                              <span
                                key={b.id}
                                className="rounded-full bg-[#21180f] px-3 py-1 text-xs font-semibold text-white"
                              >
                                {String(b.numero).padStart(4, "0")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FLYER ── */}
          <TabsContent value="flyer">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Flyer da Rifa</CardTitle>
              </CardHeader>
              <CardContent>
                {rifas.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma rifa cadastrada.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Selecionar rifa para o flyer</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue={rifas[0]?.id}
                        id="flyer-rifa-select"
                      >
                        {rifas.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <AdminFlyer
                      rifa={{
                        nome: rifas[0].nome,
                        descricao: rifas[0].descricao,
                        imagemUrl: rifas[0].imagemUrl,
                        premio: rifas[0].premio,
                        dataSorteio: rifas[0].dataSorteio,
                        pixChave: rifas[0].pixChave,
                        vendidos: 0,
                        totalBilhetes: rifas[0].totalBilhetes,
                        precoBilhete: rifas[0].precoBilhete,
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

// ─── Badge de Status ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "pendente" | "confirmado" | "cancelado" }) {
  const map = {
    pendente: { icon: Clock3, cls: "bg-amber-100 text-amber-800" },
    confirmado: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-800" },
    cancelado: { icon: XCircle, cls: "bg-red-100 text-red-800" },
  } as const;
  const Icon = map[status].icon;
  return (
    <Badge className={`${map[status].cls} gap-1 hover:${map[status].cls}`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}
