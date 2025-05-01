
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DiscernResult, exportResults } from "@/lib/search-service";

interface ExportButtonProps {
  results: DiscernResult[];
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ results, disabled = false }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'sheet' | 'doc') => {
    if (results.length === 0) {
      toast({
        title: "Sem resultados",
        description: "Não há resultados para exportar.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportResults(results);
      
      toast({
        title: "Exportação concluída",
        description: format === 'sheet' 
          ? "Os resultados foram exportados para Google Sheets com sucesso." 
          : "O relatório foi gerado no Google Docs com sucesso.",
        duration: 5000
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os resultados.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={disabled || isExporting || results.length === 0}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar ({results.length})
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('sheet')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar para Google Sheets
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('doc')}>
          <FileText className="h-4 w-4 mr-2" />
          Gerar relatório no Google Docs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
