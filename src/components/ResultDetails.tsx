
import React from "react";
import { DiscernResult, discernCriteria } from "@/lib/discern-criteria";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

interface ResultDetailsProps {
  result: DiscernResult;
}

const ResultDetails: React.FC<ResultDetailsProps> = ({ result }) => {
  // Group criteria by category
  const categorizedScores = {
    reliability: result.scores.filter(score => {
      const criteria = discernCriteria.find(c => c.id === score.criteriaId);
      return criteria?.category === 'reliability';
    }),
    quality: result.scores.filter(score => {
      const criteria = discernCriteria.find(c => c.id === score.criteriaId);
      return criteria?.category === 'quality';
    }),
    treatment: result.scores.filter(score => {
      const criteria = discernCriteria.find(c => c.id === score.criteriaId);
      return criteria?.category === 'treatment';
    }),
  };

  return (
    <div className="space-y-6">
      {result.observations && (
        <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Observações</h4>
          <p className="text-sm text-blue-800">{result.observations}</p>
        </div>
      )}

      <Accordion type="single" collapsible defaultValue="reliability" className="w-full">
        <AccordionItem value="reliability">
          <AccordionTrigger className="text-lg font-medium">
            Critérios de Confiabilidade
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {categorizedScores.reliability.map((score) => {
                const criteria = discernCriteria.find(c => c.id === score.criteriaId);
                return (
                  <ScoreItem 
                    key={score.criteriaId}
                    criteria={criteria?.question || ''}
                    description={criteria?.description || ''}
                    score={score.score}
                    justification={score.justification}
                  />
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="quality">
          <AccordionTrigger className="text-lg font-medium">
            Critérios de Qualidade da Informação
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {categorizedScores.quality.map((score) => {
                const criteria = discernCriteria.find(c => c.id === score.criteriaId);
                return (
                  <ScoreItem 
                    key={score.criteriaId}
                    criteria={criteria?.question || ''}
                    description={criteria?.description || ''}
                    score={score.score}
                    justification={score.justification}
                  />
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="treatment">
          <AccordionTrigger className="text-lg font-medium">
            Critérios de Informação sobre Tratamentos
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {categorizedScores.treatment.map((score) => {
                const criteria = discernCriteria.find(c => c.id === score.criteriaId);
                return (
                  <ScoreItem 
                    key={score.criteriaId}
                    criteria={criteria?.question || ''}
                    description={criteria?.description || ''}
                    score={score.score}
                    justification={score.justification}
                  />
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

interface ScoreItemProps {
  criteria: string;
  description: string;
  score: number;
  justification: string;
}

const ScoreItem: React.FC<ScoreItemProps> = ({
  criteria,
  description,
  score,
  justification
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{criteria}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-medium">
          {score}
        </div>
      </div>
      <p className="text-sm italic">{justification}</p>
      <Separator className="mt-3" />
    </div>
  );
};

export default ResultDetails;
