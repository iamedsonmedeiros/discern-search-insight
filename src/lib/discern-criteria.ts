
export interface DiscernCriteria {
  id: number;
  question: string;
  category: 'reliability' | 'quality' | 'treatment';
  description: string;
}

export interface DiscernScoreItem {
  criteriaId: number;
  score: number;
  justification: string;
}

export interface DiscernResult {
  url: string;
  title: string;
  type: string;
  totalScore: number;
  scores: DiscernScoreItem[];
  observations: string;
}

export interface SearchResultItem {
  ranking: number;
  title: string;
  url: string;
  snippet: string;
}

export const discernCriteria: DiscernCriteria[] = [
  {
    id: 1,
    question: "Os objetivos são claros?",
    category: "reliability",
    description: "A publicação torna claros quais são seus objetivos."
  },
  {
    id: 2,
    question: "Atinge seus objetivos?",
    category: "reliability",
    description: "A publicação atinge os objetivos declarados no item 1."
  },
  {
    id: 3,
    question: "É relevante?",
    category: "reliability",
    description: "A publicação é relevante para o paciente/leitor."
  },
  {
    id: 4,
    question: "Identifica fontes?",
    category: "reliability",
    description: "A publicação deixa claro quais são as fontes de informação usadas."
  },
  {
    id: 5,
    question: "Data das informações?",
    category: "reliability",
    description: "A publicação deixa claro quando as informações usadas foram produzidas."
  },
  {
    id: 6,
    question: "É balanceado e imparcial?",
    category: "quality",
    description: "A publicação é balanceada e sem viés."
  },
  {
    id: 7,
    question: "Fontes adicionais?",
    category: "quality",
    description: "A publicação fornece detalhes de fontes adicionais de suporte e informação."
  },
  {
    id: 8,
    question: "Áreas de incerteza?",
    category: "quality",
    description: "A publicação aponta áreas de incerteza."
  },
  {
    id: 9,
    question: "Como funciona o tratamento?",
    category: "treatment",
    description: "A publicação descreve como cada tratamento funciona."
  },
  {
    id: 10,
    question: "Benefícios do tratamento?",
    category: "treatment",
    description: "A publicação descreve os benefícios de cada tratamento."
  },
  {
    id: 11,
    question: "Riscos do tratamento?",
    category: "treatment",
    description: "A publicação descreve os riscos de cada tratamento."
  },
  {
    id: 12,
    question: "Sem tratamento?",
    category: "treatment",
    description: "A publicação descreve o que aconteceria se nenhum tratamento fosse usado."
  },
  {
    id: 13,
    question: "Qualidade de vida?",
    category: "treatment",
    description: "A publicação descreve como as opções de tratamento afetam a qualidade de vida."
  },
  {
    id: 14,
    question: "Alternativas claras?",
    category: "treatment",
    description: "A publicação deixa claro que pode haver mais de uma opção de tratamento possível."
  },
  {
    id: 15,
    question: "Apoio à decisão?",
    category: "treatment",
    description: "A publicação fornece apoio para a tomada de decisão compartilhada."
  }
];

export function getQualityLabel(score: number): string {
  if (score < 30) return "Baixa Qualidade";
  if (score < 50) return "Qualidade Média";
  return "Alta Qualidade";
}

export function getQualityColor(score: number): string {
  if (score < 30) return "discern-low";
  if (score < 50) return "discern-medium";
  return "discern-high";
}

export function getCategoryScore(scores: DiscernScoreItem[], category: string): number {
  const categoryCriteria = discernCriteria.filter(c => c.category === category);
  const categoryScores = scores.filter(s => 
    categoryCriteria.some(c => c.id === s.criteriaId)
  );
  
  if (categoryScores.length === 0) return 0;
  
  const total = categoryScores.reduce((sum, item) => sum + item.score, 0);
  return Math.round((total / (categoryScores.length * 5)) * 100);
}
