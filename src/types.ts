export interface BISStandard {
  id: string;
  title: string;
  category: string;
  description: string;
}

export interface Recommendation {
  id: string; // The IS code
  rationale: string;
  relevanceScore?: number;
}

export interface ProcessingMetadata {
  latencyMs: number;
  tokensUsed?: number;
  timestamp: string;
}

export interface PipelineResult {
  query: string;
  recommendations: Recommendation[];
  metadata: ProcessingMetadata;
}
