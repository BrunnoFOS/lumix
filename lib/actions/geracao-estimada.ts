"use server";

import { createServerClient } from "@/lib/supabase/server";
import {
  MES_COLUNA,
  normalizarNomeMunicipio,
  estadoParaUF,
  diasNoMes,
  calcularDegradacaoAcumulada,
  calcularGeracaoEstimada,
  classificarDesempenho,
  validarUCParaEstimativa,
  calcularSegmentosCiclo,
} from "@/lib/geracao-estimada";


/**
 * Busca o GHI de um município na tabela ghi_municipios.
 * Retorna o valor em Wh/m²/dia para o mês especificado, ou null se não encontrado.
 */
export async function buscarGHI(
  cidade: string,
  estado: string,
  mes: number
): Promise<number | null> {
  const supabase = await createServerClient();

  const nomeNorm = normalizarNomeMunicipio(cidade);
  const uf = estadoParaUF(estado);

  if (!uf) return null;

  const coluna = MES_COLUNA[mes];
  if (!coluna) return null;

  // Busca exata por município + UF
  const { data, error } = await supabase
    .from("ghi_municipios")
    .select(`${coluna}`)
    .eq("nome", nomeNorm)
    .eq("uf", uf)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!error && data) return Number((data as any)[coluna]);

  // Fallback: média do estado (UF)
  const { data: mediaData, error: mediaError } = await supabase
    .rpc("ghi_media_uf", { p_uf: uf, p_coluna: coluna });

  if (!mediaError && mediaData != null) return Number(mediaData);

  return null;
}

interface ResultadoEstimativa {
  geracao_estimada_kwh: number;
  ghi_wh_m2_dia: number;
  degradacao_acumulada: number;
  pr_percent?: number;
  indice_performance?: "bom" | "regular" | "ruim";
}

/**
 * Calcula a geração estimada para uma UC em um mês de referência.
 * Busca todos os dados necessários (UC + GHI) e retorna o resultado.
 *
 * Se geracaoRealKwh for fornecido, também calcula o PR e classificação.
 *
 * Se inicioCiclo e fimCiclo forem fornecidos e o ciclo cruzar meses,
 * o GHI é ponderado proporcionalmente pelos dias de cada mês.
 * Ex: ciclo 13/05 a 12/06 → (19/31)*GHI_mai + (12/30)*GHI_jun ponderado.
 */
export async function calcularGeracaoEstimadaUC(
  ucId: string,
  mesReferencia: string,
  geracaoRealKwh?: number,
  inicioCiclo?: string,
  fimCiclo?: string
): Promise<{ data: ResultadoEstimativa } | { error: string }> {
  const supabase = await createServerClient();

  // Buscar UC
  const { data: uc, error: ucError } = await supabase
    .from("unidades_consumidoras")
    .select(
      "potencia_instalada_kwp, cidade, estado, fator_rendimento, degradacao_ano_zero, degradacao_anos_seguintes, data_instalacao, data_inicio_degradacao"
    )
    .eq("id", ucId)
    .single();

  if (ucError || !uc) {
    return { error: "UC não encontrada." };
  }

  // Validar campos
  const validacao = validarUCParaEstimativa(uc);
  if (!validacao.valid) {
    return {
      error: `Campos obrigatórios não preenchidos: ${validacao.camposFaltantes.join(", ")}`,
    };
  }

  // Calcular degradação
  const degradacao = calcularDegradacaoAcumulada({
    dataInstalacao: uc.data_inicio_degradacao ?? uc.data_instalacao!,
    mesReferencia,
    degradacaoAnoZero: Number(uc.degradacao_ano_zero),
    degradacaoAnosSeguintes: Number(uc.degradacao_anos_seguintes),
  });

  let ghiPonderado: number;
  let diasTotal: number;

  // Verificar se temos datas do ciclo que cruzam meses
  if (inicioCiclo && fimCiclo) {
    const segmentos = calcularSegmentosCiclo(inicioCiclo, fimCiclo);

    if (segmentos.length === 0) {
      return { error: "Datas do ciclo inválidas (fim antes do início)." };
    }

    // Buscar GHI para cada mês do ciclo e ponderar
    let somaGhiDias = 0;
    diasTotal = 0;

    for (const seg of segmentos) {
      const ghi = await buscarGHI(uc.cidade!, uc.estado!, seg.mes);
      if (ghi === null) {
        const nomeMes = MES_COLUNA[seg.mes] ?? String(seg.mes + 1);
        return {
          error: `GHI não encontrado para ${uc.cidade}/${uc.estado} (mês: ${nomeMes}). Verifique se o município está cadastrado corretamente.`,
        };
      }
      somaGhiDias += (ghi / 1000) * seg.dias;
      diasTotal += seg.dias;
    }

    // GHI ponderado (Wh/m²/dia) = média ponderada pelos dias
    ghiPonderado = diasTotal > 0 ? (somaGhiDias / diasTotal) * 1000 : 0;
  } else {
    // Comportamento original: mês inteiro do mes_referencia
    const refDate = new Date(mesReferencia);
    const mes = refDate.getUTCMonth();
    const ano = refDate.getUTCFullYear();

    const ghi = await buscarGHI(uc.cidade!, uc.estado!, mes);
    if (ghi === null) {
      return {
        error: `GHI não encontrado para ${uc.cidade}/${uc.estado}. Verifique se o município está cadastrado corretamente.`,
      };
    }

    ghiPonderado = ghi;
    diasTotal = diasNoMes(ano, mes);
  }

  // Calcular geração estimada
  const geracaoEstimada = calcularGeracaoEstimada({
    potenciaKwp: Number(uc.potencia_instalada_kwp),
    ghiWhM2Dia: ghiPonderado,
    diasNoMes: diasTotal,
    fatorRendimento: Number(uc.fator_rendimento),
    degradacaoAcumulada: degradacao,
  });

  const resultado: ResultadoEstimativa = {
    geracao_estimada_kwh: Math.round(geracaoEstimada * 100) / 100,
    ghi_wh_m2_dia: ghiPonderado,
    degradacao_acumulada: degradacao,
  };

  // Se geração real fornecida, calcular PR
  if (geracaoRealKwh != null && geracaoEstimada > 0) {
    const pr = (geracaoRealKwh / geracaoEstimada) * 100;
    resultado.pr_percent = Math.round(pr * 100) / 100;
    resultado.indice_performance = classificarDesempenho(pr);
  }

  return { data: resultado };
}
