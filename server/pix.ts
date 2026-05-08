/**
 * Gerador de Pix BR Code (EMV QR Code)
 * Gera o payload "Pix Copia e Cola" estático (sem valor fixo, sem expiração)
 * conforme o padrão do Banco Central do Brasil.
 *
 * O payload estático NÃO expira — é permanente enquanto a chave Pix existir.
 * O pagador pode informar o valor manualmente no app do banco.
 */
import { payload as pixPayload } from "pix-payload";

export type TipoChavePix = "cpf" | "cnpj" | "email" | "telefone" | "evp";

/**
 * Detecta automaticamente o tipo da chave Pix informada.
 */
export function detectarTipoChave(chave: string): TipoChavePix {
  const limpa = chave.trim();

  // UUID (chave aleatória / EVP)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpa)) {
    return "evp";
  }

  // E-mail
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpa)) {
    return "email";
  }

  // Telefone: +55XXXXXXXXXXX ou 55XXXXXXXXXXX ou 0XXXXXXXXXXX
  if (/^(\+55|55)?[1-9][0-9]{9,10}$/.test(limpa.replace(/\D/g, ""))) {
    const digitos = limpa.replace(/\D/g, "");
    if (digitos.length >= 10 && digitos.length <= 13) return "telefone";
  }

  // CNPJ (14 dígitos)
  const soDigitos = limpa.replace(/\D/g, "");
  if (soDigitos.length === 14) return "cnpj";

  // CPF (11 dígitos)
  if (soDigitos.length === 11) return "cpf";

  // Fallback: trata como EVP
  return "evp";
}

/**
 * Normaliza a chave Pix para o formato aceito pelo Banco Central.
 * - CPF/CNPJ: apenas dígitos
 * - Telefone: +55XXXXXXXXXXX
 * - E-mail: lowercase
 * - EVP: lowercase sem alterações
 */
export function normalizarChavePix(chave: string, tipo: TipoChavePix): string {
  const limpa = chave.trim();
  switch (tipo) {
    case "cpf":
    case "cnpj":
      return limpa.replace(/\D/g, "");
    case "telefone": {
      const digitos = limpa.replace(/\D/g, "");
      // Garante formato +55XXXXXXXXXXX
      if (digitos.startsWith("55") && digitos.length >= 12) return `+${digitos}`;
      if (digitos.length === 11 || digitos.length === 10) return `+55${digitos}`;
      return `+${digitos}`;
    }
    case "email":
      return limpa.toLowerCase();
    case "evp":
      return limpa.toLowerCase();
    default:
      return limpa;
  }
}

export interface GerarPixInput {
  /** Chave Pix do recebedor */
  chave: string;
  /** Nome do recebedor (máx 25 caracteres) */
  nomeRecebedor: string;
  /** Cidade do recebedor (máx 15 caracteres) */
  cidade?: string;
  /** ID da transação (máx 25 caracteres, sem espaços) */
  transactionId?: string;
}

export interface GerarPixOutput {
  /** Payload completo do Pix Copia e Cola */
  copiaCola: string;
  /** Chave Pix normalizada */
  chaveNormalizada: string;
  /** Tipo detectado da chave */
  tipo: TipoChavePix;
}

/**
 * Gera o payload Pix Copia e Cola estático (sem valor, sem expiração).
 * Segue o padrão EMV QR Code do Banco Central do Brasil.
 */
export function gerarPixCopiaCola(input: GerarPixInput): GerarPixOutput {
  const tipo = detectarTipoChave(input.chave);
  const chaveNormalizada = normalizarChavePix(input.chave, tipo);

  // Trunca nome e cidade conforme limite do padrão EMV
  const nome = input.nomeRecebedor.trim().slice(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cidade = (input.cidade ?? "Brasil").trim().slice(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const txid = (input.transactionId ?? "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  const copiaCola = pixPayload({
    key: chaveNormalizada,
    name: nome,
    city: cidade,
    transactionId: txid,
    // Sem amount = payload estático (pagador informa o valor)
  });

  return { copiaCola, chaveNormalizada, tipo };
}
