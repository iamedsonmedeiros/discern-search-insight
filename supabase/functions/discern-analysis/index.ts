
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
// Add ytdl-core for YouTube videos
import ytdl from "https://esm.sh/ytdl-core@4.11.5";

// Obter tokens da API e ID do assistente
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_ASSISTANT_ID = Deno.env.get("OPENAI_ASSISTANT_ID");

// Headers CORS para permitir chamadas da aplicação
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para determinar se uma URL é de vídeo
function isVideoUrl(url: string): boolean {
  // Identificar URLs de plataformas de vídeo comuns
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

// Função para extrair o áudio de vídeo do YouTube
async function extractYoutubeAudio(url: string): Promise<Uint8Array | null> {
  try {
    console.log(`Extraindo áudio do YouTube: ${url}`);
    
    // Verificar se a URL é válida para o YouTube
    if (!ytdl.validateURL(url)) {
      console.log("URL do YouTube inválida");
      return null;
    }
    
    // Obter informações do vídeo
    const info = await ytdl.getInfo(url);
    
    // Obter o formato com apenas áudio de melhor qualidade
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    
    if (!audioFormat) {
      console.log("Nenhum formato de áudio encontrado");
      return null;
    }
    
    // Baixar o áudio
    const audioResponse = await fetch(audioFormat.url);
    
    if (!audioResponse.ok) {
      throw new Error(`Falha ao baixar áudio: ${audioResponse.status}`);
    }
    
    const arrayBuffer = await audioResponse.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error(`Erro ao extrair áudio do YouTube: ${error.message}`);
    return null;
  }
}

// Função para transcrever áudio usando a API do OpenAI
async function transcribeAudio(audioBuffer: Uint8Array): Promise<string> {
  try {
    console.log("Iniciando transcrição de áudio com OpenAI...");
    
    if (!OPENAI_API_KEY) {
      throw new Error("API Key da OpenAI não configurada");
    }
    
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    // Converter o buffer para um Blob
    const audioBlob = new Blob([audioBuffer], { type: "audio/mp4" });
    
    // Criar um objeto File a partir do Blob
    const audioFile = new File([audioBlob], "audio.mp4", { type: "audio/mp4" });
    
    // Transcrever usando a API Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pt", // Usar detecção automática ou especificar o idioma
      response_format: "text"
    });
    
    console.log("Transcrição concluída com sucesso");
    return transcription.text || ""; // Retornar o texto transcrito
  } catch (error) {
    console.error(`Erro na transcrição do áudio: ${error.message}`);
    return `[Erro na transcrição do áudio: ${error.message}]`;
  }
}

// Função para extrair metadados básicos de uma página de vídeo
async function extractVideoMetadata(url: string): Promise<{ title: string; description: string }> {
  try {
    console.log(`Extraindo metadados de vídeo: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Falha ao buscar página: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extrair título (tag title ou meta og:title)
    let title = "";
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i) || 
                      html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    // Extrair descrição (meta description ou og:description)
    let description = "";
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || 
                     html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }
    
    return { title, description };
  } catch (error) {
    console.error(`Erro ao extrair metadados de vídeo: ${error.message}`);
    return { title: "", description: "" };
  }
}

// Função para extrair o conteúdo de uma URL
async function extractUrlContent(url: string): Promise<string> {
  try {
    console.log(`Extraindo conteúdo da URL: ${url}`);
    
    // Verificar se é uma URL de vídeo
    if (isVideoUrl(url)) {
      console.log("Detectado URL de vídeo. Iniciando processamento especial...");
      
      // Extrair metadados básicos da página do vídeo
      const metadata = await extractVideoMetadata(url);
      
      let content = `Título: ${metadata.title}\nDescrição: ${metadata.description}\n\n`;
      
      // Para URLs do YouTube, extrair e transcrever o áudio
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const audioBuffer = await extractYoutubeAudio(url);
        
        if (audioBuffer) {
          console.log("Áudio extraído com sucesso, iniciando transcrição...");
          const transcription = await transcribeAudio(audioBuffer);
          content += `Transcrição do áudio:\n${transcription}`;
        } else {
          content += "Não foi possível extrair o áudio para transcrição.";
        }
      } else {
        // Para outros sites de vídeo, apenas informar que a transcrição não está disponível
        content += "A transcrição de áudio para este site de vídeo ainda não é suportada.";
      }
      
      return content;
    }
    
    // Continuar com o processamento normal para páginas não-vídeo
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Falha ao buscar conteúdo: ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type") || "";
    
    // Se for HTML, processar como texto
    if (contentType.includes("text/html")) {
      const html = await response.text();
      
      // Extrair apenas o texto visível do HTML para simplificar
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

// Função alternativa para análise direta com a OpenAI sem o Assistants API
async function analyzeWithOpenAI(content: string, title: string, url: string): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error("API Key da OpenAI não configurada");
  }
  
  console.log(`Analisando conteúdo com OpenAI Chat API: ${title.substring(0, 30)}...`);
  
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });

  try {
    // Usar completions direto em vez do assistants API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `Você é um avaliador especializado que analisa informações de saúde usando o método DISCERN.
                   O método DISCERN avalia a qualidade de informações de saúde através de 15 critérios,
                   pontuados de 1 (baixa qualidade) a 5 (alta qualidade).`
        },
        {
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
          
          IMPORTANTE: Retorne APENAS o objeto JSON sem explicações adicionais. O JSON deve seguir essa estrutura exata:
          {
            "scores": [
              {"criteriaId": 1, "score": 3, "justification": "Justificativa para o critério 1"},
              {"criteriaId": 2, "score": 4, "justification": "Justificativa para o critério 2"},
              ...e assim por diante para todos os 15 critérios
            ],
            "totalScore": 45,
            "observations": "Observações gerais sobre o conteúdo",
            "type": "HTML"
          }`
        }
      ],
      temperature: 0.2, // Baixa temperatura para resultados consistentes
      response_format: { type: "json_object" }, // Forçar resposta em JSON
    });
    
    // Extrair o texto da resposta
    const responseContent = completion.choices[0].message.content;
    
    if (!responseContent) {
      throw new Error("Resposta vazia da OpenAI");
    }
    
    try {
      // Fazer parse do JSON
      const result = JSON.parse(responseContent);
      
      // Validar se o resultado tem a estrutura esperada
      if (!result.scores || !result.totalScore) {
        throw new Error("Estrutura de resposta inválida");
      }
      
      console.log("Análise DISCERN concluída com sucesso");
      
      // Garantir que o resultado tenha um formato consistente
      return {
        url: url,
        title: title || url,
        type: result.type || "HTML",
        totalScore: result.totalScore || 0,
        scores: result.scores || [],
        observations: result.observations || ""
      };
    } catch (parseError) {
      console.error("Erro ao processar JSON da resposta:", parseError);
      console.error("Resposta recebida:", responseContent);
      throw new Error("Falha ao processar resultado da análise");
    }
  } catch (error) {
    console.error("Erro na análise com OpenAI:", error);
    throw error;
  }
}

// Função para analisar o conteúdo com o método DISCERN usando OpenAI
async function analyzeWithDiscern(content: string, title: string, url: string): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error("API Key da OpenAI não configurada");
  }

  try {
    // Tentar o método direto primeiro (mais confiável)
    return await analyzeWithOpenAI(content, title, url);
  } catch (directError) {
    console.error("Erro no método direto, tentando fallback:", directError);
    
    // Se o método direto falhar e não tivermos ID do assistente, não podemos continuar
    if (!OPENAI_ASSISTANT_ID) {
      throw new Error("ID do Assistente OpenAI não configurado e método direto falhou");
    }
    
    console.log("Tentando método assistente como fallback...");
    
    // Fallback para o método do assistente
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });

    try {
      // Criar um thread com o cabeçalho explícito para v2
      const thread = await openai.beta.threads.create(
        {},
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );
      
      // Adicionar uma mensagem ao thread com o cabeçalho v2
      await openai.beta.threads.messages.create(
        thread.id, 
        {
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
        },
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );
      
      // Executar o assistente com o cabeçalho v2
      const run = await openai.beta.threads.runs.create(
        thread.id,
        {
          assistant_id: OPENAI_ASSISTANT_ID
        },
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );
      
      // Aguardar a conclusão da execução com o cabeçalho v2
      let runStatus = await openai.beta.threads.runs.retrieve(
        thread.id, 
        run.id,
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );
      
      let attempts = 0;
      const maxAttempts = 30; // 5 minutos (10s * 30)
      
      while (
        (runStatus.status === "in_progress" || 
         runStatus.status === "queued" || 
         runStatus.status === "requires_action") && 
        attempts < maxAttempts
      ) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Aguardar 10 segundos
        runStatus = await openai.beta.threads.runs.retrieve(
          thread.id, 
          run.id,
          {
            headers: {
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );
        attempts++;
        console.log(`Aguardando análise: ${runStatus.status} (tentativa ${attempts}/${maxAttempts})`);
      }
      
      if (runStatus.status !== "completed") {
        console.error(`Análise não concluída após ${attempts} tentativas. Status final: ${runStatus.status}`);
        throw new Error(`Análise não concluída. Status: ${runStatus.status}`);
      }
      
      // Obter as mensagens resultantes com o cabeçalho v2
      const messages = await openai.beta.threads.messages.list(
        thread.id,
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );
      
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
      console.log("Resposta do assistente:", textResponse.substring(0, 100) + "...");
      
      let jsonStart = textResponse.indexOf('{');
      let jsonEnd = textResponse.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Não foi possível encontrar JSON na resposta");
      }
      
      const jsonText = textResponse.substring(jsonStart, jsonEnd + 1);
      const result = JSON.parse(jsonText);
      
      console.log("Análise DISCERN concluída com sucesso");
      
      // Garantir que o resultado tenha um formato consistente
      return {
        url: url,
        title: title || url,
        type: result.type || "HTML",
        totalScore: result.totalScore || 0,
        scores: result.scores || [],
        observations: result.observations || ""
      };
    } catch (error) {
      console.error("Erro na análise DISCERN com assistente:", error);
      throw error;
    }
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
    
    // Se o conteúdo não pôde ser extraído adequadamente, retornar erro
    if (content.startsWith("Erro ao extrair conteúdo:")) {
      throw new Error(content);
    }
    
    // Analisar conteúdo com DISCERN
    const discernAnalysis = await analyzeWithDiscern(content, title || url, url);
    
    // Retornar resultado formatado
    return new Response(
      JSON.stringify(discernAnalysis), 
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
