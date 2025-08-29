import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WORKFLOW_STAGES, getStageDefinition, determineCurrentStage, type WorkflowStage } from "../../../shared/workflow-stages";
import WorkflowStageOverride from "./workflow-stage-override";

interface WorkflowStageMeterProps {
  booking: any;
  className?: string;
}

export default function WorkflowStageMeter({ booking, className = "" }: WorkflowStageMeterProps) {
  // Determine current stage based on booking data
  const currentStage = booking.workflowStage || determineCurrentStage(booking);
  const currentStageIndex = WORKFLOW_STAGES.findIndex(stage => stage.id === currentStage);

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${className}`}>
        {WORKFLOW_STAGES.map((stage, index) => {
          const isActive = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;
          
          return (
            <Tooltip key={stage.id}>
              <TooltipTrigger asChild>
                <div 
                  className={`
                    relative h-6 w-5 rounded-sm border transition-all duration-300 cursor-help
                    ${isActive 
                      ? isCurrent
                        ? 'bg-blue-500 border-blue-600 shadow-lg shadow-blue-300' // Current stage - bright blue with glow
                        : 'bg-green-500 border-green-600' // Completed stages - green
                      : 'bg-gray-200 border-gray-300' // Future stages - gray
                    }
                  `}
                >
                  {/* LED-style inner glow for active stages */}
                  {isActive && (
                    <div 
                      className={`
                        absolute inset-0.5 rounded-sm 
                        ${isCurrent 
                          ? 'bg-blue-400 opacity-70' 
                          : 'bg-green-400 opacity-50'
                        }
                      `} 
                    />
                  )}
                  
                  {/* Stage icon overlay for current stage */}
                  {isCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold">
                        {stage.icon}
                      </span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-center">
                  <div className="font-medium flex items-center gap-1">
                    <span>{stage.icon}</span>
                    <span>{stage.label}</span>
                    {isCurrent && <span className="text-blue-400">●</span>}
                    {isActive && !isCurrent && <span className="text-green-400">✓</span>}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {stage.description}
                  </div>
                  {isCurrent && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      Current Stage
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {/* Stage label and override button */}
        <div className="ml-2 flex items-center gap-2">
          <span className="text-xs text-gray-600 font-medium">
            {getStageDefinition(currentStage)?.label || 'Initial'}
          </span>
          <WorkflowStageOverride booking={booking} />
        </div>
      </div>
    </TooltipProvider>
  );
}

// Compact version for smaller spaces
export function CompactWorkflowMeter({ booking, className = "" }: WorkflowStageMeterProps) {
  const currentStage = booking.workflowStage || determineCurrentStage(booking);
  const currentStageIndex = WORKFLOW_STAGES.findIndex(stage => stage.id === currentStage);
  const stageDefinition = getStageDefinition(currentStage);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${className}`}>
            {WORKFLOW_STAGES.map((stage, index) => {
              const isActive = index <= currentStageIndex;
              const isCurrent = index === currentStageIndex;
              
              return (
                <div 
                  key={stage.id}
                  className={`
                    h-2 w-2 rounded-full transition-all duration-300
                    ${isActive 
                      ? isCurrent
                        ? 'bg-blue-500 shadow-sm shadow-blue-300' 
                        : 'bg-green-500' 
                      : 'bg-gray-300'
                    }
                  `}
                />
              );
            })}
            <span className="ml-2 text-xs text-gray-600 font-medium">
              {stageDefinition?.icon} {stageDefinition?.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-center">
            <div className="font-medium">
              Workflow Progress: {Math.round(((currentStageIndex + 1) / WORKFLOW_STAGES.length) * 100)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {stageDefinition?.description}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}