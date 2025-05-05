
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Use the SERP API key
const SERP_API_KEY = Deno.env.get("SERP_API_KEY");

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
    
    // Ajuste: Solicitamos quantidade+1 para compensar a discrepância da API
    const adjustedQuantity = quantity + 1;
    
    console.log(`Searching with SERP API for "${keyword}" with quantity: ${quantity} (adjusted to ${adjustedQuantity})`);
    
    if (!SERP_API_KEY) {
      throw new Error("Missing SERP API credentials");
    }

    // Setup the SERP API parameters with quantidade ajustada
    const searchUrl = new URL("https://serpapi.com/search.json");
    searchUrl.searchParams.append("api_key", SERP_API_KEY);
    searchUrl.searchParams.append("q", keyword);
    searchUrl.searchParams.append("num", adjustedQuantity.toString());
    
    // Configure for Brazilian Google in Portuguese
    searchUrl.searchParams.append("gl", "br"); // Geolocation: Brazil
    searchUrl.searchParams.append("hl", "pt-br"); // Language: Portuguese (Brazil)
    searchUrl.searchParams.append("google_domain", "google.com.br"); // Google domain for Brazil
    
    // Log the URL (without API key) for debugging
    const debugUrl = new URL(searchUrl.toString());
    debugUrl.searchParams.delete("api_key");
    console.log(`Search URL (without api_key): ${debugUrl.toString()}`);
    
    // Make the request to SERP API
    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("SERP API error response:", errorText);
      
      let errorMessage = `SERP API error: ${response.status} ${response.statusText}`;
      try {
        // Try to parse as JSON if possible
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
        console.error("Parsed error:", errorData);
      } catch (e) {
        console.error("Could not parse error as JSON:", e);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Log detailed information about the response
    console.log(`API response received. Organic results: ${data.organic_results ? data.organic_results.length : 0}`);
    console.log("Response structure keys:", Object.keys(data));
    console.log(`Requested: ${quantity} results (adjusted to ${adjustedQuantity}), Received: ${data.organic_results ? data.organic_results.length : 0} results`);
    
    if (!data.organic_results || data.organic_results.length === 0) {
      console.log("No organic results found in response");
      // Log first few keys of the response to debug
      console.log("Response data sample:", JSON.stringify(data).substring(0, 500));
      return new Response(JSON.stringify({ 
        results: [],
        metadata: {
          requested: quantity,
          adjusted: adjustedQuantity,
          received: 0,
          message: "No results found for this query"
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Mapear resultados, mas garantir que não exceda a quantidade originalmente solicitada
    // pelo usuário, mesmo que a API retorne mais (devido ao ajuste)
    const results = data.organic_results.slice(0, quantity).map((item, index) => ({
      ranking: index + 1,
      title: item.title,
      url: item.link,
      snippet: item.snippet || "Sem descrição disponível"
    }));
    
    const receivedResults = data.organic_results.length;
    const returnedResults = results.length;
    
    console.log(`Mapped ${returnedResults} results for "${keyword}" (adjusted request: ${adjustedQuantity}, API returned: ${receivedResults})`);
    
    // Atualização do metadata para incluir a quantidade ajustada
    return new Response(JSON.stringify({
      results: results,
      metadata: {
        requested: quantity,
        adjusted: adjustedQuantity,
        received: receivedResults,
        returned: returnedResults,
        message: returnedResults < quantity ? 
          `Solicitados ${quantity} resultados (ajustado para ${adjustedQuantity}), mas mesmo assim a API retornou apenas ${receivedResults}` : 
          `${returnedResults} resultados encontrados conforme solicitado`
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
