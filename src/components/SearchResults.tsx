
import React, { useState } from "react";
import { DiscernResult, SearchResultItem } from "@/lib/search-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getQualityColor } from "@/lib/discern-criteria";
import DiscernScore from "./DiscernScore";
import ResultDetails from "./ResultDetails";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface SearchResultsProps {
  searchResults: SearchResultItem[];
  discernResults: DiscernResult[];
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  discernResults,
}) => {
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const toggleExpand = (url: string) => {
    setExpandedResult(expandedResult === url ? null : url);
  };

  if (searchResults.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl animate-fade-in">
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="results">
            Resultados ({searchResults.length})
          </TabsTrigger>
          <TabsTrigger value="analyzed">
            Analisados ({discernResults.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="results" className="space-y-4">
          {searchResults.map((result) => {
            const discernResult = discernResults.find(
              (d) => d.url === result.url
            );
            const isExpanded = expandedResult === result.url;
            
            return (
              <Card key={result.url} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between gap-2">
                    <CardTitle className="text-xl line-clamp-2">
                      <span className="mr-2 text-sm px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                        {result.ranking}
                      </span>
                      {result.title}
                    </CardTitle>
                    
                    {discernResult && (
                      <Badge
                        className="whitespace-nowrap"
                        style={{ 
                          backgroundColor: `var(--${getQualityColor(discernResult.totalScore)})` 
                        }}
                      >
                        {discernResult.totalScore}/75
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center text-blue-600">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm truncate hover:underline"
                    >
                      {result.url}
                    </a>
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-3">
                  <p className="text-sm text-gray-600 line-clamp-2">{result.snippet}</p>
                  
                  {discernResult && (
                    <div className="mt-4">
                      {isExpanded ? (
                        <>
                          <DiscernScore result={discernResult} />
                          <div className="mt-6">
                            <ResultDetails result={discernResult} />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(result.url)}
                            className="mt-4 w-full text-muted-foreground"
                          >
                            <ChevronUp className="h-4 w-4 mr-1" /> Mostrar menos
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(result.url)}
                          className="mt-2 w-full"
                        >
                          <ChevronDown className="h-4 w-4 mr-1" /> Expandir análise DISCERN
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        
        <TabsContent value="analyzed" className="space-y-6">
          {discernResults.length > 0 ? (
            discernResults.map((result) => (
              <Card key={result.url} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle>{result.title}</CardTitle>
                    <Badge
                      style={{ 
                        backgroundColor: `var(--${getQualityColor(result.totalScore)})` 
                      }}
                    >
                      {result.totalScore}/75
                    </Badge>
                  </div>
                  <CardDescription>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {result.url}
                    </a>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DiscernScore result={result} />
                  <div className="mt-8">
                    <ResultDetails result={result} />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum resultado foi analisado ainda.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SearchResults;
