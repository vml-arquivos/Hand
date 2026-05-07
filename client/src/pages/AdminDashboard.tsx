import { AdminFlyer } from "@/components/AdminFlyer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, Loader2, MessageCircle, Settings, ShieldCheck, TicketCheck, UploadCloud, XCircle, LogOut } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const dashboard = trpc.admin.dashboard.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setLocation("/admin/login");
    },
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
  const rifas = dashboard.data?.rifas ?? [];

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
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Rifas Ativas</p>
                  <strong className="text-3xl">{rifas.filter(r => r.ativa).length}</strong>
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
                  <strong className="text-3xl">{moeda.format(Number(stats?.confirmado.valor ?? 0))}</strong>
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

          {/* RIFAS */}
          <TabsContent value="rifas" className="space-y-6">
            <div className="grid gap-6">
              {rifas.map((rifa) => (
                <Card key={rifa.id} className="border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{rifa.nome}</CardTitle>
                      <Badge variant={rifa.ativa ? "default" : "secondary"}>
                        {rifa.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{rifa.descricao}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Preço:</span> {moeda.format(Number(rifa.precoBilhete))}
                      </div>
                      <div>
                        <span className="font-semibold">Total:</span> {rifa.totalBilhetes} bilhetes
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
                    <Button size="sm" className="mt-4">Editar</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* PREMIOS */}
          <TabsContent value="premios">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Prêmios</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Selecione uma rifa para gerenciar seus prêmios</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PEDIDOS */}
          <TabsContent value="pedidos" className="space-y-6">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TicketCheck /> Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pedidos.map((item) => {
                  const numeros = item.bilhetes.map((b) => String(b.numero).padStart(4, "0"));
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
                            {moeda.format(Number(item.pedido.valorTotal))}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {item.pedido.status === "pendente" && (
                            <Button size="sm">
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Confirmar
                            </Button>
                          )}
                          <Button size="sm" variant="destructive">
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar
                          </Button>
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
                            <span key={b.id} className="rounded-full bg-[#21180f] px-3 py-1 text-xs font-semibold text-white">
                              {String(b.numero).padStart(4, "0")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDITORIA */}
          <TabsContent value="auditoria">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Auditoria</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Histórico de ações administrativas</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

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
