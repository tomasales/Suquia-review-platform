import type { AiLearning, DeliverySummary, JournalEntry } from "@/types/domain";

// Mock temporal de bootstrap: se reemplazará cuando llegue el módulo de DB.
export const deliveriesForReview: DeliverySummary[] = [
  {
    id: "delivery-01",
    title: "Stories · 12 Ago · 5 piezas",
    type: "Stories",
    date: "12 Ago",
    author: "Diseñadora",
    pieces: 5,
    status: "En revisión",
    reviewSummary: "5 piezas · 3 OK · 2 necesitan cambios",
    lastActivity: "Hace 12 min",
  },
  {
    id: "delivery-02",
    title: "Feed · 9 Ago · 4 piezas",
    type: "Feed",
    date: "9 Ago",
    author: "Diseñadora",
    pieces: 4,
    status: "Requiere cambios",
    reviewSummary: "4 piezas · 1 OK · 3 necesitan cambios",
    lastActivity: "Ayer",
  },
];

export const recentDeliveries: DeliverySummary[] = [
  {
    id: "delivery-03",
    title: "Stories · 7 Ago · 6 piezas",
    type: "Stories",
    date: "7 Ago",
    author: "Diseñadora",
    pieces: 6,
    status: "Aprobada",
    reviewSummary: "6 piezas · 6 OK · 0 necesitan cambios",
    lastActivity: "Lun 18:20",
  },
  {
    id: "delivery-04",
    title: "Feed · 5 Ago · 3 piezas",
    type: "Feed",
    date: "5 Ago",
    author: "Diseñadora",
    pieces: 3,
    status: "Cerrada",
    reviewSummary: "3 piezas · 3 OK · 0 necesitan cambios",
    lastActivity: "Vie 11:40",
  },
];

export const journalEvents: JournalEntry[] = [
  {
    id: "journal-01",
    actor: "Tomi",
    action: "Marcó Story 3 como Necesita cambios",
    time: "Hace 12 min",
  },
  {
    id: "journal-02",
    actor: "Diseñadora",
    action: "Subió V2 de Story 3",
    time: "Hace 4 min",
  },
  {
    id: "journal-03",
    actor: "Sistema",
    action: "Sincronización con Drive completada",
    time: "Hace 2 min",
  },
];

export const aiLearnings: AiLearning[] = [
  {
    id: "learning-01",
    category: "Composición",
    recurrence: "3 veces",
    summary: "Dar más aire entre bloques cuando conviven texto y foto.",
  },
  {
    id: "learning-02",
    category: "Stories",
    recurrence: "2 veces",
    summary: "Evitar centrar textos cuando la imagen ya tiene mucho peso.",
  },
];
