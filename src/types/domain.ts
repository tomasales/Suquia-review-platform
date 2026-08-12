export type DeliveryStatus =
  | "Enviado para revisar"
  | "En revisión"
  | "Requiere cambios"
  | "Aprobada"
  | "Cerrada";

export type DeliveryType = "Stories" | "Feed";

export type DeliverySummary = {
  id: string;
  title: string;
  type: DeliveryType;
  date: string;
  author: string;
  pieces: number;
  status: DeliveryStatus;
  reviewSummary: string;
  lastActivity: string;
};

export type JournalEntry = {
  id: string;
  actor: string;
  action: string;
  time: string;
};

export type AiLearning = {
  id: string;
  category: string;
  recurrence: string;
  summary: string;
};
