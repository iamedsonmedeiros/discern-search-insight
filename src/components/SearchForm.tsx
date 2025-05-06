
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";

interface SearchFormProps {
  onSearch: (keyword: string, quantity: number) => void;
  isLoading: boolean;
  progressStage?: string;
  progressPercent?: number;
}

const SearchForm = ({ 
  onSearch, 
  isLoading, 
  progressStage = "", 
  progressPercent = 0 
}: SearchFormProps) => {
  const [keyword, setKeyword] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(10);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword.trim()) {
      toast({
        title: "Palavra-chave obrigatória",
        description: "Por favor, insira uma palavra-chave para pesquisar.",
        variant: "destructive"
      });
      return;
    }
    
    onSearch(keyword, quantity);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="keyword" className="text-lg font-medium">
          Palavra-chave
        </Label>
        <Input
          id="keyword"
          placeholder="Ex: diabetes, hipertensão, tratamento de câncer..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="h-12 text-lg"
          disabled={isLoading}
        />
      </div>
      
      <div>
        <Label htmlFor="quantity" className="text-lg font-medium">
          Quantidade de resultados
        </Label>
        <Select 
          disabled={isLoading}
          value={quantity.toString()}
          onValueChange={(value) => setQuantity(Number(value))}
        >
          <SelectTrigger id="quantity" className="h-12 text-lg mt-2">
            <SelectValue placeholder="Selecione a quantidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 resultados</SelectItem>
            <SelectItem value="20">20 resultados</SelectItem>
            <SelectItem value="50">50 resultados</SelectItem>
            <SelectItem value="100">100 resultados</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isLoading && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{progressStage || "Pesquisando..."}</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}
      
      <Button 
        type="submit" 
        className="w-full h-12 text-lg font-medium bg-gradient-to-r from-discern-primary to-discern-secondary hover:opacity-90 transition-opacity"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
            Processando...
          </>
        ) : (
          <>
            <Search className="mr-2 h-5 w-5" /> 
            Pesquisar e Analisar
          </>
        )}
      </Button>
    </form>
  );
};

export default SearchForm;
