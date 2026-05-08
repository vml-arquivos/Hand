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
  Copy,
  Edit2,
  Gift,
  ImagePlus,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  QrCode,
  RefreshCw,
  Settings,
  ShieldCheck,
  TicketCheck,
  Trash2,
  UploadCloud,
  XCircle,
  Zap,
} from "lucide-react";
import QRCode from "qrcode";
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
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatarPrecoParaInput(valor: string | number): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  if (isNaN(num)) return "";
  return num.toFixed(2).replace(".", ",");
}

function parsearPreco(valor: string): number {
  const limpo = valor.trim().replace(/R\$\s*/gi, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(limpo);
}

// ─── Componente de Upload de Imagem ──────────────────────────────────────────
function ImageUpload({
  label,
  currentUrl,
  onUploaded,
  assetType,
  rifaId,
}: {
  label: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  assetType: "rifa_main" | "premio" | "comprovante";
  rifaId?: number;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadImagem = trpc.admin.uploadImagem.useMutation();

  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadImagem.mutateAsync({
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
      toast.error("Erro ao enviar: " + (err?.message ?? "Tente novamente."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
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
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP — máx. 8 MB</p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Formulário de Rifa ───────────────────────────────────────────────────────
function RifaForm({ rifa, onSaved }: { rifa?: RifaRow | null; onSaved: () => void }) {
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
    nomeRecebedor: "",
    cidadeRecebedor: "",
    ativa: rifa?.ativa ?? true,
  });

  const [qrPreview, setQrPreview] = useState("");
  const [gerandoPix, setGerandoPix] = useState(false);

  const salvarRifa = trpc.admin.salvarRifa.useMutation({
    onSuccess: () => {
      toast.success(isEdit ? "Rifa atualizada com sucesso!" : "Rifa criada com sucesso!");
      onSaved();
    },
    onError: (err) => toast.error("Erro ao salvar rifa: " + err.message),
  });

  const gerarPix = trpc.admin.gerarPix.useMutation({
    onSuccess: (data) => {
      setForm((p) => ({ ...p, pixCopiaCola: data.copiaCola }));
      toast.success(`Pix gerado! Chave detectada como: ${data.tipo.toUpperCase()}`);
    },
    onError: (err) => toast.error("Erro ao gerar Pix: " + err.message),
  });

  // Gera preview do QR Code quando o pixCopiaCola muda
  useEffect(() => {
    if (!form.pixCopiaCola || form.pixCopiaCola.length < 20) {
      setQrPreview("");
      return;
    }
    QRCode.toDataURL(form.pixCopiaCola, {
      margin: 1,
      width: 200,
      color: { dark: "#21180f", light: "#fffbf5" },
    })
      .then(setQrPreview)
      .catch(() => setQrPreview(""));
  }, [form.pixCopiaCola]);

  function handleChange(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleGerarPix() {
    if (!form.pixChave.trim()) {
      toast.error("Informe a chave Pix antes de gerar.");
      return;
    }
    if (!form.nomeRecebedor.trim()) {
      toast.error("Informe o nome do recebedor para gerar o Pix.");
      return;
    }
    setGerandoPix(true);
    try {
      await gerarPix.mutateAsync({
        pixChave: form.pixChave.trim(),
        nomeRecebedor: form.nomeRecebedor.trim(),
        cidade: form.cidadeRecebedor.trim() || undefined,
      });
    } finally {
      setGerandoPix(false);
    }
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
    if (!form.pixCopiaCola.trim() || form.pixCopiaCola.trim().length < 10) {
      toast.error("Gere ou informe o Pix Copia e Cola antes de salvar.");
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
      precoBilhete: precoNumerico.toFixed(2),
      pixChave: form.pixChave.trim(),
      pixCopiaCola: form.pixCopiaCola.trim(),
      nomeRecebedor: form.nomeRecebedor.trim() || undefined,
      cidadeRecebedor: form.cidadeRecebedor.trim() || undefined,
      ativa: form.ativa,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações básicas */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9b6b35]">
          Informações da rifa
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da rifa *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Ex: Rifa Beneficente da Escola"
              required
              minLength={3}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) =>
                handleChange(
                  "slug",
                  e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                )
              }
              placeholder="Ex: rifa-beneficente"
              required
              minLength={3}
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descricao">Descrição *</Label>
          <Textarea
            id="descricao"
            value={form.descricao}
            onChange={(e) => handleChange("descricao", e.target.value)}
            placeholder="Descreva o objetivo da rifa..."
            required
            minLength={10}
            rows={3}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="premio">Prêmio principal</Label>
            <Input
              id="premio"
              value={form.premio}
              onChange={(e) => handleChange("premio", e.target.value)}
              placeholder="Ex: Notebook Dell Inspiron"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dataSorteio">Data do sorteio</Label>
            <Input
              id="dataSorteio"
              type="date"
              value={form.dataSorteio}
              onChange={(e) => handleChange("dataSorteio", e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="totalBilhetes">Total de bilhetes *</Label>
            <Input
              id="totalBilhetes"
              type="number"
              min={1}
              value={form.totalBilhetes}
              onChange={(e) => handleChange("totalBilhetes", e.target.value)}
              required
              className="h-11"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="precoBilhete">Preço do bilhete (R$) *</Label>
            <Input
              id="precoBilhete"
              value={form.precoBilhete}
              onChange={(e) => handleChange("precoBilhete", e.target.value)}
              placeholder="Ex: 10,00"
              required
              className="h-11"
              inputMode="decimal"
            />
            <p className="text-xs text-muted-foreground">Use vírgula decimal. Ex: 10,00 ou 25,50</p>
          </div>
        </div>
      </div>

      <Separator className="bg-[#ecdcc5]" />

      {/* Configuração Pix */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#a06a31]" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9b6b35]">
            Configuração Pix
          </h3>
        </div>

        <div className="rounded-2xl border border-[#e5c07b] bg-[#fffaf2] p-4 space-y-4">
          <p className="text-xs text-[#7a5a3a] leading-relaxed">
            Informe a chave Pix e o nome do recebedor para gerar automaticamente o código Pix Copia e
            Cola e o QR Code estático (sem expiração).
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pixChave">Chave Pix *</Label>
              <Input
                id="pixChave"
                value={form.pixChave}
                onChange={(e) => handleChange("pixChave", e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                required
                minLength={3}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Aceita CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória (UUID)
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nomeRecebedor">Nome do recebedor *</Label>
              <Input
                id="nomeRecebedor"
                value={form.nomeRecebedor}
                onChange={(e) => handleChange("nomeRecebedor", e.target.value)}
                placeholder="Nome que aparece no Pix"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cidadeRecebedor">Cidade do recebedor</Label>
              <Input
                id="cidadeRecebedor"
                value={form.cidadeRecebedor}
                onChange={(e) => handleChange("cidadeRecebedor", e.target.value)}
                placeholder="Ex: São Paulo"
                className="h-11"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleGerarPix}
                disabled={gerandoPix || !form.pixChave.trim() || !form.nomeRecebedor.trim()}
                className="h-11 w-full bg-[#a06a31] text-white hover:bg-[#7f5525]"
              >
                {gerandoPix ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Gerar Pix automaticamente
              </Button>
            </div>
          </div>

          {/* Resultado do Pix gerado */}
          {form.pixCopiaCola && (
            <div className="space-y-3 rounded-xl border border-[#d5b078] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#2b2116]">Pix Copia e Cola gerado</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(form.pixCopiaCola);
                    toast.success("Copiado!");
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-[#d5b078] px-2.5 py-1 text-xs text-[#5b3a1c] transition hover:bg-[#f4dfbc]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </button>
              </div>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                {qrPreview && (
                  <img
                    src={qrPreview}
                    alt="QR Code Pix"
                    className="h-28 w-28 shrink-0 rounded-xl border border-[#ecdcc5] bg-white p-2"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-all rounded-lg bg-[#f7f1e8] px-3 py-2 font-mono text-xs text-[#493624]">
                    {form.pixCopiaCola}
                  </p>
                  <p className="mt-1.5 text-xs text-green-700">
                    ✓ QR Code estático — não expira
                  </p>
                </div>
              </div>
              {/* Campo editável manual */}
              <details className="group">
                <summary className="cursor-pointer text-xs text-[#9b6b35] hover:underline">
                  Editar manualmente
                </summary>
                <div className="mt-2 space-y-1.5">
                  <Input
                    value={form.pixCopiaCola}
                    onChange={(e) => handleChange("pixCopiaCola", e.target.value)}
                    placeholder="Código completo do Pix Copia e Cola"
                    className="font-mono text-xs"
                  />
                </div>
              </details>
            </div>
          )}

          {/* Campo Pix quando ainda não foi gerado */}
          {!form.pixCopiaCola && (
            <div className="space-y-1.5">
              <Label htmlFor="pixCopiaCola">
                Pix Copia e Cola *{" "}
                <span className="font-normal text-[#9b6b35]">(ou gere acima)</span>
              </Label>
              <Input
                id="pixCopiaCola"
                value={form.pixCopiaCola}
                onChange={(e) => handleChange("pixCopiaCola", e.target.value)}
                placeholder="Cole aqui o código Pix Copia e Cola"
                className="font-mono text-xs h-11"
              />
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-[#ecdcc5]" />

      {/* Upload de imagem */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9b6b35]">
          Imagem da rifa
        </h3>
        <ImageUpload
          label="Imagem principal"
          currentUrl={form.imagemUrl || null}
          assetType="rifa_main"
          rifaId={rifa?.id}
          onUploaded={(url) => handleChange("imagemUrl", url)}
        />
        {form.imagemUrl && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL da imagem</Label>
            <Input value={form.imagemUrl} readOnly className="text-xs text-muted-foreground" />
          </div>
        )}
      </div>

      <Separator className="bg-[#ecdcc5]" />

      {/* Status */}
      <div className="flex items-center gap-3 rounded-xl border border-[#ecdcc5] bg-white px-4 py-3">
        <Switch
          id="ativa"
          checked={form.ativa}
          onCheckedChange={(v) => handleChange("ativa", v)}
        />
        <div>
          <Label htmlFor="ativa" className="cursor-pointer font-semibold">
            Rifa ativa
          </Label>
          <p className="text-xs text-muted-foreground">Visível ao público quando ativada</p>
        </div>
      </div>

      <Button
        type="submit"
        className="h-12 w-full bg-[#2b2116] text-base font-semibold text-white hover:bg-[#3d2e1e]"
        disabled={salvarRifa.isPending}
      >
        {salvarRifa.isPending ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <Settings className="mr-2 h-5 w-5" />
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#ecdcc5] bg-white p-4 shadow-sm">
      <h4 className="font-semibold text-[#1a0f06]">{isEdit ? "Editar prêmio" : "Novo prêmio"}</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input
            value={form.titulo}
            onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
            placeholder="Ex: 1º Prêmio — Notebook"
            required
            minLength={2}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Ordem de exibição</Label>
          <Input
            type="number"
            min={0}
            value={form.ordem}
            onChange={(e) => setForm((p) => ({ ...p, ordem: e.target.value }))}
            className="h-11"
            inputMode="numeric"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea
          value={form.descricao}
          onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
          placeholder="Detalhes do prêmio..."
          rows={2}
        />
      </div>
      <ImageUpload
        label="Foto do prêmio"
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
        <Label className="cursor-pointer">Prêmio ativo</Label>
      </div>
      <div className="flex gap-3">
        <Button
          type="submit"
          className="flex-1 bg-[#2b2116] text-white hover:bg-[#3d2e1e]"
          disabled={salvarPremio.isPending}
        >
          {salvarPremio.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isEdit ? "Salvar" : "Adicionar prêmio"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const dashboard = trpc.admin.dashboard.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => setLocation("/admin/login"),
  });

  const [editingRifa, setEditingRifa] = useState<RifaRow | null>(null);
  const [selectedRifaId, setSelectedRifaId] = useState<number | null>(null);
  const [editingPremio, setEditingPremio] = useState<PremioRow | null | undefined>(undefined);
  const [showPremioForm, setShowPremioForm] = useState(false);

  const premios = trpc.admin.listPremios.useQuery(
    { rifaId: selectedRifaId! },
    { enabled: !!selectedRifaId },
  );

  const confirmarPedido = trpc.admin.confirmarPedido.useMutation({
    onSuccess: () => {
      toast.success("Pedido confirmado!");
      utils.admin.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelarPedido = trpc.admin.cancelarPedido.useMutation({
    onSuccess: () => {
      toast.success("Pedido cancelado.");
      utils.admin.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removerPremio = trpc.admin.removerPremio.useMutation({
    onSuccess: () => {
      toast.success("Prêmio removido.");
      utils.admin.listPremios.invalidate({ rifaId: selectedRifaId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const { pedidos, stats, rifas } = dashboard.data ?? {};

  const pendentes = pedidos?.filter((p) => p.pedido.status === "pendente") ?? [];
  const confirmados = pedidos?.filter((p) => p.pedido.status === "confirmado") ?? [];

  if (dashboard.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f1e8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8a5a2b]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f1e8]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#e6d8c1] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#a06a31]" />
            <span className="font-bold text-[#1a0f06]">Painel Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            className="text-[#7a5a3a] hover:bg-[#f4dfbc]"
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        {/* ── Cards de estatísticas ─────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Pendentes",
              value: stats?.pendente?.quantidade ?? 0,
              icon: <Clock3 className="h-5 w-5 text-amber-600" />,
              bg: "bg-amber-50",
              text: "text-amber-800",
            },
            {
              label: "Confirmados",
              value: stats?.confirmado?.quantidade ?? 0,
              icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
              bg: "bg-green-50",
              text: "text-green-800",
            },
            {
              label: "Bilhetes vendidos",
              value: stats?.bilhetesConfirmados ?? 0,
              icon: <TicketCheck className="h-5 w-5 text-blue-600" />,
              bg: "bg-blue-50",
              text: "text-blue-800",
            },
            {
              label: "Receita confirmada",
              value: moeda.format(Number(stats?.confirmado?.valor ?? 0)),
              icon: <ShieldCheck className="h-5 w-5 text-[#a06a31]" />,
              bg: "bg-[#fdf8f0]",
              text: "text-[#5b3a1c]",
              isText: true,
            },
          ].map((s, i) => (
            <Card key={i} className={`border-0 ${s.bg} shadow-sm`}>
              <CardContent className="p-4">
                <div className="mb-2">{s.icon}</div>
                <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs principais ───────────────────────────────────────────── */}
        <Tabs defaultValue="pedidos">
          <TabsList className="mb-6 h-auto w-full flex-wrap gap-1 bg-[#f0e8d8] p-1">
            <TabsTrigger value="pedidos" className="flex-1 text-xs sm:text-sm">
              <Clock3 className="mr-1.5 h-4 w-4" />
              Pedidos
              {pendentes.length > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 bg-amber-500 px-1.5 text-xs text-white">
                  {pendentes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rifas" className="flex-1 text-xs sm:text-sm">
              <Settings className="mr-1.5 h-4 w-4" />
              Rifas
            </TabsTrigger>
            <TabsTrigger value="premios" className="flex-1 text-xs sm:text-sm">
              <Gift className="mr-1.5 h-4 w-4" />
              Prêmios
            </TabsTrigger>
            <TabsTrigger value="flyer" className="flex-1 text-xs sm:text-sm">
              <UploadCloud className="mr-1.5 h-4 w-4" />
              Flyer
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Pedidos ──────────────────────────────────────────────── */}
          <TabsContent value="pedidos" className="space-y-4">
            {pendentes.length === 0 && confirmados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white py-12 text-center">
                <TicketCheck className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
                <p className="text-[#7a5a3a]">Nenhum pedido ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...pendentes, ...confirmados].map(({ pedido, comprador, rifa: r, bilhetes }) => (
                  <Card key={pedido.id} className="border-[#ecdcc5] bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={
                                pedido.status === "confirmado"
                                  ? "bg-green-100 text-green-800"
                                  : pedido.status === "cancelado"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                              }
                            >
                              {pedido.status === "confirmado" ? (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              ) : pedido.status === "cancelado" ? (
                                <XCircle className="mr-1 h-3 w-3" />
                              ) : (
                                <Clock3 className="mr-1 h-3 w-3" />
                              )}
                              {pedido.status}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground">
                              {pedido.codigo}
                            </span>
                          </div>
                          <p className="mt-1.5 font-semibold text-[#1a0f06]">{comprador.nome}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#7a5a3a]">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {comprador.telefone}
                            </span>
                            <span>{pedido.quantidade} bilhete(s)</span>
                            <span className="font-semibold text-[#1a0f06]">
                              {moeda.format(Number(pedido.valorTotal))}
                            </span>
                          </div>
                          {bilhetes?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {bilhetes.map((b: any) => (
                                <span
                                  key={b.id}
                                  className="rounded-full bg-[#21180f] px-2.5 py-0.5 text-xs font-semibold text-white"
                                >
                                  {String(b.numero).padStart(4, "0")}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {pedido.status === "pendente" && (
                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <Button
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                              onClick={() => confirmarPedido.mutate({ pedidoId: pedido.id })}
                              disabled={confirmarPedido.isPending}
                            >
                              {confirmarPedido.isPending ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              )}
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => cancelarPedido.mutate({ pedidoId: pedido.id })}
                              disabled={cancelarPedido.isPending}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Rifas ────────────────────────────────────────────────── */}
          <TabsContent value="rifas" className="space-y-6">
            {editingRifa !== undefined && (
              <Card className="border-[#ecdcc5] bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {editingRifa?.id ? `Editando: ${editingRifa.nome}` : "Nova rifa"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RifaForm
                    rifa={editingRifa}
                    onSaved={() => {
                      setEditingRifa(undefined as any);
                      utils.admin.dashboard.invalidate();
                    }}
                  />
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1a0f06]">Rifas cadastradas</h3>
                <Button
                  size="sm"
                  className="bg-[#2b2116] text-white hover:bg-[#3d2e1e]"
                  onClick={() => setEditingRifa(null)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nova rifa
                </Button>
              </div>

              {!rifas?.length ? (
                <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white py-10 text-center">
                  <Settings className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
                  <p className="text-[#7a5a3a]">Nenhuma rifa cadastrada.</p>
                </div>
              ) : (
                rifas.map((r) => (
                  <Card key={r.id} className="border-[#ecdcc5] bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#1a0f06]">{r.nome}</p>
                            <Badge
                              className={
                                r.ativa
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {r.ativa ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-[#7a5a3a]">
                            {moeda.format(Number(r.precoBilhete))} · {r.totalBilhetes} bilhetes ·{" "}
                            <span className="font-mono text-xs">{r.slug}</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingRifa(r as RifaRow)}
                          className="shrink-0"
                        >
                          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Tab: Prêmios ──────────────────────────────────────────────── */}
          <TabsContent value="premios" className="space-y-4">
            {/* Seletor de rifa */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Selecione a rifa</Label>
              <select
                value={selectedRifaId ?? ""}
                onChange={(e) => {
                  setSelectedRifaId(Number(e.target.value) || null);
                  setShowPremioForm(false);
                  setEditingPremio(undefined);
                }}
                className="h-11 w-full rounded-xl border border-[#d5b078] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#a06a31]"
              >
                <option value="">Selecione uma rifa...</option>
                {rifas?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>

            {selectedRifaId && (
              <>
                {/* Formulário de prêmio */}
                {(showPremioForm || editingPremio !== undefined) && (
                  <PremioForm
                    rifaId={selectedRifaId}
                    premio={editingPremio}
                    onSaved={() => {
                      setShowPremioForm(false);
                      setEditingPremio(undefined);
                      utils.admin.listPremios.invalidate({ rifaId: selectedRifaId });
                    }}
                    onCancel={() => {
                      setShowPremioForm(false);
                      setEditingPremio(undefined);
                    }}
                  />
                )}

                {/* Lista de prêmios */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#1a0f06]">Prêmios cadastrados</h3>
                    <Button
                      size="sm"
                      className="bg-[#2b2116] text-white hover:bg-[#3d2e1e]"
                      onClick={() => {
                        setEditingPremio(null);
                        setShowPremioForm(true);
                      }}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Novo prêmio
                    </Button>
                  </div>

                  {premios.isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[#8a5a2b]" />
                    </div>
                  ) : !premios.data?.length ? (
                    <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white py-10 text-center">
                      <Gift className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
                      <p className="text-[#7a5a3a]">Nenhum prêmio cadastrado.</p>
                    </div>
                  ) : (
                    premios.data.map((p) => (
                      <Card key={p.id} className="border-[#ecdcc5] bg-white shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {p.imagemUrl ? (
                              <img
                                src={p.imagemUrl}
                                alt={p.titulo}
                                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[#f4dfbc]">
                                <Gift className="h-7 w-7 text-[#a06a31]" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-[#1a0f06]">{p.titulo}</p>
                                <Badge className="text-xs">Ordem: {p.ordem}</Badge>
                                {!p.ativo && (
                                  <Badge variant="outline" className="text-xs text-gray-500">
                                    Inativo
                                  </Badge>
                                )}
                              </div>
                              {p.descricao && (
                                <p className="mt-1 text-sm text-[#7a5a3a]">{p.descricao}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingPremio(p as PremioRow);
                                  setShowPremioForm(true);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("Remover este prêmio?")) {
                                    removerPremio.mutate({ id: p.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Tab: Flyer ────────────────────────────────────────────────── */}
          <TabsContent value="flyer">
            {rifas && rifas.length > 0 ? (
              <AdminFlyer rifa={rifas[0] as any} />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white py-10 text-center">
                <UploadCloud className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
                <p className="text-[#7a5a3a]">Crie uma rifa primeiro para gerar o flyer.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
