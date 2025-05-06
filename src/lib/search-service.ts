
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
    // Chamar a Edge Function do Supabase para análise DISCERN
    const { data, error } = await supabase.functions.invoke("discern-analysis", {
      body: { url, title },
    });
    
    if (error) {
      console.error("Error calling discern-analysis function:", error);
      throw error;
    }
    
    console.log(`Analysis complete for ${url}`);
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
    // Processar análises em lote (1 por vez para evitar sobrecarga)
    const batchSize = 1;
    const results: DiscernResult[] = [];
    
    for (let i = 0; i < searchResults.length; i += batchSize) {
      const batch = searchResults.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1}: URLs ${i + 1} to ${Math.min(i + batchSize, searchResults.length)}`);
      
      // Processar cada URL no lote atual
      for (const result of batch) {
        try {
          const analyzed = await analyzeWithDiscern(result.url, result.title);
          if (analyzed) {
            results.push(analyzed);
          }
        } catch (error) {
          console.error(`Failed to analyze ${result.url}:`, error);
        }
      }
      
      // Pequena pausa entre os lotes para não sobrecarregar
      if (i + batchSize < searchResults.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`Completed analysis of ${results.length}/${searchResults.length} URLs`);
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
