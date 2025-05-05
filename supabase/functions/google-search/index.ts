
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
    
    console.log(`Searching with SERP API for "${keyword}" with quantity: ${quantity}`);
    
    if (!SERP_API_KEY) {
      throw new Error("Missing SERP API credentials");
    }

    // Setup the SERP API parameters
    const searchUrl = new URL("https://serpapi.com/search.json");
    searchUrl.searchParams.append("api_key", SERP_API_KEY);
    searchUrl.searchParams.append("q", keyword);
    searchUrl.searchParams.append("num", quantity.toString());
    
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
    
    console.log(`API response received. Organic results: ${data.organic_results ? data.organic_results.length : 0}`);
    console.log("Response structure keys:", Object.keys(data));
    
    if (!data.organic_results || data.organic_results.length === 0) {
      console.log("No organic results found in response");
      // Log first few keys of the response to debug
      console.log("Response data sample:", JSON.stringify(data).substring(0, 500));
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Map the SERP API results to our app's format
    const results = data.organic_results.slice(0, quantity).map((item, index) => ({
      ranking: index + 1,
      title: item.title,
      url: item.link,
      snippet: item.snippet || "Sem descrição disponível"
    }));
    
    console.log(`Mapped ${results.length} results for "${keyword}"`);
    
    return new Response(JSON.stringify(results), {
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
