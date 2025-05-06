
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";

// Obter tokens da API e ID do assistente
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_ASSISTANT_ID = Deno.env.get("OPENAI_ASSISTANT_ID");

// Headers CORS para permitir chamadas da aplicação
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para extrair o conteúdo de uma URL
async function extractUrlContent(url: string): Promise<string> {
  try {
    console.log(`Extraindo conteúdo da URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Falha ao buscar conteúdo: ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type") || "";
    
    // Se for HTML, processar como texto
    if (contentType.includes("text/html")) {
      const html = await response.text();
      
      // Extrair apenas o texto visível do HTML para simplificar
      // Isso é uma simplificação, seria melhor usar um parser HTML adequado
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      // Limitar o tamanho do texto para evitar exceder limites da API
      const limitedText = textContent.substring(0, 8000);
      console.log(`Conteúdo extraído com sucesso (${limitedText.length} caracteres)`);
      return limitedText;
    }
    
    // Tipos não suportados
    return "Conteúdo não suportado: " + contentType;
  } catch (error) {
    console.error(`Erro ao extrair conteúdo da URL ${url}:`, error);
    return `Erro ao extrair conteúdo: ${error.message}`;
  }
}

// Função para analisar o conteúdo com o método DISCERN usando OpenAI
async function analyzeWithDiscern(content: string, title: string, url: string): Promise<any> {
  if (!OPENAI_API_KEY || !OPENAI_ASSISTANT_ID) {
    throw new Error("Chaves de API OpenAI ou ID do assistente não configurados");
  }
  
  console.log(`Analisando conteúdo com OpenAI: ${title.substring(0, 30)}...`);
  
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });

  try {
    // Criar um thread
    const thread = await openai.beta.threads.create();
    
    // Adicionar uma mensagem ao thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Analise o seguinte conteúdo de saúde usando o método DISCERN:
      
      URL: ${url}
      Título: ${title}
      
      CONTEÚDO:
      ${content}
      
      Forneça sua análise seguindo os critérios DISCERN para avaliação de informações de saúde. Retorne o resultado em formato JSON com:
      1. Uma pontuação numérica (1-5) para cada um dos 15 critérios DISCERN
      2. Uma justificativa para cada pontuação
      3. Uma pontuação total somando todas as pontuações (máximo 75 pontos)
      4. Observações gerais sobre o conteúdo analisado
      5. Classificação do tipo de conteúdo (HTML, PDF, vídeo, etc.)
      
      IMPORTANTE: Retorne APENAS o objeto JSON sem explicações adicionais.`
    });
    
    // Executar o assistente
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: OPENAI_ASSISTANT_ID
    });
    
    // Aguardar a conclusão da execução
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 60; // Limitar a 10 minutos de espera
    
    while (runStatus.status !== "completed" && runStatus.status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Aguardar 10 segundos
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      console.log(`Aguardando análise: ${runStatus.status} (tentativa ${attempts}/${maxAttempts})`);
    }
    
    if (runStatus.status !== "completed") {
      throw new Error(`Análise não concluída. Status: ${runStatus.status}`);
    }
    
    // Obter as mensagens resultantes
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    // Encontrar a resposta do assistente (última mensagem)
    const assistantMessages = messages.data
      .filter(msg => msg.role === "assistant")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (assistantMessages.length === 0) {
      throw new Error("Nenhuma resposta do assistente foi encontrada");
    }
    
    // Extrair o conteúdo JSON da resposta
    const responseContent = assistantMessages[0].content[0];
    if (responseContent.type !== "text") {
      throw new Error("Resposta não está em formato de texto");
    }
    
    // Tentar extrair JSON da resposta
    const textResponse = responseContent.text.value;
    let jsonStart = textResponse.indexOf('{');
    let jsonEnd = textResponse.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Não foi possível encontrar JSON na resposta");
    }
    
    const jsonText = textResponse.substring(jsonStart, jsonEnd + 1);
    const result = JSON.parse(jsonText);
    
    console.log("Análise DISCERN concluída com sucesso");
    return result;
  } catch (error) {
    console.error("Erro na análise DISCERN:", error);
    throw error;
  }
}

// Endpoint principal
serve(async (req) => {
  // Lidar com solicitações OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { url, title } = await req.json();
    
    if (!url) {
      throw new Error("URL é obrigatória para análise");
    }
    
    console.log(`Iniciando análise DISCERN para: ${url}`);
    
    // Extrair conteúdo da URL
    const content = await extractUrlContent(url);
    
    // Analisar conteúdo com DISCERN
    const discernAnalysis = await analyzeWithDiscern(content, title || url, url);
    
    // Processar e formatar os resultados da análise
    const formattedResult = {
      url: url,
      title: title || url,
      type: discernAnalysis.type || "HTML",
      totalScore: discernAnalysis.totalScore || 0,
      scores: discernAnalysis.scores || [],
      observations: discernAnalysis.observations || ""
    };
    
    return new Response(
      JSON.stringify(formattedResult), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Erro na função discern-analysis:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido na análise DISCERN" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
