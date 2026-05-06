import { AdminFlyer } from "@/components/AdminFlyer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, Loader2, MessageCircle, Settings, ShieldCheck, TicketCheck, UploadCloud, XCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminDashboard() {
  const utils = trpc.useUtils();
  const [adminSecret, setAdminSecret] = useState(() => localStorage.getItem("rifa_admin_secret") || "");
  const [draftSecret, setDraftSecret] = useState(adminSecret);
  const dashboard = trpc.admin.dashboard.useQuery({ adminSecret }, { enabled: Boolean(adminSecret), retry: false });
  const uploadImagem = trpc.admin.uploadImagemRifa.useMutation();
  const confirmar = trpc.admin.confirmarPedido.useMutation({ onSuccess: () => { toast.success("Pagamento confirmado e bilhetes gerados."); utils.admin.dashboard.invalidate(); } });
  const cancelar = trpc.admin.cancelarPedido.useMutation({ onSuccess: () => { toast.success("Pedido cancelado."); utils.admin.dashboard.invalidate(); } });
  const salvar = trpc.admin.salvarRifa.useMutation({ onSuccess: () => { toast.success("Configurações da rifa salvas."); utils.admin.dashboard.invalidate(); } });
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (dashboard.data?.rifa) {
      const rifa = dashboard.data.rifa;
      setConfig({ ...rifa, precoBilhete: Number(rifa.precoBilhete).toFixed(2) });
    }
  }, [dashboard.data?.rifa]);

  async function onUpload(file: File) {
    const base64 = await file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      return btoa(binary);
    });
    const res = await uploadImagem.mutateAsync({ adminSecret, fileName: file.name, contentType: file.type || "image/jpeg", base64 });
    setConfig((prev: any) => ({ ...prev, imagemUrl: res.url }));
    toast.success("Imagem enviada com sucesso.");
  }

  function entrar(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem("rifa_admin_secret", draftSecret);
    setAdminSecret(draftSecret);
  }

  function salvarConfig(event: FormEvent) {
    event.preventDefault();
    if (!config) return;
    salvar.mutate({
      adminSecret,
      id: config.id,
      slug: config.slug,
      nome: config.nome,
      descricao: config.descricao,
      premio: config.premio || "",
      dataSorteio: config.dataSorteio || "",
      imagemUrl: config.imagemUrl || "",
      totalBilhetes: Number(config.totalBilhetes),
      precoBilhete: String(config.precoBilhete),
      pixChave: config.pixChave,
      pixCopiaCola: config.pixCopiaCola,
      ativa: Boolean(config.ativa),
    });
  }

  if (!adminSecret) return <main className="grid min-h-screen place-items-center bg-[#18130d] p-4"><Card className="w-full max-w-md border-white/10 bg-[#fffaf2]"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck /> Painel administrativo</CardTitle></CardHeader><CardContent><form onSubmit={entrar} className="space-y-4"><div className="grid gap-2"><Label>Senha administrativa</Label><Input type="password" value={draftSecret} onChange={(e) => setDraftSecret(e.target.value)} placeholder="ADMIN_PASSWORD" /></div><Button className="w-full bg-[#2b2116]">Entrar</Button></form></CardContent></Card></main>;
  if (dashboard.isLoading) return <main className="grid min-h-screen place-items-center bg-[#f7f1e8]"><Loader2 className="h-8 w-8 animate-spin text-[#8a5a2b]" /></main>;
  if (dashboard.error) return <main className="grid min-h-screen place-items-center bg-[#18130d] p-4"><Card className="max-w-md"><CardContent className="p-6"><p className="text-red-700">{dashboard.error.message}</p></CardContent></Card></main>;

  const pedidos = dashboard.data?.pedidos ?? [];
  const stats = dashboard.data?.stats;

  return (
    <main className="min-h-screen bg-[#f7f1e8] text-[#22180e]">
      <section className="container py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.25em] text-[#9b6b35]">Administração</p><h1 className="text-4xl font-semibold tracking-[-0.04em]">Painel de validação da rifa</h1></div><Button variant="outline" onClick={() => { localStorage.removeItem("rifa_admin_secret"); setAdminSecret(""); }}>Sair</Button></div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pedidos pendentes</p><strong className="text-3xl">{Number(stats?.pendente.quantidade ?? 0)}</strong></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Bilhetes confirmados</p><strong className="text-3xl">{stats?.bilhetesConfirmados ?? 0}</strong></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Receita confirmada</p><strong className="text-3xl">{moeda.format(Number(stats?.confirmado.valor ?? 0))}</strong></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Cancelados</p><strong className="text-3xl">{Number(stats?.cancelado.quantidade ?? 0)}</strong></CardContent></Card>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
          <Card className="border-0 shadow-xl"><CardHeader><CardTitle className="flex items-center gap-2"><TicketCheck /> Pedidos</CardTitle></CardHeader><CardContent className="space-y-4">
            {pedidos.map((item) => {
              const numeros = item.bilhetes.map((b) => String(b.numero).padStart(4, "0"));
              const mensagem = `Olá ${item.comprador.nome}! Pagamento confirmado ✅ Seus bilhetes: ${numeros.join(", ")}. Boa sorte!`;
              const waLink = `https://wa.me/${item.comprador.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
              return <div key={item.pedido.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><strong>{item.pedido.codigo}</strong><StatusBadge status={item.pedido.status} /></div><p className="mt-1 text-sm text-muted-foreground">{item.comprador.nome} · {item.comprador.telefone}</p></div><div className="flex gap-2"><Button size="sm" disabled={item.pedido.status !== "pendente" || confirmar.isPending} onClick={() => confirmar.mutate({ adminSecret, pedidoId: item.pedido.id })}><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar</Button><Button size="sm" variant="destructive" disabled={item.pedido.status === "cancelado" || cancelar.isPending} onClick={() => cancelar.mutate({ adminSecret, pedidoId: item.pedido.id })}><XCircle className="mr-2 h-4 w-4" />Cancelar</Button>{item.pedido.status === "confirmado" ? <Button size="sm" variant="outline" asChild><a href={waLink} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Avisar no WhatsApp</a></Button> : null}</div></div><div className="mt-3 flex flex-wrap gap-2">{item.bilhetes.map((b) => <span key={b.id} className="rounded-full bg-[#21180f] px-3 py-1 text-xs font-semibold text-white">{String(b.numero).padStart(4, "0")}</span>)}</div></div>;
            })}
          </CardContent></Card>

          <div className="space-y-6">
            {config ? <AdminFlyer rifa={{ ...config, vendidos: stats?.bilhetesConfirmados ?? 0 }} /> : null}
            <Card className="border-0 shadow-xl"><CardHeader><CardTitle className="flex items-center gap-2"><Settings /> Configurações da rifa</CardTitle></CardHeader><CardContent>{config ? <form onSubmit={salvarConfig} className="space-y-4"><div className="grid gap-2"><Label>Nome</Label><Input value={config.nome} onChange={(e) => setConfig({ ...config, nome: e.target.value })} /></div><div className="grid gap-2"><Label>Descrição/Causa</Label><Textarea value={config.descricao} onChange={(e) => setConfig({ ...config, descricao: e.target.value })} /></div><div className="grid gap-2"><Label>Prêmio</Label><Input value={config.premio || ""} onChange={(e) => setConfig({ ...config, premio: e.target.value })} /></div><div className="grid gap-2"><Label>Data do sorteio</Label><Input value={config.dataSorteio || ""} onChange={(e) => setConfig({ ...config, dataSorteio: e.target.value })} placeholder="Ex: 20/06/2026" /></div><div className="grid gap-2"><Label>Imagem da rifa</Label><Input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); }} /></div>{config.imagemUrl ? <img src={config.imagemUrl} className="h-28 w-full rounded-xl object-cover" alt="Preview" /> : null}<div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Total</Label><Input type="number" value={config.totalBilhetes} onChange={(e) => setConfig({ ...config, totalBilhetes: Number(e.target.value) })} /></div><div className="grid gap-2"><Label>Preço</Label><Input value={config.precoBilhete} onChange={(e) => setConfig({ ...config, precoBilhete: e.target.value })} /></div></div><div className="grid gap-2"><Label>Chave Pix</Label><Input value={config.pixChave} onChange={(e) => setConfig({ ...config, pixChave: e.target.value })} /></div><div className="grid gap-2"><Label>PIX Copia e Cola (estático)</Label><Textarea value={config.pixCopiaCola} onChange={(e) => setConfig({ ...config, pixCopiaCola: e.target.value })} /></div><Separator /><Button className="w-full bg-[#2b2116]" disabled={salvar.isPending || uploadImagem.isPending}>{salvar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}Salvar rifa</Button></form> : null}</CardContent></Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: "pendente" | "confirmado" | "cancelado" }) {
  const map = { pendente: { icon: Clock3, cls: "bg-amber-100 text-amber-800" }, confirmado: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-800" }, cancelado: { icon: XCircle, cls: "bg-red-100 text-red-800" } } as const;
  const Icon = map[status].icon;
  return <Badge className={`${map[status].cls} gap-1 hover:${map[status].cls}`}><Icon className="h-3 w-3" />{status}</Badge>;
}
