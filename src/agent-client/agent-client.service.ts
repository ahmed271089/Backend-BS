import { Injectable, Logger } from '@nestjs/common';

export interface AgentAnalysisResult {
  diagnosis: string;
  suggestedSolutions: string[];
  confidenceScore: number;
  raw?: unknown;
}

export interface AgentModerationResult {
  action: 'DISMISSED' | 'ACTION_TAKEN' | 'PENDING';
  confidenceScore: number;
  explanation: string;
}

/**
 * Thin client around the separate `agent-ai` service (Google ADK).
 * Called asynchronously after a PROBLEM post + attachments are saved.
 * Replace the fetch below with the real agent-ai endpoint once it's deployed.
 */
@Injectable()
export class AgentClientService {
  private readonly logger = new Logger(AgentClientService.name);
  private readonly baseUrl = (process.env.AGENT_AI_BASE_URL || '').replace('localhost:8001', '127.0.0.1:8002').replace('localhost:8002', '127.0.0.1:8002');
  private readonly apiKey = process.env.AGENT_AI_API_KEY;

  async analyzeProblem(params: {
    postId: string;
    title: string;
    description: string;
    categorySlug: string;
    attachmentUrls: string[];
  }): Promise<AgentAnalysisResult> {
    try {
      const res = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error(`Agent AI responded with status ${res.status}`);
      }

      const data = (await res.json()) as {
        diagnosis?: string;
        suggestedSolutions?: string[];
        confidenceScore?: number;
      };
      return {
        diagnosis: data.diagnosis,
        suggestedSolutions: data.suggestedSolutions ?? [],
        confidenceScore: data.confidenceScore ?? 0,
        raw: data,
      };
    } catch (err) {
      this.logger.error(`Agent AI analysis failed for post ${params.postId}`, err as Error);
      // Fail soft: the post still exists, AI comment is just skipped/retried later via queue.
      return {
        diagnosis: 'AI analysis is temporarily unavailable. The community will help shortly.',
        suggestedSolutions: [],
        confidenceScore: 0,
      };
    }
  }

  async moderateReport(params: {
    reportId: string;
    targetType: string;
    targetId: string;
    reason: string;
    details?: string | null;
  }): Promise<AgentModerationResult> {
    try {
      const res = await fetch(`${this.baseUrl}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error(`Agent AI responded with status ${res.status}`);
      }

      return (await res.json()) as AgentModerationResult;
    } catch (err) {
      this.logger.error(`Agent AI moderation failed for report ${params.reportId}`, err as Error);
      return {
        action: 'PENDING',
        confidenceScore: 0,
        explanation: 'AI moderation unavailable.',
      };
    }
  }
}
