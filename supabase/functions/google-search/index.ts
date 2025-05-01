
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const GOOGLE_CSE_ID = Deno.env.get("GOOGLE_CSE_ID");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { keyword, quantity = 10 } = await req.json();
    
    console.log(`Searching Google for "${keyword}" with quantity: ${quantity}`);
    
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      throw new Error("Missing Google API credentials");
    }

    // A Google Custom Search API retorna no máximo 10 resultados por página
    // Se precisarmos de mais, precisamos fazer várias chamadas
    const maxResultsPerPage = 10;
    let allResults = [];
    
    // Calcular quantas páginas precisamos buscar
    const pagesToFetch = Math.ceil(quantity / maxResultsPerPage);
    
    // Buscar todas as páginas necessárias
    for (let page = 0; page < pagesToFetch; page++) {
      const startIndex = page * maxResultsPerPage + 1; // Google usa índice 1-based
      
      const searchUrl = new URL("https://www.googleapis.com/customsearch/v1");
      searchUrl.searchParams.append("key", GOOGLE_API_KEY);
      searchUrl.searchParams.append("cx", GOOGLE_CSE_ID);
      searchUrl.searchParams.append("q", keyword);
      searchUrl.searchParams.append("start", startIndex.toString());
      searchUrl.searchParams.append("num", Math.min(maxResultsPerPage, quantity - allResults.length).toString());
      
      console.log(`Fetching page ${page + 1} of ${pagesToFetch}, startIndex: ${startIndex}`);
      
      const response = await fetch(searchUrl.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Google API error:", errorData);
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items) {
        console.log("No results found for this page");
        break; // Não há mais resultados
      }
      
      // Mapear os resultados para o formato que nossa aplicação espera
      const pageResults = data.items.map((item, index) => ({
        ranking: startIndex + index,
        title: item.title,
        url: item.link,
        snippet: item.snippet || "Sem descrição disponível"
      }));
      
      allResults = [...allResults, ...pageResults];
      
      // Parar quando atingirmos a quantidade desejada
      if (allResults.length >= quantity) {
        allResults = allResults.slice(0, quantity);
        break;
      }
      
      // Respeitar os limites de taxa da API do Google
      if (page < pagesToFetch - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`Retrieved ${allResults.length} results for "${keyword}"`);
    
    return new Response(JSON.stringify(allResults), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in google-search function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
