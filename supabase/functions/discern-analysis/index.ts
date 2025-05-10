import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from "npm:openai@4.20.1";
import { createClient } from "npm:@supabase/supabase-js@2.38.0";
import ytdl from "npm:ytdl-core@4.11.5";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_ASSISTANT_ID = Deno.env.get("OPENAI_ASSISTANT_ID");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isVideoUrl(url: string): boolean {
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

async function extractYoutubeAudio(url: string): Promise<Uint8Array | null> {
  try {
    console.log(`Iniciando extração de áudio do YouTube: ${url}`);
    
    if (!ytdl.validateURL(url)) {
      throw new Error("URL do YouTube inválida");
    }
    
    const maxRetries = 3;
    let attempt = 0;
    let lastError: Error | null = null;
    
    while (attempt < maxRetries) {
      try {
        const info = await ytdl.getInfo(url, {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          }
        });
        
        const audioFormat = ytdl.chooseFormat(info.formats, { 
          quality: 'highestaudio', 
          filter: 'audioonly' 
        });
        
        if (!audioFormat) {
          throw new Error("Nenhum formato de áudio disponível");
        }
        
        const audioResponse = await fetch(audioFormat.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!audioResponse.ok) {
          throw new Error(`Falha ao baixar áudio: ${audioResponse.status}`);
        }
        
        const arrayBuffer = await audioResponse.arrayBuffer();
        console.log("Áudio extraído com sucesso");
        return new Uint8Array(arrayBuffer);
      } catch (retryError) {
        lastError = retryError as Error;
        attempt++;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Tentativa ${attempt} falhou, aguardando ${delay}ms antes de tentar novamente`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Falha após ${maxRetries} tentativas: ${lastError?.message}`);
  } catch (error) {
    console.error(`Erro ao extrair áudio do YouTube: ${error.message}`);
    return null;
  }
}

async function transcribeAudio(audioBuffer: Uint8Array): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("API Key da OpenAI não configurada");
  }
  
  try {
    console.log("Iniciando transcrição de áudio");
    
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    const audioBlob = new Blob([audioBuffer], { type: "audio/mp4" });
    const audioFile = new File([audioBlob], "audio.mp4", { type: "audio/mp4" });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pt",
      response_format: "text"
    });
    
    console.log("Transcrição concluída com sucesso");
    return transcription || "";
  } catch (error) {
    console.error(`Erro na transcrição do áudio: ${error.message}`);
    throw new Error(`Falha na transcrição: ${error.message}`);
  }
}

async function extractVideoMetadata(url: string): Promise<{ title: string; description: string }> {
  try {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const info = await ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      });
      return {
        title: info.videoDetails.title || "",
        description: info.videoDetails.description || ""
      };
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Falha ao buscar página: ${response.status}`);
    }
    
    const html = await response.text();
    
    let title = "";
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i) || 
                      html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    let description = "";
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || 
                     html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }
    
    return { title, description };
  } catch (error) {
    console.error(`Erro ao extrair metadados: ${error.message}`);
    return { title: "", description: "" };
  }
}

async function extractUrlContent(url: string): Promise<string> {
  try {
    console.log(`Iniciando extração de conteúdo: ${url}`);
    
    if (isVideoUrl(url)) {
      console.log("URL de vídeo detectada");
      
      const metadata = await extractVideoMetadata(url);
      let content = `Título: ${metadata.title}\nDescrição: ${metadata.description}\n\n`;
      
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        try {
          const audioBuffer = await extractYoutubeAudio(url);
          if (audioBuffer) {
            const transcription = await transcribeAudio(audioBuffer);
            content += `Transcrição:\n${transcription}`;
          } else {
            content += "Não foi possível extrair o áudio para transcrição.";
          }
        } catch (audioError) {
          console.error("Erro no processamento de áudio:", audioError);
          content += `\nNota: Análise baseada apenas nos metadados do vídeo devido a: ${audioError.message}`;
        }
      } else {
        content += "Transcrição não disponível para esta plataforma de vídeo.";
      }
      
      return content;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Falha ao buscar conteúdo: ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      return textContent.substring(0, 8000);
    }
    
    return `Tipo de conteúdo não suportado: ${contentType}`;
  } catch (error) {
    console.error(`Erro ao extrair conteúdo: ${error.message}`);
    throw new Error(`Falha ao extrair conteúdo: ${error.message}`);
  }
}

async function analyzeWithOpenAI(content: string, title: string, url: string): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error("API Key da OpenAI não configurada");
  }
  
  try {
    console.log(`Analisando conteúdo com OpenAI: ${title.substring(0, 30)}...`);
    
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Você é um avaliador especializado que analisa informações de saúde usando o método DISCERN.`
        },
        {
          role: "user",
          content: `Analise o seguinte conteúdo usando o método DISCERN:
          
          URL: ${url}
          Título: ${title}
          
          CONTEÚDO:
          ${content}`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error("Resposta vazia da OpenAI");
    }
    
    const result = JSON.parse(responseContent);
    
    return {
      url,
      title: title || url,
      type: result.type || "HTML",
      totalScore: result.totalScore || 0,
      scores: result.scores || [],
      observations: result.observations || ""
    };
  } catch (error) {
    console.error("Erro na análise OpenAI:", error);
    throw new Error(`Falha na análise: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("API Key da OpenAI não configurada");
    }
    
    const { url, title } = await req.json();
    
    if (!url) {
      throw new Error("URL é obrigatória para análise");
    }
    
    console.log(`Iniciando análise para: ${url}`);
    
    try {
      const content = await extractUrlContent(url);
      const analysis = await analyzeWithOpenAI(content, title || url, url);
      
      return new Response(
        JSON.stringify(analysis),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    } catch (processingError) {
      console.error("Erro no processamento:", processingError);
      return new Response(
        JSON.stringify({
          error: "Erro no processamento do conteúdo",
          details: processingError.message,
          url,
          title: title || url,
          type: "ERROR",
          totalScore: 0,
          scores: [],
          observations: `Falha na análise: ${processingError.message}`
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    }
  } catch (error) {
    console.error("Erro na função discern-analysis:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro desconhecido na análise",
        details: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }
});