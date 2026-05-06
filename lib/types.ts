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
  selected: boolean;
}

export interface QuestionPlan {
  summary: string;
  questions: DecomposedQuestion[];
}

export type AnswerState =
  | { status: "idle" }
  | { status: "streaming"; nodeId?: string; label: string }
  | { status: "decomposing" };
