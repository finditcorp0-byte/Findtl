"use client";

import { useState } from "react";
import { ClaimModal } from "@/components/ClaimModal/ClaimModal";

interface ClaimModalTriggerProps {
  objectId: string;
  objectKind: "perdido" | "encontrado";
}

export function ClaimModalTrigger({
  objectId,
  objectKind,
}: ClaimModalTriggerProps) {
  const [showClaimModal, setShowClaimModal] = useState(false);

  const isFound = objectKind === "encontrado";

  return (
    <>
      <button
        type="button"
        onClick={() => setShowClaimModal(true)}
        className="btn btn-primary w-full sm:w-auto"
      >
        {isFound ? "Iniciar recuperación" : "Reportar coincidencia"}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4" />
        </svg>
      </button>

      <ClaimModal
        objectId={objectId}
        objectKind={objectKind}
        open={showClaimModal}
        onClose={() => setShowClaimModal(false)}
      />
    </>
  );
}