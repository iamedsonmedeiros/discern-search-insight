
import { DiscernCriteria } from "./discern-criteria";

// Exportando os tipos necessários
export interface SearchResultItem {
  ranking: number;
  title: string;
  url: string;
  snippet: string;
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

// Base de dados para gerar resultados simulados
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

// Função para gerar resultados simulados baseados na palavra-chave e quantidade
function generateMockResults(keyword: string, quantity: number): SearchResultItem[] {
  // Encontrar o tópico relevante ou usar o primeiro como padrão
  const topic = healthTopics.find(t => keyword.toLowerCase().includes(t.keyword)) || healthTopics[0];
  
  const results: SearchResultItem[] = [];
  
  for (let i = 1; i <= quantity; i++) {
    const titlePrefix = topic.titlePrefixes[Math.floor(Math.random() * topic.titlePrefixes.length)];
    const titleSuffix = topic.titleSuffixes[Math.floor(Math.random() * topic.titleSuffixes.length)];
    const domain = topic.domains[Math.floor(Math.random() * topic.domains.length)];
    const snippet = topic.snippets[Math.floor(Math.random() * topic.snippets.length)];
    const urlPath = keyword.toLowerCase().replace(/\s+/g, '-');
    
    results.push({
      ranking: i,
      title: `${titlePrefix}${keyword}${titleSuffix}`,
      url: `https://saude${domain}/${urlPath}-${i}`,
      snippet: snippet
    });
  }
  
  return results;
}

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

// Search function to simulate API call
export async function searchWithKeyword(keyword: string, quantity: number = 10): Promise<SearchResultItem[]> {
  console.log(`Searching for "${keyword}" with quantity: ${quantity}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate dynamic results based on the quantity requested
  return generateMockResults(keyword, quantity);
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
