
import { DiscernCriteria } from "./discern-criteria";
import { supabase } from "@/integrations/supabase/client";

// Exportando os tipos necessários
export interface SearchResultItem {
  ranking: number;
  title: string;
  url: string;
  snippet: string;
}

export interface SearchMetadata {
  requested: number;
  received: number;
  message: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  metadata: SearchMetadata;
  error?: string;
}

export interface DiscernResult {
  url: string;
  title: string;
  type: string;
  totalScore: number;
  scores: {
    criteriaId: number;
    score: number;
    justification: string;
  }[];
  observations: string;
}

// Função para verificar se uma URL é de vídeo
export function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /(instagram\.com|instagr\.am)\/(?:p|reel)\//i,
    /tiktok\.com\/@[^\/]+\/video\//i,
    /facebook\.com\/.*\/videos\//i,
  ];

  return videoPatterns.some(pattern => pattern.test(url));
}

// Função de busca que usa a Edge Function do Supabase
export async function searchWithKeyword(keyword: string, quantity: number = 10): Promise<SearchResultItem[]> {
  console.log(`Searching for "${keyword}" with quantity: ${quantity}`);
  
  try {
    // Chamar a Edge Function do Supabase para fazer a busca real no Google
    const { data, error } = await supabase.functions.invoke("google-search", {
      body: { keyword, quantity },
    });
    
    if (error) {
      console.error("Error calling google-search function:", error);
      throw error;
    }
    
    // Checar o novo formato de resposta
    if (data && data.results) {
      console.log(`Received ${data.results.length || 0} search results`);
      
      // Mostrar metadados da resposta se disponíveis
      if (data.metadata) {
        console.log(`Search metadata: Requested ${data.metadata.requested}, Received ${data.metadata.received}`);
        console.log(`Message: ${data.metadata.message}`);
      }
      
      return data.results || [];
    }
    
    // Compatibilidade com o formato antigo (caso ainda receba apenas a array)
    if (Array.isArray(data)) {
      console.log(`Received ${data.length || 0} search results (old format)`);
      return data || [];
    }
    
    console.error("Unexpected response format:", data);
    return [];
  } catch (error) {
    console.error("Error in searchWithKeyword:", error);
    throw error;
  }
}

// Função que analisa uma URL individual usando DISCERN via OpenAI
export async function analyzeWithDiscern(url: string, title: string): Promise<DiscernResult | null> {
  console.log(`Analyzing URL: ${url}`);
  
  try {
    // Verificar se é um vídeo para informar ao usuário
    const isVideo = isVideoUrl(url);
    if (isVideo) {
      console.log(`Detected video URL: ${url}. Processing will include video analysis.`);
    }
    
    // Chamar a Edge Function do Supabase para análise DISCERN
    const { data, error } = await supabase.functions.invoke("discern-analysis", {
      body: { url, title },
    });
    
    if (error) {
      console.error("Error calling discern-analysis function:", error);
      throw error;
    }
    
    // Verificar se há erro na resposta
    if (data && data.error) {
      console.error("Error in discern-analysis response:", data.error);
      throw new Error(data.error);
    }
    
    // Verificar se o formato da resposta é válido
    if (!data || !data.title || !data.url) {
      console.error("Unexpected response format:", data);
      throw new Error("Formato de resposta inválido da análise DISCERN");
    }
    
    console.log(`Analysis complete for ${url} with score: ${data.totalScore}`);
    return data;
  } catch (error) {
    console.error(`Error analyzing URL ${url}:`, error);
    return null;
  }
}

// Função que analisa em lote várias URLs usando a função analyzeWithDiscern
export async function batchAnalyzeWithDiscern(searchResults: SearchResultItem[]): Promise<DiscernResult[]> {
  console.log(`Batch analyzing ${searchResults.length} URLs`);
  
  try {
    // Processar análises uma por vez para evitar sobrecarregar a API
    const results: DiscernResult[] = [];
    
    // Remover a limitação de 5 URLs para processar todos os resultados
    const urlsToProcess = searchResults;
    console.log(`Processando ${urlsToProcess.length} URLs em lotes pequenos...`);
    
    for (let i = 0; i < urlsToProcess.length; i++) {
      const result = urlsToProcess[i];
      console.log(`Processando URL ${i + 1}/${urlsToProcess.length}: ${result.url}`);
      
      try {
        // Adicionar uma pausa maior entre as análises (7 segundos)
        if (i > 0) {
          console.log("Pausing for 7 seconds before next analysis...");
          await new Promise(resolve => setTimeout(resolve, 7000));
        }
        
        const analyzed = await analyzeWithDiscern(result.url, result.title);
        if (analyzed) {
          // Validar se a pontuação está presente (não zero, não vazio)
          if (analyzed.totalScore > 0 && analyzed.scores && analyzed.scores.length > 0) {
            results.push(analyzed);
            console.log(`✅ Análise concluída com sucesso para ${result.url}, pontuação: ${analyzed.totalScore}`);
          } else {
            console.warn(`⚠️ Análise retornou dados incompletos para ${result.url}`);
          }
        } else {
          console.warn(`⚠️ Não foi possível analisar ${result.url}`);
        }
      } catch (error) {
        console.error(`❌ Falha ao analisar ${result.url}:`, error);
        // Continue para a próxima URL mesmo se uma falhar
      }
    }
    
    console.log(`Completed analysis of ${results.length}/${urlsToProcess.length} URLs`);
    return results;
  } catch (error) {
    console.error("Error in batchAnalyzeWithDiscern:", error);
    throw error;
  }
}

// Export function
export async function exportResults(results: DiscernResult[]): Promise<boolean> {
  console.log(`Exporting ${results.length} results`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return true;
}
