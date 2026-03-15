"use client";

import { getApiBaseUrl, getDataMode } from "@/lib/config";

export function WorkflowStatus() {
  const dataMode = getDataMode();
  const hasApi = Boolean(getApiBaseUrl());

  return (
    <div className="workflowStatus">
      <span className={`status ${dataMode === "remote" && hasApi ? "ready" : "review"}`}>
        {dataMode === "remote" && hasApi ? "Environment: live API" : "Environment: local sandbox"}
      </span>
      <span className={`status ${hasApi ? "accepted" : "review"}`}>
        {hasApi ? "Connectivity: online" : "Connectivity: API not configured"}
      </span>
      <span className="status open">Region: Margaret River, WA</span>
    </div>
  );
}
