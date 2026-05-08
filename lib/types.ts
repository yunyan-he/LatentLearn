export interface Section {
  id: string;
  title: string;
  level: number;
  content: string;
}

export type LearningDocument =
  | {
      type: "file";
      title: string;
      content: string;
      structure: Section[];
    }
  | {
      type: "topic";
      title: string;
      content: string;
      structure: Section[];
    };

export interface BubbleNode {
  id: string;
  parentId: string | null;
  batchId?: string;
  anchorText?: string;
  anchorSource?: string;
  userQuery: string;
  aiResponse: string;
  isOffTopic: boolean;
  offTopicHint?: string;
  resolved: boolean;
  createdAt: Date;
  children: string[];
}

export interface DecomposedQuestion {
  id: string;
  query: string;
  anchor: string | null;
  reason?: string;
  order?: number;
  mountNodeId?: string;
  mountStrategy?: string;
  mountReason?: string;
  selected: boolean;
}

export interface QuestionPlan {
  summary: string;
  questions: DecomposedQuestion[];
}

export interface QuoteRef {
  nodeId: string;
  text: string;
}

export type AnswerState =
  | { status: "idle" }
  | { status: "streaming"; nodeId?: string; label: string }
  | { status: "decomposing" };

export interface TreeMountDecision {
  questionId: string;
  parentId: string;
  strategy: string;
  reason: string;
}

export interface TreeMountPlan {
  mounts: TreeMountDecision[];
}
