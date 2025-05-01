
import { DiscernResult, SearchResultItem } from "./discern-criteria";

// Simulated search results - in a real implementation, this would call an API
const mockSearchResults: SearchResultItem[] = [
  {
    ranking: 1,
    title: "Diabetes: sintomas, tipos e tratamentos - Ministério da Saúde",
    url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/d/diabetes",
    snippet: "O diabetes é uma doença crônica na qual o corpo não produz insulina ou não consegue empregar adequadamente a insulina que produz."
  },
  {
    ranking: 2,
    title: "Diabetes - O que é, sintomas, tipos e tratamento | Dráuzio Varella",
    url: "https://drauziovarella.uol.com.br/doencas-e-sintomas/diabetes/",
    snippet: "Diabetes é uma doença caracterizada pela elevação da glicose no sangue (hiperglicemia). Pode ocorrer devido a defeitos na secreção ou na ação do hormônio insulina."
  },
  {
    ranking: 3,
    title: "Diabetes: sintomas, causas, tipos e tratamentos | Doutora Responde",
    url: "https://www.doutora-responde.com/blog/diabetes",
    snippet: "A diabetes é uma doença metabólica crônica que causa o aumento da glicemia, que é a quantidade de glicose no sangue."
  }
];

// Simulated DISCERN results
const mockDiscernResults: DiscernResult[] = [
  {
    url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/d/diabetes",
    title: "Diabetes: sintomas, tipos e tratamentos - Ministério da Saúde",
    type: "HTML",
    totalScore: 62,
    scores: [
      { criteriaId: 1, score: 5, justification: "Os objetivos são muito claros, explicando o que é diabetes, seus tipos e tratamentos." },
      { criteriaId: 2, score: 4, justification: "Atinge bem os objetivos propostos, fornecendo informações completas sobre diabetes." },
      { criteriaId: 3, score: 5, justification: "Altamente relevante para pacientes com diabetes e familiares." },
      { criteriaId: 4, score: 4, justification: "Identifica as fontes de informação, incluindo estudos científicos." },
      { criteriaId: 5, score: 3, justification: "Indica quando as informações foram atualizadas, mas não todas as fontes." },
      { criteriaId: 6, score: 4, justification: "Apresenta informações de maneira balanceada e imparcial." },
      { criteriaId: 7, score: 4, justification: "Fornece links para informações adicionais e recursos de apoio." },
      { criteriaId: 8, score: 3, justification: "Menciona algumas áreas de incerteza, mas poderia ser mais completo." },
      { criteriaId: 9, score: 5, justification: "Explica claramente como funcionam os tratamentos para diabetes." },
      { criteriaId: 10, score: 5, justification: "Descreve detalhadamente os benefícios de cada tratamento." },
      { criteriaId: 11, score: 4, justification: "Aborda os riscos dos tratamentos de forma adequada." },
      { criteriaId: 12, score: 4, justification: "Explica as consequências de não tratar a diabetes." },
      { criteriaId: 13, score: 4, justification: "Discute como os tratamentos afetam a qualidade de vida." },
      { criteriaId: 14, score: 4, justification: "Apresenta claramente diferentes opções de tratamento." },
      { criteriaId: 15, score: 4, justification: "Oferece suporte para tomada de decisão compartilhada." }
    ],
    observations: "Fonte oficial do Ministério da Saúde com informações abrangentes e confiáveis sobre diabetes."
  },
  {
    url: "https://drauziovarella.uol.com.br/doencas-e-sintomas/diabetes/",
    title: "Diabetes - O que é, sintomas, tipos e tratamento | Dráuzio Varella",
    type: "HTML",
    totalScore: 58,
    scores: [
      { criteriaId: 1, score: 4, justification: "Os objetivos são claros, explicando os aspectos da diabetes." },
      { criteriaId: 2, score: 4, justification: "Atinge os objetivos de informar sobre a doença e tratamentos." },
      { criteriaId: 3, score: 5, justification: "Conteúdo muito relevante para o público-alvo." },
      { criteriaId: 4, score: 4, justification: "Identifica as fontes de informação médica." },
      { criteriaId: 5, score: 3, justification: "Indica data de publicação, mas não todas as referências." },
      { criteriaId: 6, score: 4, justification: "Conteúdo balanceado com foco em evidências." },
      { criteriaId: 7, score: 3, justification: "Fornece algumas fontes adicionais de informação." },
      { criteriaId: 8, score: 3, justification: "Menciona algumas áreas de incerteza no tratamento." },
      { criteriaId: 9, score: 5, justification: "Explica claramente os mecanismos de tratamento." },
      { criteriaId: 10, score: 4, justification: "Descreve os benefícios esperados dos tratamentos." },
      { criteriaId: 11, score: 4, justification: "Aborda riscos e efeitos colaterais dos medicamentos." },
      { criteriaId: 12, score: 4, justification: "Explica as consequências da diabetes não tratada." },
      { criteriaId: 13, score: 4, justification: "Discute impactos na qualidade de vida." },
      { criteriaId: 14, score: 4, justification: "Apresenta diferentes opções terapêuticas." },
      { criteriaId: 15, score: 3, justification: "Oferece algum suporte para tomada de decisão." }
    ],
    observations: "Conteúdo criado por uma fonte médica respeitada, com informações baseadas em evidências científicas."
  },
  {
    url: "https://www.doutora-responde.com/blog/diabetes",
    title: "Diabetes: sintomas, causas, tipos e tratamentos | Doutora Responde",
    type: "HTML",
    totalScore: 45,
    scores: [
      { criteriaId: 1, score: 3, justification: "Os objetivos são relativamente claros, mas não totalmente explícitos." },
      { criteriaId: 2, score: 3, justification: "Atinge parcialmente os objetivos de informar sobre diabetes." },
      { criteriaId: 3, score: 4, justification: "Conteúdo relevante para pessoas interessadas em diabetes." },
      { criteriaId: 4, score: 2, justification: "Fontes de informação pouco identificadas." },
      { criteriaId: 5, score: 2, justification: "Data das informações não claramente indicada." },
      { criteriaId: 6, score: 3, justification: "Apresenta algum balanceamento, mas com viés ocasional." },
      { criteriaId: 7, score: 2, justification: "Poucas fontes adicionais de informação." },
      { criteriaId: 8, score: 2, justification: "Raramente menciona áreas de incerteza." },
      { criteriaId: 9, score: 3, justification: "Explicação básica sobre como funcionam os tratamentos." },
      { criteriaId: 10, score: 4, justification: "Descreve adequadamente os benefícios dos tratamentos." },
      { criteriaId: 11, score: 3, justification: "Menciona alguns riscos dos tratamentos, mas não todos." },
      { criteriaId: 12, score: 3, justification: "Discute brevemente o que acontece sem tratamento." },
      { criteriaId: 13, score: 3, justification: "Abordagem limitada sobre qualidade de vida." },
      { criteriaId: 14, score: 4, justification: "Apresenta diversas opções de tratamento." },
      { criteriaId: 15, score: 3, justification: "Suporte limitado para tomada de decisão." }
    ],
    observations: "Site de informações médicas com conteúdo de qualidade média, faltando algumas referências científicas e detalhes importantes."
  }
];

// Search function to simulate API call
export async function searchWithKeyword(keyword: string, quantity: number = 10): Promise<SearchResultItem[]> {
  console.log(`Searching for "${keyword}" with quantity: ${quantity}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return mockSearchResults;
}

// DISCERN analysis function to simulate API call
export async function analyzeWithDiscern(url: string): Promise<DiscernResult | null> {
  console.log(`Analyzing URL: ${url}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const result = mockDiscernResults.find(item => item.url === url);
  return result || null;
}

// Batch analysis function
export async function batchAnalyzeWithDiscern(urls: string[]): Promise<DiscernResult[]> {
  console.log(`Batch analyzing ${urls.length} URLs`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return mockDiscernResults.filter(item => urls.includes(item.url));
}

// Export function
export async function exportResults(results: DiscernResult[]): Promise<boolean> {
  console.log(`Exporting ${results.length} results`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return true;
}
