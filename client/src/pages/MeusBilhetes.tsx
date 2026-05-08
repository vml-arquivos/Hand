import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Search,
  Ticket,
  XCircle,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return v;
}

export default function MeusBilhetes() {
  const [, navigate] = useLocation();
  const [telefone, setTelefone] = useState("");
  const [busca, setBusca] = useState("");
  const [buscado, setBuscado] = useState(false);

  const { data: pedidos, isLoading, refetch } = trpc.rifa.meusBilhetes.useQuery(
    { telefone: busca },
    { enabled: Boolean(busca && busca.replace(/\D/g, "").length >= 8) },
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 8) return;
    setBusca(digits);
    setBuscado(true);
    refetch();
  }

  const statusLabel = (s: string) =>
    s === "confirmado" ? "Confirmado" : s === "cancelado" ? "Cancelado" : "Aguardando pagamento";

  const statusIcon = (s: string) =>
    s === "confirmado" ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : s === "cancelado" ? (
      <XCircle className="h-3.5 w-3.5" />
    ) : (
      <Clock3 className="h-3.5 w-3.5" />
    );

  const statusClass = (s: string) =>
    s === "confirmado"
      ? "bg-green-100 text-green-800"
      : s === "cancelado"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  return (
    <main className="min-h-screen bg-[#f7f1e8] py-8 text-[#22180e]">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#593b1f] hover:underline"
          >
            <HeartHandshake className="h-4 w-4" />
            Voltar para a rifa
          </a>
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#21180f]">
            <Ticket className="h-7 w-7 text-[#e5c07b]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a0f06] sm:text-3xl">Meus Bilhetes</h1>
          <p className="mt-2 text-sm text-[#7a5a3a]">
            Digite o WhatsApp cadastrado no momento da compra para encontrar seus pedidos.
          </p>
        </div>

        {/* Formulário de busca */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="text-sm font-semibold text-[#1a0f06]">
                  Número de WhatsApp
                </Label>
                <Input
                  id="telefone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(61) 99999-9999"
                  value={telefone}
                  onChange={e => setTelefone(formatarTelefone(e.target.value))}
                  className="h-12 border-[#d5b078] text-base focus-visible:ring-[#a06a31]"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={telefone.replace(/\D/g, "").length < 8 || isLoading}
                className="h-12 w-full bg-[#21180f] text-white hover:bg-[#3d2e1e]"
              >
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? "Buscando..." : "Buscar meus pedidos"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Resultados */}
        {buscado && !isLoading && (
          <>
            {!pedidos || pedidos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d5b078] bg-white py-10 text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-[#d5b078]" />
                <p className="font-semibold text-[#2e2013]">Nenhum pedido encontrado</p>
                <p className="mt-1 text-sm text-[#7a5a3a]">
                  Verifique o número digitado ou tente o código do pedido diretamente.
                </p>
                <p className="mt-3 text-xs text-[#9b6b35]">
                  O código do pedido começa com <strong>RF</strong> e foi exibido no comprovante
                  após a reserva.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[#7a5a3a]">
                  {pedidos.length} pedido{pedidos.length > 1 ? "s" : ""} encontrado
                  {pedidos.length > 1 ? "s" : ""}
                </p>
                {pedidos.map((item: any) => (
                  <Card
                    key={item.pedido.id}
                    className="cursor-pointer border-0 shadow-md transition-shadow hover:shadow-lg"
                    onClick={() => navigate(`/comprovante/${item.pedido.codigo}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs text-[#9b6b35]">{item.pedido.codigo}</p>
                          <p className="mt-0.5 font-semibold text-[#1a0f06]">{item.rifa.nome}</p>
                          <p className="mt-0.5 text-sm text-[#7a5a3a]">
                            {item.pedido.quantidade} bilhete{item.pedido.quantidade > 1 ? "s" : ""}{" "}
                            · {moeda.format(Number(item.pedido.valorTotal))}
                          </p>
                        </div>
                        <Badge className={`gap-1.5 px-2.5 py-1 text-xs ${statusClass(item.pedido.status)}`}>
                          {statusIcon(item.pedido.status)}
                          {statusLabel(item.pedido.status)}
                        </Badge>
                      </div>

                      {item.bilhetes.length > 0 && (
                        <>
                          <Separator className="my-3 bg-[#ecdcc5]" />
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b6b35]">
                              Seus números
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {item.bilhetes.map((b: any) => (
                                <span
                                  key={b.id}
                                  className="rounded-full bg-[#21180f] px-3 py-1 font-mono text-xs font-bold text-white"
                                >
                                  {String(b.numero).padStart(4, "0")}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {item.pedido.status === "pendente" && (
                        <>
                          <Separator className="my-3 bg-[#ecdcc5]" />
                          <p className="text-xs text-amber-700">
                            Pagamento pendente — clique para ver o QR Code Pix e finalizar o
                            pagamento.
                          </p>
                        </>
                      )}

                      <p className="mt-3 text-right text-xs text-[#b09070]">
                        Ver comprovante completo →
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Busca por código */}
        <div className="mt-8 rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#1a0f06]">Tem o código do pedido?</p>
          <p className="mt-1 text-xs text-[#7a5a3a]">
            Se você anotou o código (ex: <span className="font-mono font-bold">RF1A2B3C4D</span>),
            acesse diretamente:
          </p>
          <CodigoBusca />
        </div>
      </div>
    </main>
  );
}

function CodigoBusca() {
  const [, navigate] = useLocation();
  const [codigo, setCodigo] = useState("");

  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={e => {
        e.preventDefault();
        const c = codigo.trim().toUpperCase();
        if (c.length >= 5) navigate(`/comprovante/${c}`);
      }}
    >
      <Input
        placeholder="RF1A2B3C4D..."
        value={codigo}
        onChange={e => setCodigo(e.target.value.toUpperCase())}
        className="h-10 border-[#d5b078] font-mono text-sm focus-visible:ring-[#a06a31]"
      />
      <Button
        type="submit"
        disabled={codigo.trim().length < 5}
        className="h-10 shrink-0 bg-[#21180f] text-white hover:bg-[#3d2e1e]"
      >
        Ir
      </Button>
    </form>
  );
}
