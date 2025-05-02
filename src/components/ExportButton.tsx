
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
      if (format === 'sheet') {
        // Criar cabeçalhos para o CSV
        const headers = [
          "URL", 
          "Título", 
          "Tipo", 
          "Pontuação Total",
          "Observações"
        ];
        
        // Adicionar cabeçalhos para cada critério (1-15)
        for (let i = 1; i <= 15; i++) {
          headers.push(`Critério ${i} Pontuação`);
          headers.push(`Critério ${i} Justificativa`);
        }
        
        // Criar linhas de dados
        const csvData = results.map(result => {
          const row = [
            result.url,
            result.title,
            result.type,
            result.totalScore.toString(),
            result.observations
          ];
          
          // Criar um mapa de scores para fácil acesso
          const scoresMap = {};
          result.scores.forEach(score => {
            scoresMap[score.criteriaId] = {
              score: score.score,
              justification: score.justification
            };
          });
          
          // Adicionar pontuações e justificativas para cada critério
          for (let i = 1; i <= 15; i++) {
            if (scoresMap[i]) {
              row.push(scoresMap[i].score.toString());
              row.push(scoresMap[i].justification);
            } else {
              row.push('');
              row.push('');
            }
          }
          
          return row;
        });
        
        // Converter para formato CSV
        let csvContent = headers.join(',') + '\n';
        csvData.forEach(row => {
          // Processar cada célula para lidar com vírgulas, aspas e quebras de linha
          const processedRow = row.map(cell => {
            // Se contém vírgulas, aspas ou quebras de linha, colocar entre aspas duplas
            if (cell && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
              return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
          });
          csvContent += processedRow.join(',') + '\n';
        });
        
        // Criar blob e link para download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        link.setAttribute('href', url);
        link.setAttribute('download', `discern_results_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      } else {
        // Criar o conteúdo do documento para o Google Docs
        let docContent = "# Relatório de Análise DISCERN\n\n";
        docContent += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
        docContent += `Total de sites analisados: ${results.length}\n\n`;

        // Adicionar cada resultado ao relatório
        results.forEach((result, index) => {
          docContent += `## ${index + 1}. ${result.title}\n`;
          docContent += `URL: ${result.url}\n`;
          docContent += `Tipo: ${result.type}\n`;
          docContent += `Pontuação Total: ${result.totalScore}/75\n\n`;
          
          if (result.observations) {
            docContent += `### Observações Gerais\n${result.observations}\n\n`;
          }
          
          docContent += "### Pontuações por Critério\n\n";
          
          // Organizar os critérios numericamente
          const sortedScores = [...result.scores].sort((a, b) => a.criteriaId - b.criteriaId);
          
          sortedScores.forEach(score => {
            docContent += `**Critério ${score.criteriaId}:** ${score.score}/5\n`;
            docContent += `Justificativa: ${score.justification}\n\n`;
          });
          
          docContent += "---\n\n";
        });

        // Criar um arquivo de texto para download
        const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        link.setAttribute('href', url);
        link.setAttribute('download', `discern_relatorio_${date}.txt`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      }
      
      toast({
        title: "Exportação concluída",
        description: format === 'sheet' 
          ? "Os resultados foram exportados para CSV. Você pode importá-lo no Google Sheets." 
          : "O relatório foi gerado em formato de texto. Você pode importá-lo no Google Docs.",
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
          Exportar para CSV (Google Sheets)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('doc')}>
          <FileText className="h-4 w-4 mr-2" />
          Gerar relatório em formato de texto (Google Docs)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
