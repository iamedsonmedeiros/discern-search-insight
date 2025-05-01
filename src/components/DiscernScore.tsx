
import React from "react";
import { Progress } from "@/components/ui/progress";
import { 
  DiscernResult, 
  getQualityLabel, 
  getQualityColor,
  getCategoryScore 
} from "@/lib/discern-criteria";

interface DiscernScoreProps {
  result: DiscernResult;
}

const DiscernScore: React.FC<DiscernScoreProps> = ({ result }) => {
  // Calculate percentage score (out of 75 max possible points)
  const percentScore = Math.round((result.totalScore / 75) * 100);
  
  // Calculate category scores
  const reliabilityScore = getCategoryScore(result.scores, 'reliability');
  const qualityScore = getCategoryScore(result.scores, 'quality');
  const treatmentScore = getCategoryScore(result.scores, 'treatment');
  
  // Get quality classification
  const qualityLabel = getQualityLabel(result.totalScore);
  const qualityColor = getQualityColor(result.totalScore);
  
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Pontuação DISCERN</p>
          <h3 className="text-2xl font-bold">{result.totalScore}<span className="text-lg text-muted-foreground">/75</span></h3>
        </div>
        
        <div className="rounded-full px-4 py-1 text-white font-medium" style={{
          backgroundColor: `var(--${qualityColor})` 
        }}>
          {qualityLabel}
        </div>
      </div>
      
      <div className="w-full">
        <Progress value={percentScore} className="h-2.5" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <ScoreCategory 
          label="Confiabilidade" 
          score={reliabilityScore} 
          description="Credibilidade da fonte e informações" 
        />
        <ScoreCategory 
          label="Qualidade" 
          score={qualityScore} 
          description="Qualidade da apresentação da informação" 
        />
        <ScoreCategory 
          label="Tratamento" 
          score={treatmentScore} 
          description="Detalhes sobre opções de tratamento" 
        />
      </div>
    </div>
  );
};

interface ScoreCategoryProps {
  label: string;
  score: number;
  description: string;
}

const ScoreCategory: React.FC<ScoreCategoryProps> = ({ label, score, description }) => {
  let color = "bg-discern-low";
  if (score >= 70) color = "bg-discern-high";
  else if (score >= 40) color = "bg-discern-medium";
  
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <p className="font-medium">{label}</p>
        <span className="text-sm">{score}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }}></div>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
};

export default DiscernScore;
