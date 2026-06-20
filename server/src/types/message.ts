export interface AdvisoryMessage {
  id: string;
  clientId: string;
  subject: string;
  body: string;
  tone: "data-driven" | "values-led" | "balanced";
  toneInfluences: { dnaValue: string; effect: string }[];
  referencedAlert?: string;
  proposedAction?: string;
  reasoning: string;
  confidence: number;
  status: "draft" | "approved" | "rejected";
  rmNotes?: string;
  disclaimer: string;
  genericAdvisory?: string;
}
