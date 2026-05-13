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
  Download,
  Edit2,
  Gift,
  ImagePlus,
  ListOrdered,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TicketCheck,
  Trash2,
  Trophy,
  UploadCloud,
  Users,
  UserPlus,
  UserX,
  UserCheck,
  Eye,
  EyeOff,
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
  thumbnailUrl?: string | null;
  totalBilhetes: number;
  precoBilhete: string;
  pixChave: string;
  pixCopiaCola: string;
  ativa: boolean;
  rastreamentoVendedores: boolean;
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
  description,
  currentUrl,
  onUploaded,
  assetType,
  rifaId,
  aspectRatio = "video",
}: {
  label: string;
  description?: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  assetType: "rifa_main" | "premio" | "comprovante";
  rifaId?: number;
  aspectRatio?: "video" | "square";
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

  const frameRatioClass =
    aspectRatio === "square"
      ? "mx-auto aspect-square w-full max-w-[320px]"
      : "aspect-[16/9] w-full";

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-sm font-semibold">{label}</Label>
        {description ? (
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div
        className={`relative flex ${frameRatioClass} min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-[#d5b078] bg-[#fdf8f0] transition hover:border-[#a06a31] hover:bg-[#faf0e0]`}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[#a06a31]" />
        ) : preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full rounded-lg object-contain p-2"
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
    thumbnailUrl: rifa?.thumbnailUrl ?? "",
    totalBilhetes: String(rifa?.totalBilhetes ?? "100"),
    precoBilhete: formatarPrecoParaInput(rifa?.precoBilhete ?? "10"),
    pixChave: rifa?.pixChave ?? "",
    pixCopiaCola: rifa?.pixCopiaCola ?? "",
    nomeRecebedor: "",
    cidadeRecebedor: "",
    ativa: rifa?.ativa ?? true,
    rastreamentoVendedores: rifa?.rastreamentoVendedores ?? false,
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
      thumbnailUrl: form.thumbnailUrl.trim() || "",
      totalBilhetes,
      precoBilhete: precoNumerico.toFixed(2),
      pixChave: form.pixChave.trim(),
      pixCopiaCola: form.pixCopiaCola.trim(),
      nomeRecebedor: form.nomeRecebedor.trim() || undefined,
      cidadeRecebedor: form.cidadeRecebedor.trim() || undefined,
      ativa: form.ativa,
      rastreamentoVendedores: form.rastreamentoVendedores,
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
        <div className="flex items-center gap-2 rounded-xl border border-[#e6d8c1] bg-white p-4">
          <Switch
            id="rastreamentoVendedores"
            checked={form.rastreamentoVendedores}
            onCheckedChange={(v) => handleChange("rastreamentoVendedores", v)}
          />
          <div className="space-y-0.5">
            <Label htmlFor="rastreamentoVendedores" className="text-sm font-bold">
              Rastreamento por Aluno/Vendedor
            </Label>
            <p className="text-xs text-muted-foreground">
              Ative para gerar links exclusivos e acompanhar o ranking de vendas por aluno.
            </p>
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
          Imagens da rifa
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Imagem principal */}
          <div className="space-y-2">
            <ImageUpload
              label="Imagem principal (exibida na página de compra)"
              description="Use arte horizontal 16:9 — ideal 1600×900px ou 1920×1080px. A página pública exibe a imagem inteira, sem corte, no mobile, tablet e desktop."
              currentUrl={form.imagemUrl || null}
              assetType="rifa_main"
              rifaId={rifa?.id}
              aspectRatio="video"
              onUploaded={(url) => handleChange("imagemUrl", url)}
            />
          </div>
          {/* Thumbnail Open Graph */}
          <div className="space-y-2">
            <ImageUpload
              label="Thumbnail (preview ao compartilhar link)"
              description="Use imagem quadrada 1:1 — ideal 1080×1080px. Essa imagem aparece melhor no WhatsApp, Instagram e redes sociais."
              currentUrl={form.thumbnailUrl || null}
              assetType="rifa_main"
              rifaId={rifa?.id}
              aspectRatio="square"
              onUploaded={(url) => handleChange("thumbnailUrl", url)}
            />
            {form.thumbnailUrl && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <span className="text-xs font-medium text-green-700">✓ Thumbnail configurada — aparecerá ao compartilhar o link</span>
              </div>
            )}
          </div>
        </div>
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
        description="Use fotos horizontais 16:9 — ideal 1600×900px ou 1920×1080px. Na página pública elas aparecem em cards grandes, sem corte."
        currentUrl={form.imagemUrl || null}
        assetType="premio"
        rifaId={rifaId}
        aspectRatio="video"
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
  const me = trpc.auth.me.useQuery();
  const adminRole = me.data?.role ?? "admin";
  const adminName = me.data?.name ?? "";
  const [editingRifa, setEditingRifa] = useState<RifaRow | null>(null);
  const [selectedRifaId, setSelectedRifaId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("pedidos");

  // Auto-seleciona a primeira rifa quando os dados carregam
  useEffect(() => {
    const rifas = dashboard.data?.rifas;
    if (rifas && rifas.length > 0 && !selectedRifaId) {
      setSelectedRifaId(rifas[0].id);
    }
  }, [dashboard.data?.rifas, selectedRifaId]);
  const [editingPremio, setEditingPremio] = useState<PremioRow | null | undefined>(undefined);
  const [showPremioForm, setShowPremioForm] = useState(false);

  const premios = trpc.admin.listPremios.useQuery(
    { rifaId: selectedRifaId! },
    { enabled: !!selectedRifaId },
  );

  // Rastreia pedidos recém-confirmados para exibir botão WhatsApp
  const [pedidosConfirmados, setPedidosConfirmados] = useState<Record<number, { telefone: string; codigo: string; numeros: number[] }>>({});

  const confirmarPedido = trpc.admin.confirmarPedido.useMutation({
    onSuccess: (data, variables) => {
      // Encontra o pedido confirmado para montar o link WhatsApp
      const item = [...(pedidos ?? [])].find(p => p.pedido.id === variables.pedidoId);
      if (item) {
        setPedidosConfirmados(prev => ({
          ...prev,
          [variables.pedidoId]: {
            telefone: item.comprador.telefone,
            codigo: item.pedido.codigo,
            numeros: data?.numeros ?? [],
          },
        }));
      }
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <TabsTrigger value="bilhetes" className="flex-1 text-xs sm:text-sm">
              <ListOrdered className="mr-1.5 h-4 w-4" />
              Bilhetes
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="flex-1 text-xs sm:text-sm">
              <Users className="mr-1.5 h-4 w-4" />
              Alunos
            </TabsTrigger>
            {adminRole === "super_admin" && (
              <TabsTrigger value="usuarios" className="flex-1 text-xs sm:text-sm">
                <Users className="mr-1.5 h-4 w-4" />
                Usuários
              </TabsTrigger>
            )}
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
                        {/* Botão WhatsApp após confirmação */}
                        {pedido.status === "confirmado" && pedidosConfirmados[pedido.id] && (() => {
                          const info = pedidosConfirmados[pedido.id];
                          const nums = bilhetes?.map((b: any) => String(b.numero).padStart(4, "0")).join(", ") || info.numeros.map(n => String(n).padStart(4, "0")).join(", ");
                          const link = `${window.location.origin}/comprovante/${info.codigo}`;
                          const msg = encodeURIComponent(
                            `✅ *Pagamento confirmado!*\n\nOlá, ${comprador.nome.split(" ")[0]}! Seu pagamento foi confirmado.\n\n🎫 *Seus bilhetes:* ${nums}\n\n🔗 Acesse seu comprovante:\n${link}\n\nObrigado por participar! 💚`
                          );
                          const tel = info.telefone.replace(/\D/g, "");
                          const waUrl = `https://wa.me/55${tel}?text=${msg}`;
                          return (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Enviar WhatsApp
                            </a>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Rifas ────────────────────────────────────────────────── */}
          <TabsContent value="rifas" className="space-y-6">
            {editingRifa !== null && (
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
      setEditingRifa(null);
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
                          onClick={() => {
                            setEditingRifa(r as RifaRow);
                            setActiveTab("rifas");
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
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
                                className="h-24 w-36 shrink-0 rounded-xl bg-[#fffaf2] object-contain p-1"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="grid h-24 w-36 shrink-0 place-items-center rounded-xl bg-[#f4dfbc]">
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

          {/* ── Tab: Bilhetes (controle do sorteio) ─────────────────── */}
          <TabsContent value="bilhetes">
            <BilhetesTab rifas={rifas ?? []} />
          </TabsContent>
          <TabsContent value="vendedores">
            <VendedoresTab rifas={rifas ?? []} />
          </TabsContent>
          {adminRole === "super_admin" && (
            <TabsContent value="usuarios">
              <UsuariosTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

// ─── Componente BilhetesTab ────────────────────────────────────────────────
type RifaItem = { id: number; nome: string; totalBilhetes: number };

function BilhetesTab({ rifas }: { rifas: RifaItem[] }) {
  const [rifaId, setRifaId] = useState<number | null>(rifas[0]?.id ?? null);
  const [busca, setBusca] = useState("");
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const utils = trpc.useUtils();
  const limparBilhetes = trpc.admin.limparBilhetesTeste.useMutation({
    onSuccess: (data) => {
      toast.success(`${(data as { pedidosRemovidos: number }).pedidosRemovidos} pedido(s) removido(s) com sucesso.`);
      setConfirmandoLimpeza(false);
      utils.admin.listBilhetes.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: bilhetes, isLoading } = trpc.admin.listBilhetes.useQuery(
    { rifaId: rifaId! },
    { enabled: !!rifaId },
  );

  const moeda = new Intl.NumberFormat("pt-BR");

  const filtrados = (bilhetes ?? []).filter(b => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      String(b.numero).includes(q) ||
      b.compradorNome.toLowerCase().includes(q) ||
      b.compradorTelefone.includes(q) ||
      b.pedidoCodigo.toLowerCase().includes(q)
    );
  });

  function exportarCSV() {
    if (!filtrados.length) return;
    const header = "Numero,Nome,Telefone,Email,Pedido,Data";
    const rows = filtrados.map(b =>
      [
        b.numero,
        `"${b.compradorNome}"`,
        b.compradorTelefone,
        b.compradorEmail ?? "",
        b.pedidoCodigo,
        new Date(b.createdAt).toLocaleString("pt-BR"),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bilhetes-sorteio-${rifaId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sortearVencedor() {
    if (!filtrados.length) return;
    const idx = Math.floor(Math.random() * filtrados.length);
    const vencedor = filtrados[idx];
    toast.success(
      `🎉 Bilhete sorteado: #${String(vencedor.numero).padStart(4, "0")} — ${vencedor.compradorNome}`,
      { duration: 10000 },
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de rifa */}
      {rifas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {rifas.map(r => (
            <button
              key={r.id}
              onClick={() => setRifaId(r.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                rifaId === r.id
                  ? "bg-[#21180f] text-white"
                  : "bg-white text-[#593b1f] hover:bg-[#f4dfbc]"
              }`}
            >
              {r.nome}
            </button>
          ))}
        </div>
      )}

      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b6b35]" />
          <Input
            placeholder="Buscar por número, nome, telefone ou código..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="h-10 border-[#d5b078] pl-9 focus-visible:ring-[#a06a31]"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 border-[#d5b078] text-[#593b1f] hover:bg-[#f4dfbc]"
          onClick={exportarCSV}
          disabled={!filtrados.length}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Exportar CSV
        </Button>
        <Button
          size="sm"
          className="h-10 bg-[#21180f] text-white hover:bg-[#3d2e1e]"
          onClick={sortearVencedor}
          disabled={!filtrados.length}
        >
          <Trophy className="mr-1.5 h-4 w-4" />
          Sortear
        </Button>
        {/* Botão apagar bilhetes de teste */}
        {!confirmandoLimpeza ? (
          <Button
            variant="outline"
            size="sm"
            className="h-10 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setConfirmandoLimpeza(true)}
            disabled={!rifaId}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Apagar testes</span>
            <span className="sm:hidden">Apagar</span>
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5">
            <span className="text-xs font-medium text-red-700">Apagar pedidos pendentes desta rifa?</span>
            <Button
              size="sm"
              className="h-7 bg-red-600 text-xs text-white hover:bg-red-700"
              onClick={() => rifaId && limparBilhetes.mutate({ rifaId, apenasStatus: "pendente" })}
              disabled={limparBilhetes.isPending}
            >
              {limparBilhetes.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-600"
              onClick={() => setConfirmandoLimpeza(false)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Resumo */}
      {bilhetes && (
        <div className="flex flex-wrap gap-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-[#a06a31]" />
            <div>
              <p className="text-xs text-[#9b6b35]">Bilhetes confirmados</p>
              <p className="text-xl font-bold text-[#1a0f06]">{moeda.format(bilhetes.length)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#a06a31]" />
            <div>
              <p className="text-xs text-[#9b6b35]">Compradores únicos</p>
              <p className="text-xl font-bold text-[#1a0f06]">
                {new Set(bilhetes.map(b => b.compradorTelefone)).size}
              </p>
            </div>
          </div>
          {busca && (
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-[#a06a31]" />
              <div>
                <p className="text-xs text-[#9b6b35]">Resultados da busca</p>
                <p className="text-xl font-bold text-[#1a0f06]">{filtrados.length}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de bilhetes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#a06a31]" />
        </div>
      ) : !bilhetes || bilhetes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white py-12 text-center">
          <ListOrdered className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
          <p className="font-semibold text-[#2e2013]">Nenhum bilhete confirmado ainda</p>
          <p className="mt-1 text-sm text-[#7a5a3a]">Os bilhetes aparecem aqui após a confirmação do pagamento.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#ecdcc5] bg-white shadow-sm">
          {/* Cabeçalho da tabela */}
          <div className="hidden grid-cols-[80px_1fr_160px_160px_120px] gap-4 border-b border-[#ecdcc5] bg-[#f7f1e8] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#9b6b35] sm:grid">
            <span>Número</span>
            <span>Comprador</span>
            <span>Telefone</span>
            <span>Código do Pedido</span>
            <span>Data</span>
          </div>
          {/* Linhas */}
          <div className="divide-y divide-[#f0e8d8]">
            {filtrados.map(b => (
              <div
                key={b.bilheteId}
                className="grid grid-cols-1 gap-1 px-4 py-3 text-sm transition hover:bg-[#fdf8f2] sm:grid-cols-[80px_1fr_160px_160px_120px] sm:items-center sm:gap-4"
              >
                {/* Número */}
                <span className="font-mono text-base font-bold text-[#1a0f06] sm:text-sm">
                  {String(b.numero).padStart(4, "0")}
                </span>
                {/* Comprador */}
                <div>
                  <p className="font-semibold text-[#1a0f06]">{b.compradorNome}</p>
                  {b.compradorEmail && (
                    <p className="text-xs text-[#9b6b35]">{b.compradorEmail}</p>
                  )}
                </div>
                {/* Telefone */}
                <span className="text-[#593b1f]">{b.compradorTelefone}</span>
                {/* Código do pedido */}
                <a
                  href={`/comprovante/${b.pedidoCodigo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[#a06a31] hover:underline"
                >
                  {b.pedidoCodigo}
                </a>
                {/* Data */}
                <span className="text-xs text-[#9b6b35]">
                  {new Date(b.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente UsuariosTab ────────────────────────────────────────────────
function UsuariosTab() {
  const utils = trpc.useUtils();
  const { data: usuarios, isLoading } = trpc.admin.listUsuarios.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" as "admin" | "operador" });
  const [showPassword, setShowPassword] = useState(false);

  const criarUsuario = trpc.admin.criarUsuario.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "admin" });
      utils.admin.listUsuarios.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleUsuario = trpc.admin.toggleUsuario.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.active ? "Usuário ativado." : "Usuário desativado.");
      utils.admin.listUsuarios.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const roleLabel: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Administrador",
    operador: "Operador",
  };

  const roleBadgeColor: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-800",
    admin: "bg-blue-100 text-blue-800",
    operador: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1a0f06]">Gestão de Usuários</h3>
          <p className="text-sm text-[#9b6b35]">Gerencie quem pode acessar o painel admin</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#2b2116] text-white hover:bg-[#3d2e1e]"
          size="sm"
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="rounded-2xl border border-[#ecdcc5] bg-white p-5 shadow-sm">
          <h4 className="mb-4 font-semibold text-[#1a0f06]">Criar novo usuário</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: João Silva"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="joao@email.com"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Senha *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b6b35]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nível de acesso *</Label>
              <select
                value={form.role}
                onChange={(e) => setForm(p => ({ ...p, role: e.target.value as "admin" | "operador" }))}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="admin">Administrador (gerencia rifas próprias)</option>
                <option value="operador">Operador (confirma pedidos apenas)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => criarUsuario.mutate(form)}
              disabled={criarUsuario.isPending || !form.name || !form.email || !form.password}
              className="flex-1 bg-[#2b2116] text-white hover:bg-[#3d2e1e]"
            >
              {criarUsuario.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar usuário
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de usuários */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#a06a31]" />
        </div>
      ) : !usuarios?.length ? (
        <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white py-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
          <p className="text-[#9b6b35]">Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className={`flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm transition ${
                u.active ? "border-[#ecdcc5]" : "border-red-100 opacity-60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#1a0f06]">{u.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeColor[u.role] ?? "bg-gray-100 text-gray-700"}`}>
                    {roleLabel[u.role] ?? u.role}
                  </span>
                  {!u.active && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-[#9b6b35]">{u.email}</p>
                <p className="text-xs text-[#c4a06a]">
                  Criado em {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {u.role !== "super_admin" && (
                <div className="ml-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleUsuario.mutate({ id: u.id, active: !u.active })}
                    disabled={toggleUsuario.isPending}
                    className={u.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-700 hover:bg-green-50"}
                  >
                    {u.active ? (
                      <><UserX className="mr-1 h-3.5 w-3.5" /> Desativar</>
                    ) : (
                      <><UserCheck className="mr-1 h-3.5 w-3.5" /> Ativar</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legenda de permissões */}
      <div className="rounded-xl border border-[#ecdcc5] bg-[#fdf8f0] p-4 text-sm text-[#7a5a3a]">
        <p className="mb-2 font-semibold text-[#5b3a1c]">Níveis de acesso:</p>
        <ul className="space-y-1">
          <li><span className="font-medium text-purple-700">Super Admin</span> — acesso total: vê todas as rifas, gerencia usuários</li>
          <li><span className="font-medium text-blue-700">Administrador</span> — gerencia apenas as rifas criadas por ele</li>
          <li><span className="font-medium text-gray-700">Operador</span> — confirma/cancela pedidos das rifas do seu admin</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Aba de Vendedores (Alunos) ──────────────────────────────────────────────
function VendedoresTab({ rifas }: { rifas: any[] }) {
  const [selectedRifaId, setSelectedRifaId] = useState<number | null>(rifas[0]?.id ?? null);
  const [importing, setImporting] = useState(false);
  const [rawText, setRawText] = useState("");
  const utils = trpc.useUtils();
  
  const selectedRifa = rifas.find(r => r.id === selectedRifaId);
  
  const { data: vendedores, isLoading: loadingVendedores } = trpc.admin.listVendedores.useQuery(
    { rifaId: selectedRifaId! },
    { enabled: !!selectedRifaId }
  );
  const { data: ranking, isLoading: loadingRanking } = trpc.admin.rankingVendedores.useQuery(
    { rifaId: selectedRifaId! },
    { enabled: !!selectedRifaId }
  );
  
  const importar = trpc.admin.importarVendedores.useMutation({
    onSuccess: () => {
      toast.success("Alunos importados com sucesso!");
      setImporting(false);
      setRawText("");
      utils.admin.listVendedores.invalidate({ rifaId: selectedRifaId! });
    },
    onError: (err) => toast.error("Erro ao importar: " + err.message),
  });

  function handleImport() {
    if (!selectedRifaId) return;
    const lines = rawText.split("\n").filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      toast.error("Cole os dados dos alunos (Professor;Turma;Aluno), um por linha.");
      return;
    }
    
    const data = lines.map(line => {
      const parts = line.split(";").map(p => p.trim());
      let professor = "";
      let turma = "";
      let nome = "";

      if (parts.length >= 3) {
        [professor, turma, nome] = parts;
      } else if (parts.length === 2) {
        [turma, nome] = parts;
      } else {
        nome = parts[0];
      }

      const slug = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 15);
      const rand = Math.floor(100 + Math.random() * 900);
      return { nome, professor, turma, codigo: `${slug}-${rand}` };
    });
    
    importar.mutate({ rifaId: selectedRifaId, vendedores: data });
  }

  const siteUrl = window.location.origin;

  return (
    <div className="space-y-6">
      {/* Seletor de Rifa */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Selecione a rifa para gerenciar alunos</Label>
        <select
          value={selectedRifaId ?? ""}
          onChange={(e) => setSelectedRifaId(Number(e.target.value) || null)}
          className="h-11 w-full rounded-xl border border-[#d5b078] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#a06a31]"
        >
          <option value="">Selecione uma rifa...</option>
          {rifas.map((r) => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>
      </div>

      {selectedRifaId && (
        <div className="space-y-8">
          {/* Ranking */}
          <Card className="border-[#e6d8c1] bg-white shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#2b2116]">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Ranking de Vendas
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => utils.admin.rankingVendedores.invalidate({ rifaId: selectedRifaId })}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRanking ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#a06a31]" /></div>
              ) : !ranking?.length ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda confirmada vinculada a alunos ainda.</div>
              ) : (
                <div className="space-y-3">
                  {ranking.map((r, idx) => (
                    <div key={r.vendedorId} className="flex items-center justify-between rounded-xl border border-[#ecdcc5] bg-[#fffaf2] p-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-[#2b2116]'}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-[#1a0f06]">{r.nome}</p>
                          <p className="text-[10px] text-[#9b6b35]">
                            {r.professor && `Prof: ${r.professor}`} {r.turma && `· Turma: ${r.turma}`}
                          </p>
                          <p className="text-xs text-[#9b6b35]">{r.totalPedidos} pedido(s)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1a0f06]">{r.totalBilhetes} bilhetes</p>
                        <p className="text-xs text-[#9b6b35]">{moeda.format(parseFloat(r.totalValor))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gestão de Alunos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9b6b35]">Alunos Cadastrados</h3>
              <Button size="sm" onClick={() => setImporting(true)} className="bg-[#2b2116] text-white hover:bg-[#3d2e1e]">
                <Plus className="mr-1.5 h-4 w-4" /> Importar Lista
              </Button>
            </div>

            {importing && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Cole os dados (Professor; Turma; Aluno) - um por linha</Label>
                    <p className="text-[10px] text-amber-700">Exemplo: Maria Silva; 2º Ano A; Joãozinho</p>
                    <Textarea 
                      value={rawText} 
                      onChange={(e) => setRawText(e.target.value)} 
                      placeholder="Professor; Turma; Aluno" 
                      rows={5}
                      className="bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleImport} disabled={importar.isPending} className="bg-[#2b2116] text-white">
                      {importar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar Importação
                    </Button>
                    <Button variant="ghost" onClick={() => setImporting(false)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingVendedores ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#a06a31]" /></div>
            ) : !vendedores?.length ? (
              <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white py-12 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
                <p className="text-[#9b6b35]">Nenhum aluno cadastrado para esta rifa.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {vendedores.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl border border-[#ecdcc5] bg-white p-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#1a0f06]">{v.nome}</p>
                      <p className="text-[10px] text-[#9b6b35]">
                        {v.professor && `Prof: ${v.professor}`} {v.turma && `· Turma: ${v.turma}`}
                      </p>
                      <p className="text-[10px] font-mono text-[#c4a06a]">{v.codigo}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="ml-2 h-8 border-[#d5b078] text-[#5b3a1c] hover:bg-[#f4dfbc]"
                      onClick={() => {
                        const link = `${siteUrl}/rifa/${selectedRifa?.slug}?v=${v.codigo}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Link copiado para " + v.nome);
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" /> Link
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
