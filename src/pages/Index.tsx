
import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import SearchResults from "@/components/SearchResults";
import ExportButton from "@/components/ExportButton";
import { 
  SearchResultItem, 
  DiscernResult,
  SearchMetadata,
  searchWithKeyword, 
  batchAnalyzeWithDiscern 
} from "@/lib/search-service";
import { useToast } from "@/components/ui/use-toast";
import { FileCheck, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Estágios do processo de busca e análise
const SEARCH_STAGES = {
  SEARCH: { name: "Buscando resultados...", percent: 20 },
  ANALYZE_START: { name: "Iniciando análise DISCERN...", percent: 40 },
  ANALYZE_PROGRESS: { name: "Analisando conteúdo...", percent: 60 },
  ANALYZE_COMPLETE: { name: "Finalizando análise...", percent: 80 },
  COMPLETE: { name: "Concluído!", percent: 100 }
};

const Index = () => {
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [discernResults, setDiscernResults] = useState<DiscernResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<SearchMetadata | null>(null);
  const [progressStage, setProgressStage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const { toast } = useToast();

  const updateProgress = (stage: keyof typeof SEARCH_STAGES) => {
    setProgressStage(SEARCH_STAGES[stage].name);
    setProgressPercent(SEARCH_STAGES[stage].percent);
  };

  const handleSearch = async (keyword: string, quantity: number) => {
    setIsSearching(true);
    setSearchResults([]);
    setDiscernResults([]);
    updateProgress("SEARCH");
    
    try {
      // Step 1: Perform search
      const results = await searchWithKeyword(keyword, quantity);
      setSearchResults(results);
      
      // Se houver metadados de busca disponíveis
      const metadata = results.length < quantity ? {
        requested: quantity,
        received: results.length,
        message: `A API retornou menos resultados (${results.length}) do que foi solicitado (${quantity})`
      } : null;
      
      setSearchMetadata(metadata);
      
      // Show toast for search completed
      toast({
        title: "Pesquisa concluída",
        description: `Encontrados ${results.length} resultados para "${keyword}"`,
      });
      
      // Step 2: Analyze with DISCERN (in batches if many results)
      updateProgress("ANALYZE_START");
      const urls = results.map(result => result.url);
      
      // Atualizar o progresso para simular o progresso da análise
      updateProgress("ANALYZE_PROGRESS");
      
      // For this demo we'll analyze all results at once
      // In a real implementation, you would process in batches
      const analyzed = await batchAnalyzeWithDiscern(urls);
      
      updateProgress("ANALYZE_COMPLETE");
      setDiscernResults(analyzed);
      
      // Show toast for analysis completed
      toast({
        title: "Análise DISCERN concluída",
        description: `${analyzed.length} resultados foram analisados com sucesso.`,
      });
      
      updateProgress("COMPLETE");
      
      // Pequeno atraso antes de remover a barra de progresso
      setTimeout(() => {
        setIsSearching(false);
        setProgressStage("");
        setProgressPercent(0);
      }, 500);
      
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Erro na pesquisa",
        description: "Ocorreu um erro ao processar sua pesquisa.",
        variant: "destructive",
      });
      setIsSearching(false);
      setProgressStage("");
      setProgressPercent(0);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-white to-blue-50">
      <header className="w-full py-12 px-4 text-center">
        <h1 className="text-5xl font-display font-bold mb-4 gradient-text">
          DISCERN Search Insight
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Avalie a qualidade de informações de saúde online com o método DISCERN
        </p>
      </header>

      <div className="container mx-auto px-4 pb-24 flex flex-col items-center gap-12">
        <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl p-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Como funciona:</p>
              <p>
                Insira uma palavra-chave relacionada à saúde e o número de resultados 
                desejados. O sistema pesquisará e analisará automaticamente os resultados
                com o método DISCERN para avaliar a qualidade das informações.
              </p>
            </div>
          </div>
          
          <SearchForm 
            onSearch={handleSearch} 
            isLoading={isSearching} 
            progressStage={progressStage}
            progressPercent={progressPercent}
          />
        </div>

        {searchResults.length > 0 && (
          <div className="w-full flex flex-col items-center gap-6 animate-slide-in">
            {searchMetadata && (
              <Alert className="w-full max-w-4xl bg-amber-50 border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <AlertDescription className="text-amber-700">
                  {searchMetadata.message}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex w-full max-w-4xl justify-between items-center px-4">
              <div className="flex items-center gap-2">
                <FileCheck className="text-discern-primary h-5 w-5" />
                <h2 className="text-xl font-medium">Resultados da Análise</h2>
              </div>
              <ExportButton
                results={discernResults}
                disabled={isSearching || discernResults.length === 0}
              />
            </div>
            
            <SearchResults
              searchResults={searchResults}
              discernResults={discernResults}
            />
          </div>
        )}
      </div>

      <footer className="w-full py-6 bg-discern-primary text-white text-center">
        <p className="text-sm">
          © 2023 DISCERN Search Insight - Ferramenta de Análise de Qualidade de Informações de Saúde
        </p>
      </footer>
    </div>
  );
};

export default Index;
