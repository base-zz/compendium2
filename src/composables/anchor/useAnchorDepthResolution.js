export function useAnchorDepthResolution() {
  const normalizeDepthDatum = (depthCandidate) => {
    if (!depthCandidate || typeof depthCandidate !== "object") {
      return null;
    }

    if (typeof depthCandidate.units === "string" && "value" in depthCandidate) {
      return depthCandidate;
    }

    const belowTransducer = depthCandidate.belowTransducer;
    if (!belowTransducer || typeof belowTransducer !== "object") {
      return null;
    }

    if (typeof belowTransducer.units === "string" && "value" in belowTransducer) {
      return belowTransducer;
    }

    return null;
  };

  const resolveAnchorDropDepth = ({
    customDepthValue,
    preferredUnits,
    existingDropDepth,
    existingDepthSource,
    navigationDepth,
  }) => {
    const hasUserDepth = customDepthValue != null;
    if (hasUserDepth) {
      return {
        resolvedDropDepth: {
          value: customDepthValue,
          units: preferredUnits,
        },
        resolvedDepthSource: "user_entered",
      };
    }

    if (existingDropDepth) {
      const normalizedExistingDepth = normalizeDepthDatum(existingDropDepth);
      const normalizedNavigationDepth = normalizeDepthDatum(navigationDepth);

      let resolvedDropDepth = null;
      if (normalizedExistingDepth?.value != null) {
        resolvedDropDepth = normalizedExistingDepth;
      } else if (normalizedNavigationDepth?.value != null) {
        resolvedDropDepth = normalizedNavigationDepth;
      } else {
        resolvedDropDepth = normalizedExistingDepth || normalizedNavigationDepth;
      }

      return {
        resolvedDropDepth,
        resolvedDepthSource:
          typeof existingDepthSource === "string" ? existingDepthSource : "assumed_from_boat",
      };
    }

    if (navigationDepth) {
      return {
        resolvedDropDepth: normalizeDepthDatum(navigationDepth),
        resolvedDepthSource: "assumed_from_boat",
      };
    }

    return {
      resolvedDropDepth: null,
      resolvedDepthSource: null,
    };
  };

  return {
    normalizeDepthDatum,
    resolveAnchorDropDepth,
  };
}
