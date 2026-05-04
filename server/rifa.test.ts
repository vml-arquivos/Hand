import { describe, expect, it } from "vitest";
import { calcularNumerosDisponiveis, gerarCodigoPedido } from "./db";

describe("regras de negócio da rifa", () => {
  it("gera código de pedido com prefixo RF", () => {
    expect(gerarCodigoPedido()).toMatch(/^RF[A-Z0-9]+$/);
  });

  it("atribui os primeiros números disponíveis somente quando solicitado pela confirmação", () => {
    expect(calcularNumerosDisponiveis(10, [1, 2, 5], 4)).toEqual([3, 4, 6, 7]);
  });

  it("bloqueia geração de bilhetes quando a quantidade excede a disponibilidade", () => {
    expect(() => calcularNumerosDisponiveis(3, [1, 2], 2)).toThrow(/indisponível/);
  });
});
