import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from "npm:openai@4.20.1";
import { createClient } from "npm:@supabase/supabase-js@2.38.0";
import { VideoIntelligenceServiceClient } from "npm:@google-cloud/video-intelligence@5.0.0";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GOOGLE_APPLICATION_CREDENTIALS = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS");

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
    /globo\.com\/.*\/video\//i
  ];

  return videoPatterns.some(pattern => pattern.test(url));
}

async function analyzeVideoContent(url: string): Promise<string> {
  try {
    console.log(`Iniciando análise de vídeo: ${url}`);

    const videoClient = new VideoIntelligenceServiceClient({
      credentials: JSON.parse(GOOGLE_APPLICATION_CREDENTIALS || '{}')
    });

    // Get video metadata first
    const metadata = await extractVideoMetadata(url);
    let content = `Título: ${metadata.title}\nDescrição: ${metadata.description}\n\n`;

    // Analyze video with Google Cloud Video Intelligence
    const [operation] = await videoClient.annotateVideo({
      inputUri: url,
      features: [
        'LABEL_DETECTION',
        'SPEECH_TRANSCRIPTION',
        'TEXT_DETECTION',
        'OBJECT_TRACKING',
        'EXPLICIT_CONTENT_DETECTION'
      ],
      videoContext: {
        speechTranscriptionConfig: {
          languageCode: 'pt-BR',
          enableAutomaticPunctuation: true,
        },
      },
    });

    const [result] = await operation.promise();

    // Add speech transcription
    if (result.speechTranscriptions && result.speechTranscriptions.length > 0) {
      content += "\nTranscrição do Áudio:\n";
      result.speechTranscriptions.forEach(transcription => {
        if (transcription.alternatives && transcription.alternatives.length > 0) {
          content += transcription.alternatives[0].transcript + "\n";
        }
      });
    }

    // Add detected labels
    if (result.labelAnnotations && result.labelAnnotations.length > 0) {
      content += "\nTópicos Detectados:\n";
      result.labelAnnotations.forEach(label => {
        if (label.entity && label.entity.description) {
          content += `- ${label.entity.description}\n`;
        }
      });
    }

    // Add detected text
    if (result.textAnnotations && result.textAnnotations.length > 0) {
      content += "\nTexto Detectado no Vídeo:\n";
      result.textAnnotations.forEach(text => {
        if (text.text) {
          content += `${text.text}\n`;
        }
      });
    }

    // Add detected objects
    if (result.objectAnnotations && result.objectAnnotations.length > 0) {
      content += "\nObjetos Detectados:\n";
      result.objectAnnotations.forEach(object => {
        if (object.entity && object.entity.description) {
          content += `- ${object.entity.description}\n`;
        }
      });
    }

    console.log("Análise de vídeo concluída com sucesso");
    return content;
  } catch (error) {
    console.error(`Erro na análise do vídeo: ${error.message}`);
    throw new Error(`Falha na análise do vídeo: ${error.message}`);
  }
}

async function extractVideoMetadata(url: string): Promise<{ title: string; description: string }> {
  try {
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
      console.log("URL de vídeo detectada, usando Google Cloud Video Intelligence");
      return await analyzeVideoContent(url);
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
      
      if (!textContent) {
        throw new Error("Conteúdo extraído está vazio");
      }
      
      return textContent.substring(0, 8000);
    }
    
    throw new Error(`Tipo de conteúdo não suportado: ${contentType}`);
  } catch (error) {
    console.error(`Erro ao extrair conteúdo: ${error.message}`);
    throw error;
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

    const maxRetries = 3;
    let attempt = 0;
    let lastError: Error | null = null;
    
    while (attempt < maxRetries) {
      try {
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
        
        if (!result.totalScore || !Array.isArray(result.scores)) {
          throw new Error("Resposta da OpenAI em formato inválido");
        }
        
        return {
          url,
          title: title || url,
          type: result.type || (isVideoUrl(url) ? "VIDEO" : "HTML"),
          totalScore: result.totalScore || 0,
          scores: result.scores || [],
          observations: result.observations || ""
        };
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
    console.error("Erro na análise OpenAI:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "API Key da OpenAI não configurada",
          status: "error"
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

    if (!GOOGLE_APPLICATION_CREDENTIALS) {
      return new Response(
        JSON.stringify({ 
          error: "Credenciais do Google Cloud não configuradas",
          status: "error"
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
    
    const { url, title } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ 
          error: "URL é obrigatória para análise",
          status: "error"
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    }
    
    console.log(`Iniciando análise para: ${url}`);
    
    try {
      const content = await extractUrlContent(url);
      if (!content) {
        throw new Error("Não foi possível extrair conteúdo da URL");
      }
      
      const analysis = await analyzeWithOpenAI(content, title || url, url);
      
      return new Response(
        JSON.stringify({
          ...analysis,
          status: "success"
        }),
        { 
          status: 200,
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
          error: processingError.message,
          status: "error",
          url,
          title: title || url,
          type: "ERROR",
          totalScore: 0,
          scores: [],
          observations: `Falha na análise: ${processingError.message}`
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
  } catch (error) {
    console.error("Erro na função discern-analysis:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro desconhecido na análise",
        status: "error",
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