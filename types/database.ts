export type Role = "admin" | "cliente";

export type EnquadramentoTarifario =
  | "monofasico"
  | "bifasico"
  | "trifasico";

export type ModalidadeTarifaria =
  | "convencional"
  | "branca"
  | "verde"
  | "azul";

export type PostoTarifario =
  | "ponta"
  | "fora_ponta"
  | "intermediario"
  | "unico";

export type IndicePerformance = "bom" | "regular" | "ruim";

export type StatusFatura = "pendente" | "processada" | "erro";

export type StatusEnvio = "pendente" | "enviado" | "erro";

export type GeradoPor = "automatico" | "manual";

export interface Profile {
  id: string;
  role: Role;
  nome: string;
  email: string;
  empresa_id: string | null;
  telefone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  responsavel: string | null;
  ativa: boolean;
  arquivada: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnidadeConsumidora {
  id: string;
  empresa_id: string;
  codigo_uc: string;
  titular: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  distribuidora: string;
  enquadramento_tarifario: EnquadramentoTarifario;
  modalidade_tarifaria: ModalidadeTarifaria;
  potencia_instalada_kwp: number;
  quantidade_inversores: number;
  modelo_inversores: string | null;
  potencia_inversor_kw: number | null;
  data_instalacao: string | null;
  geracao_estimada_mensal_kwh: number | null;
  fator_rendimento: number | null;
  degradacao_ano_zero: number | null;
  degradacao_anos_seguintes: number | null;
  contrato_acl_rs_mwh: number | null;
  icms_aliquota: number | null;
  pis_aliquota: number | null;
  cofins_aliquota: number | null;
  ativa: boolean;
  arquivada: boolean;
  station_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DadoGeracao {
  id: string;
  uc_id: string;
  mes_referencia: string;
  geracao_kwh: number;
  geracao_estimada_kwh: number | null;
  irradiacao_media: number | null;
  performance_ratio: number | null;
  indice_performance: IndicePerformance | null;
  created_at: string;
}

export interface Fatura {
  id: string;
  uc_id: string;
  mes_referencia: string;
  denominacao: string | null;
  contrato: string | null;
  valor_faturado: number | null;
  inicio_ciclo: string | null;
  fim_ciclo: string | null;
  energia_faturada_fp: number | null;
  valor_tarifa_fp: number | null;
  kwh_compensado_fp: number | null;
  tarifa_compensada_fp: number | null;
  energia_consumida_fp: number | null;
  energia_injetada_fp: number | null;
  valor_total: number | null;
  consumo_kwh: number | null;
  energia_injetada_kwh: number | null;
  creditos_energia_kwh: number | null;
  demanda_contratada_kw: number | null;
  valor_tusd: number | null;
  valor_te: number | null;
  economia_estimada: number | null;
  pdf_url: string | null;
  imagem_url: string | null;
  dados_extraidos: Record<string, unknown> | null;
  status: StatusFatura;
  inserido_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Relatorio {
  id: string;
  uc_id: string;
  empresa_id: string;
  mes_referencia: string;
  titulo: string;
  pdf_url: string | null;
  geracao_kwh: number | null;
  geracao_estimada_kwh: number | null;
  economia_reais: number | null;
  indice_performance: IndicePerformance | null;
  status_envio: StatusEnvio;
  gerado_por: GeradoPor;
  fatura_id: string | null;
  inicio_ciclo: string | null;
  fim_ciclo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tarifa {
  id: string;
  distribuidora: string;
  modalidade: ModalidadeTarifaria;
  posto_tarifario: PostoTarifario;
  valor_tusd: number;
  valor_te: number;
  valor_total: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export type StatusFaturaProcessada = "extraindo" | "extraido" | "gerando" | "gerado" | "erro";

export interface FaturaProcessada {
  id: string;
  uc_id: string;
  mes_referencia: string;
  pdf_fatura_url: string | null;
  pdf_relatorio_url: string | null;
  status: StatusFaturaProcessada;
  observacao: string | null;
  ultima_edicao_at: string | null;
  editado_por: string | null;
  consumo_total_kwh: number | null;
  consumo_ponta_kwh: number | null;
  consumo_fora_ponta_kwh: number | null;
  energia_injetada_kwh: number | null;
  consumo_injetado_mesma_uc_kwh: number | null;
  consumo_injetado_outra_uc_kwh: number | null;
  credito_acumulado_kwh: number | null;
  valor_total_fatura_rs: number | null;
  vto_ci_rs: number | null;
  tem_geracao_compartilhada: boolean;
  evidencia_geracao_compartilhada: string | null;
  data_vencimento: string | null;
  numero_fatura: string | null;
  created_at: string;
  updated_at: string;
}
