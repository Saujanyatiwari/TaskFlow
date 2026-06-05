"use client";

import { usePlanLimits } from "./usePlanLimits";
import { featureMatrix, FeatureName } from "../config/featureMatrix";

export function useFeatureAccess() {
  const { plan } = usePlanLimits(0);

  function hasFeature(feature: FeatureName): boolean {
    return featureMatrix[plan][feature];
  }

  function isAllowed(feature: FeatureName): boolean {
    return hasFeature(feature);
  }

  return { hasFeature, isAllowed, plan };
}
