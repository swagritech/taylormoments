"use client";

import { getApiBaseUrl, getDataMode } from "@/lib/config";

export function WorkflowStatus() {
  const dataMode = getDataMode();
  const hasApi = Boolean(getApiBaseUrl());

  return (
    <div className="workflowStatus">
      <span className={`status ${dataMode === "remote" && hasApi ? "ready" : "review"}`}>
        {dataMode === "remote" && hasApi ? "Live Tailor Moments API" : "Local planning sandbox"}
      </span>
      <span className={`status ${hasApi ? "accepted" : "review"}`}>
        {hasApi ? "Remote booking flow available" : "API not connected"}
      </span>
      <span className="status open">Margaret River, Western Australia</span>
    </div>
  );
}
