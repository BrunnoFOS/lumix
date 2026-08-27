// Funções puras de cálculo de geração estimada.
// Sem "use server" — podem ser importadas de qualquer lugar.

// Mapeamento mês (0-indexed) -> coluna na tabela ghi_municipios
export const MES_COLUNA: Record<number, string> = {
  0: "jan",
  1: "fev",
  2: "mar",
  3: "abr",
  4: "mai",
  5: "jun",
  6: "jul",
  7: "ago",
  8: "set_",
  9: "out",
  10: "nov",
  11: "dez",
};

/**
 * Normaliza nome de município para matching com a tabela ghi_municipios.
 * Remove acentos, converte para lowercase e trim.
 */
export function normalizarNomeMunicipio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Converte nome de estado por extenso para UF (2 chars).
 * Aceita tanto "São Paulo" quanto "SP".
 */
export function estadoParaUF(estado: string): string | null {
  const upper = estado.trim().toUpperCase();

  // Se já é UF (2 chars)
  if (upper.length === 2) return upper;

  const mapa: Record<string, string> = {
    ACRE: "AC", ALAGOAS: "AL", AMAPA: "AP", AMAZONAS: "AM",
    BAHIA: "BA", CEARA: "CE", "DISTRITO FEDERAL": "DF",
    "ESPIRITO SANTO": "ES", GOIAS: "GO", MARANHAO: "MA",
    "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS",
    "MINAS GERAIS": "MG", PARA: "PA", PARAIBA: "PB",
    PARANA: "PR", PERNAMBUCO: "PE", PIAUI: "PI",
    "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN",
    "RIO GRANDE DO SUL": "RS", RONDONIA: "RO", RORAIMA: "RR",
    "SANTA CATARINA": "SC", "SAO PAULO": "SP", SERGIPE: "SE",
    TOCANTINS: "TO",
  };

  // Normaliza: remove acentos e busca no mapa
  const normalizado = upper
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return mapa[normalizado] || null;
}

/**
 * Retorna o número de dias em um mês/ano.
 */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/**
 * Calcula a degradação acumulada da usina com base na idade.
 *
 * - Se idade < 1 ano: degradacao_acumulada = degradacao_ano_zero
 * - Se idade >= 1 ano: degradacao_acumulada = degradacao_ano_zero
 *     + (floor(idade) - 1) * degradacao_anos_seguintes
 */
export function calcularDegradacaoAcumulada(params: {
  dataInstalacao: string;
  mesReferencia: string;
  degradacaoAnoZero: number;
  degradacaoAnosSeguintes: number;
}): number {
  const instalacao = new Date(params.dataInstalacao);
  const referencia = new Date(params.mesReferencia);

  if (referencia <= instalacao) return 0; // usina ainda não instalada

  // Calcular idade em anos completos baseado em calendário (não em dias)
  let idadeAnos =
    referencia.getUTCFullYear() - instalacao.getUTCFullYear();
  const mesRef = referencia.getUTCMonth();
  const mesInst = instalacao.getUTCMonth();
  if (
    mesRef < mesInst ||
    (mesRef === mesInst && referencia.getUTCDate() < instalacao.getUTCDate())
  ) {
    idadeAnos--;
  }

  if (idadeAnos < 1) {
    return params.degradacaoAnoZero;
  }

  const anosCompletosAposPrimeiro = Math.max(0, idadeAnos - 1);
  return (
    params.degradacaoAnoZero +
    anosCompletosAposPrimeiro * params.degradacaoAnosSeguintes
  );
}

/**
 * Calcula a geração estimada mensal (kWh).
 *
 * Fórmula:
 * Geração Estimada = Potência (kW) × GHI (kWh/m²/dia) × Dias × Fator Rendimento × (1 - Degradação)
 *
 * O GHI vem do banco em Wh/m²/dia, então divide por 1000.
 */
export function calcularGeracaoEstimada(params: {
  potenciaKwp: number;
  ghiWhM2Dia: number;
  diasNoMes: number;
  fatorRendimento: number;
  degradacaoAcumulada: number;
}): number {
  const ghiKwh = params.ghiWhM2Dia / 1000;
  return (
    params.potenciaKwp *
    ghiKwh *
    params.diasNoMes *
    params.fatorRendimento *
    (1 - params.degradacaoAcumulada)
  );
}

/**
 * Classifica o desempenho com base no PR (Performance Ratio).
 *
 * PR >= 98%: bom
 * 90% <= PR < 98%: regular
 * PR < 90%: ruim
 */
export function classificarDesempenho(prPercent: number): "bom" | "regular" | "ruim" {
  if (prPercent >= 98) return "bom";
  if (prPercent >= 90) return "regular";
  return "ruim";
}

/**
 * Calcula o fator multiplicador gross-up de impostos.
 * Fórmula: 1 / (1 - ICMS - PIS - COFINS)
 * Os impostos são "por dentro" — fazem parte da própria base de cálculo.
 */
export function calcularFatorImposto(icms: number, pis: number, cofins: number): number {
  const denominador = 1 - icms - pis - cofins;
  if (denominador <= 0) return 1; // proteção contra divisão por zero
  return 1 / denominador;
}

/**
 * Formata o PR para exibição no relatório.
 * Ex: "82% do potencial da usina foi atingido — Regular"
 */
export function formatarPR(prPercent: number): string {
  const classificacao = classificarDesempenho(prPercent);
  const label =
    classificacao === "bom"
      ? "Bom"
      : classificacao === "regular"
        ? "Regular"
        : "Ruim";
  return `${Math.round(prPercent)}% do potencial da usina foi atingido — ${label}`;
}

export interface SegmentoMensal {
  mes: number;   // 0-indexed (0 = janeiro)
  ano: number;
  dias: number;  // quantidade de dias neste segmento
}

/**
 * Calcula os segmentos mensais de um ciclo de faturamento.
 * Quando o ciclo cruza meses, retorna a quantidade de dias em cada mês.
 *
 * Ex: ciclo 13/05 a 12/06
 * → [{ mes: 4, ano: 2026, dias: 19 }, { mes: 5, ano: 2026, dias: 12 }]
 *
 * As datas são inclusivas (início e fim contam como dia do ciclo).
 */
export function calcularSegmentosCiclo(inicioCiclo: string, fimCiclo: string): SegmentoMensal[] {
  const inicio = new Date(`${inicioCiclo}T00:00`);
  const fim = new Date(`${fimCiclo}T00:00`);

  if (fim < inicio) return [];

  const segmentos: SegmentoMensal[] = [];

  let mesAtual = inicio.getMonth();
  let anoAtual = inicio.getFullYear();

  while (true) {
    const primeiroDia =
      anoAtual === inicio.getFullYear() && mesAtual === inicio.getMonth()
        ? inicio.getDate()
        : 1;

    const ultimoDiaDoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const ultimoDia =
      anoAtual === fim.getFullYear() && mesAtual === fim.getMonth()
        ? fim.getDate()
        : ultimoDiaDoMes;

    const dias = ultimoDia - primeiroDia + 1;
    if (dias > 0) {
      segmentos.push({ mes: mesAtual, ano: anoAtual, dias });
    }

    if (anoAtual === fim.getFullYear() && mesAtual === fim.getMonth()) break;

    mesAtual++;
    if (mesAtual > 11) {
      mesAtual = 0;
      anoAtual++;
    }
  }

  return segmentos;
}

export interface UCParaEstimativa {
  potencia_instalada_kwp: number | null;
  cidade: string | null;
  estado: string | null;
  fator_rendimento: number | null;
  degradacao_ano_zero: number | null;
  degradacao_anos_seguintes: number | null;
  data_instalacao: string | null;
  data_inicio_degradacao: string | null;
}

/**
 * Valida se a UC tem todos os campos necessários para calcular a geração estimada.
 */
export function validarUCParaEstimativa(
  uc: UCParaEstimativa
): { valid: true } | { valid: false; camposFaltantes: string[] } {
  const faltantes: string[] = [];

  if (!uc.potencia_instalada_kwp) faltantes.push("Potência instalada (kW)");
  if (!uc.cidade) faltantes.push("Cidade");
  if (!uc.estado) faltantes.push("Estado");
  if (uc.fator_rendimento == null) faltantes.push("Fator de rendimento");
  if (uc.degradacao_ano_zero == null) faltantes.push("Degradação ano zero");
  if (uc.degradacao_anos_seguintes == null) faltantes.push("Degradação anos seguintes");
  if (!uc.data_inicio_degradacao && !uc.data_instalacao)
    faltantes.push("Data início degradação (ou Data de instalação)");

  if (faltantes.length > 0) return { valid: false, camposFaltantes: faltantes };
  return { valid: true };
}

export interface UCParaRelatorio {
  grupo_tarifario: string | null;
  subgrupo: string | null;
  concessionaria_sigla: string | null;
  modalidade_tarifaria_aneel: string | null;
  icms_aliquota: number | null;
  pis_aliquota: number | null;
  cofins_aliquota: number | null;
  contrato_acl_rs_mwh: number | null;
}

/**
 * Valida se a UC tem todos os campos de classificação tarifária necessários para gerar relatório.
 */
export function validarUCParaRelatorio(
  uc: UCParaRelatorio
): { valid: true } | { valid: false; camposFaltantes: string[] } {
  const faltantes: string[] = [];

  if (!uc.grupo_tarifario) faltantes.push("Grupo tarifário");
  if (!uc.concessionaria_sigla) faltantes.push("Concessionária (sigla ANEEL)");
  if (!uc.subgrupo) faltantes.push("Subgrupo tarifário");
  if (!uc.modalidade_tarifaria_aneel) faltantes.push("Modalidade tarifária ANEEL");
  if (uc.icms_aliquota == null) faltantes.push("Alíquota ICMS");
  if (uc.pis_aliquota == null) faltantes.push("Alíquota PIS");
  if (uc.cofins_aliquota == null) faltantes.push("Alíquota COFINS");

  if (uc.grupo_tarifario === "acl" && uc.contrato_acl_rs_mwh == null) {
    faltantes.push("Contrato ACL (R$/MWh)");
  }

  if (faltantes.length > 0) return { valid: false, camposFaltantes: faltantes };
  return { valid: true };
}
