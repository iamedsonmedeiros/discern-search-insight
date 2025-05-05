
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

// Base de dados para gerar resultados simulados de análise DISCERN
// Manteremos isso para gerar as análises DISCERN enquanto implementamos
// a funcionalidade real de busca
const healthTopics = [
  { 
    keyword: "diabetes", 
    domains: [".gov.br", ".org.br", ".com.br", ".edu.br"],
    titlePrefixes: ["Diabetes: ", "Como controlar ", "Tratamento para ", "Sintomas de ", "Guia completo: "],
    titleSuffixes: [" - Ministério da Saúde", " | Hospital Albert Einstein", " | Dráuzio Varella", " | SBD", " - Guia Médico"],
    snippets: [
      "O diabetes é uma doença crônica na qual o corpo não produz insulina ou não consegue empregar adequadamente a insulina que produz.",
      "Diabetes é uma doença caracterizada pela elevação da glicose no sangue (hiperglicemia).",
      "A diabetes mellitus é uma doença metabólica que causa aumento dos níveis de glicose no sangue.",
      "Conheça os sintomas, causas e tratamentos para diabetes tipo 1 e tipo 2.",
      "Aprenda como controlar a diabetes através de alimentação adequada e atividade física regular."
    ]
  },
  {
    keyword: "hipertensão",
    domains: [".gov.br", ".org.br", ".com.br", ".edu.br"],
    titlePrefixes: ["Hipertensão: ", "Pressão alta: ", "Como controlar ", "Tratamento para ", "Guia completo: "],
    titleSuffixes: [" - Ministério da Saúde", " | Sociedade Brasileira de Cardiologia", " | Dráuzio Varella", " | InCor", " - Manual MSD"],
    snippets: [
      "A hipertensão arterial é uma doença crônica caracterizada pelos níveis elevados da pressão sanguínea nas artérias.",
      "A pressão alta é uma condição que aumenta o risco de problemas cardíacos e acidente vascular cerebral.",
      "Saiba como identificar e tratar a hipertensão arterial, condição que afeta milhões de brasileiros.",
      "Conheça as causas da pressão alta e as melhores formas de tratamento e prevenção.",
      "A hipertensão arterial sistêmica é uma doença crônica não transmissível que causa mais de 7 milhões de mortes por ano."
    ]
  },
  {
    keyword: "catarata",
    domains: [".gov.br", ".org.br", ".com.br", ".edu.br"],
    titlePrefixes: ["Catarata: ", "Cirurgia de ", "Tratamento para ", "Sintomas de ", "Guia completo: "],
    titleSuffixes: [" - CBO", " | Hospital de Olhos", " | Dráuzio Varella", " | Sociedade Brasileira de Oftalmologia", " - Manual MSD"],
    snippets: [
      "A catarata é uma condição em que o cristalino, lente natural do olho, torna-se opaco, causando diminuição da visão.",
      "Saiba quando é necessário realizar cirurgia de catarata e como é o procedimento.",
      "A catarata é responsável por 51% dos casos de cegueira no mundo, afetando principalmente pessoas acima de 50 anos.",
      "O tratamento da catarata é cirúrgico e consiste na remoção do cristalino opaco e implante de uma lente intraocular.",
      "Conheça os sintomas, causas e tratamentos para catarata, problema ocular que afeta principalmente idosos."
    ]
  }
];

// Função para gerar análises DISCERN simuladas
function generateMockDiscernResults(searchResults: SearchResultItem[]): DiscernResult[] {
  return searchResults.map((result) => {
    const scores = [];
    let totalScore = 0;
    
    // Gerar pontuações para cada critério (1-15)
    for (let criteriaId = 1; criteriaId <= 15; criteriaId++) {
      // Gerar pontuação entre 2 e 5, com maior probabilidade de valores mais altos para sites gov.br e mais baixos para outros
      const isGovSite = result.url.includes('.gov.br');
      const baseScore = isGovSite ? 3 : 2;
      const maxBonus = isGovSite ? 2 : 3;
      const score = baseScore + Math.floor(Math.random() * maxBonus);
      
      totalScore += score;
      
      // Justificativas genéricas baseadas na pontuação
      let justification = '';
      if (score >= 4) {
        justification = `Excelente abordagem no critério ${criteriaId}, com informações detalhadas e precisas.`;
      } else if (score === 3) {
        justification = `Abordagem satisfatória do critério ${criteriaId}, mas poderia ser mais completa.`;
      } else {
        justification = `Abordagem insuficiente do critério ${criteriaId}, faltam informações importantes.`;
      }
      
      scores.push({
        criteriaId,
        score,
        justification
      });
    }
    
    // Tipo de conteúdo e observações
    const contentTypes = ["HTML", "PDF", "HTML", "HTML", "YouTube"];
    const type = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    
    let observations = '';
    if (totalScore > 60) {
      observations = "Fonte de alta qualidade com informações abrangentes e confiáveis.";
    } else if (totalScore > 45) {
      observations = "Fonte de qualidade média com algumas informações úteis, mas com lacunas importantes.";
    } else {
      observations = "Fonte de baixa qualidade com informações incompletas ou potencialmente enganosas.";
    }
    
    return {
      url: result.url,
      title: result.title,
      type,
      totalScore,
      scores,
      observations
    };
  });
}

// Função de busca que agora usa a Edge Function do Supabase
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

// DISCERN analysis function to simulate API call
export async function analyzeWithDiscern(url: string): Promise<DiscernResult | null> {
  console.log(`Analyzing URL: ${url}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // In a real implementation, this would fetch and analyze the URL
  // For now, we'll return null since this function is not used directly
  return null;
}

// Batch analysis function
export async function batchAnalyzeWithDiscern(urls: string[]): Promise<DiscernResult[]> {
  console.log(`Batch analyzing ${urls.length} URLs`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Generate mock DISCERN results for the search results
  const searchResults = urls.map((url, index) => {
    // Extract title from URL for simulation
    const urlParts = url.split('/');
    const pathPart = urlParts[urlParts.length - 1];
    const title = pathPart.split('-').join(' ');
    
    return {
      ranking: index + 1,
      title: `Result for ${title}`,
      url,
      snippet: "Generated snippet for this result"
    };
  });
  
  return generateMockDiscernResults(searchResults);
}

// Export function
export async function exportResults(results: DiscernResult[]): Promise<boolean> {
  console.log(`Exporting ${results.length} results`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return true;
}
