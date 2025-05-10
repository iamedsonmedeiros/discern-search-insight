import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const SERP_API_KEY = Deno.env.get("SERP_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { keyword, quantity = 10 } = await req.json();
    
    console.log(`Searching with SERP API for "${keyword}" with quantity: ${quantity}`);
    
    if (!SERP_API_KEY) {
      throw new Error("Missing SERP API credentials");
    }

    const searchUrl = new URL("https://serpapi.com/search.json");
    searchUrl.searchParams.append("api_key", SERP_API_KEY);
    searchUrl.searchParams.append("q", keyword);
    searchUrl.searchParams.append("num", quantity.toString());
    searchUrl.searchParams.append("gl", "br");
    searchUrl.searchParams.append("hl", "pt-br");
    searchUrl.searchParams.append("google_domain", "google.com.br");
    
    const debugUrl = new URL(searchUrl.toString());
    debugUrl.searchParams.delete("api_key");
    console.log(`Search URL (without api_key): ${debugUrl.toString()}`);
    
    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("SERP API error response:", errorText);
      
      let errorMessage = `SERP API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
        console.error("Parsed error:", errorData);
      } catch (e) {
        console.error("Could not parse error as JSON:", e);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    console.log(`API response received. Organic results: ${data.organic_results ? data.organic_results.length : 0}`);
    
    if (!data.organic_results || data.organic_results.length === 0) {
      console.log("No organic results found in response");
      return new Response(JSON.stringify({ 
        results: [],
        metadata: {
          requested: quantity,
          received: 0,
          message: "Nenhum resultado encontrado para esta consulta"
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const receivedResults = data.organic_results.length;
    const results = data.organic_results.slice(0, quantity).map((item, index) => ({
      ranking: index + 1,
      title: item.title,
      url: item.link,
      snippet: item.snippet || "Sem descrição disponível"
    }));
    
    const returnedResults = results.length;
    
    console.log(`Mapped ${returnedResults} results for "${keyword}" (API returned: ${receivedResults})`);
    
    let message = returnedResults < quantity
      ? `Foram solicitados ${quantity} resultados, mas a API do Google retornou apenas ${receivedResults} resultados disponíveis para esta consulta.`
      : `${returnedResults} resultados encontrados conforme solicitado`;
    
    return new Response(JSON.stringify({
      results: results,
      metadata: {
        requested: quantity,
        received: receivedResults,
        returned: returnedResults,
        message: message
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in google-search function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        metadata: {
          message: "Ocorreu um erro na busca"
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});