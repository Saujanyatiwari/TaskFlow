export type FeatureName =
  | "boards"
  | "dnd"
  | "filters"
  | "analytics"
  | "export"
  | "aiFeatures";

export const featureMatrix = {
  free: {
    boards:     true,
    dnd:        true,
    filters:    true,
    analytics:  false,
    export:     false,
    aiFeatures: false,
  },
  pro: {
    boards:     true,
    dnd:        true,
    filters:    true,
    analytics:  true,
    export:     true,
    aiFeatures: false,
  },
  enterprise: {
    boards:     true,
    dnd:        true,
    filters:    true,
    analytics:  true,
    export:     true,
    aiFeatures: true,
  },
} as const satisfies Record<string, Record<FeatureName, boolean>>;

export const featureRequiredPlan: Record<FeatureName, "Free" | "Pro" | "Enterprise"> = {
  boards:     "Free",
  dnd:        "Free",
  filters:    "Free",
  analytics:  "Pro",
  export:     "Pro",
  aiFeatures: "Enterprise",
};

export const featureLabels: Record<FeatureName, string> = {
  boards:     "Boards",
  dnd:        "Drag & Drop",
  filters:    "Filters",
  analytics:  "Analytics",
  export:     "Export to CSV",
  aiFeatures: "AI Features",
};
