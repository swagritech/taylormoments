"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  loadExplorePreferences,
  saveExplorePreferences,
  type ExplorePreferences,
  type ExploreTripLength,
  type ExploreYesNo,
} from "@/lib/explore-preferences";

function toIsoDate(dayOffset = 1) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function groupErrorMessage(groupSize: number) {
  if (groupSize <= 0) {
    return "Your group needs at least one person.";
  }
  if (groupSize > 20) {
    return "For groups larger than 20, please get in touch — we'll arrange something special.";
  }
  return null;
}

export default function Home() {
  const router = useRouter();
  const initialPreferences = useMemo(() => loadExplorePreferences(), []);
  const [visitDate, setVisitDate] = useState(initialPreferences?.previewDate ?? "");
  const [groupSize, setGroupSize] = useState(initialPreferences?.groupSize ?? 4);
  const [tripLength, setTripLength] = useState<ExploreTripLength>(initialPreferences?.tripLength ?? "full-day");
  const [needTransport, setNeedTransport] = useState<ExploreYesNo>(initialPreferences?.needTransport ?? "yes");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const todayIso = toIsoDate(0);
  const noDateError = submitAttempted && !visitDate
    ? "Please choose your travel dates to continue."
    : null;
  const pastDateError = submitAttempted && visitDate && visitDate < todayIso
    ? "Those dates have passed — please pick an upcoming trip."
    : null;
  const groupError = submitAttempted ? groupErrorMessage(groupSize) : null;

  function handleGroupStep(delta: number) {
    setGroupSize((current) => Math.max(0, current + delta));
  }

  function handleBegin() {
    setSubmitAttempted(true);
    if (noDateError || pastDateError || groupError) {
      return;
    }

    const current = loadExplorePreferences();
    const next: ExplorePreferences = {
      name: current?.name ?? "",
      email: current?.email ?? "",
      includeLunch: current?.includeLunch ?? "yes",
      prefOrganic: current?.prefOrganic ?? false,
      prefSpecialExperience: current?.prefSpecialExperience ?? false,
      prefCheeseBoard: current?.prefCheeseBoard ?? false,
      vibe: current?.vibe ?? "",
      matchedWineryIds: current?.matchedWineryIds ?? [],
      previewDate: visitDate,
      groupSize,
      tripLength,
      needTransport,
    };
    saveExplorePreferences(next);
    router.push("/explore");
  }

  return (
    <AppShell
      eyebrow="Explore"
      title="Plan your Margaret River day, your way"
      intro="Tell us a little about your trip and we'll find the perfect experiences for you."
      navMode="public"
      showWorkflowStatus={false}
    >
      <div className="actionPageShell">
        <section className="sectionCard">
          <div className="formPreview">
            <div className="field">
              <label htmlFor="visitDate">When are you visiting?</label>
              <input
                id="visitDate"
                type="date"
                className="inputLike inputField"
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                min={todayIso}
                placeholder="Choose your travel dates"
              />
              {noDateError ? <p className="subtle" style={{ color: "#8f3a2b" }}>{noDateError}</p> : null}
              {pastDateError ? <p className="subtle" style={{ color: "#8f3a2b" }}>{pastDateError}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="groupSize">How many in your group?</label>
              <div className="ctaRow" style={{ alignItems: "center" }}>
                <button type="button" className="buttonGhost" onClick={() => handleGroupStep(-1)} aria-label="Decrease group size">-</button>
                <input
                  id="groupSize"
                  type="number"
                  min={0}
                  max={30}
                  className="inputLike inputField"
                  style={{ maxWidth: 120 }}
                  value={groupSize}
                  onChange={(event) => setGroupSize(Number(event.target.value) || 0)}
                />
                <button type="button" className="buttonGhost" onClick={() => handleGroupStep(1)} aria-label="Increase group size">+</button>
              </div>
              <p className="subtle">Including yourself</p>
              {groupError ? (
                <p className="subtle" style={{ color: "#8f3a2b" }}>
                  {groupSize > 20 ? (
                    <>
                      For groups larger than 20, please{" "}
                      <Link href="mailto:sean@swagritech.com.au" style={{ textDecoration: "underline" }}>get in touch</Link>
                      {" "}— we'll arrange something special.
                    </>
                  ) : groupError}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label>How long would you like your winery day?</label>
              <div className="choiceRow profileChoiceGrid">
                <label className="choicePill">
                  <input type="radio" checked={tripLength === "half-day"} onChange={() => setTripLength("half-day")} />
                  Half day - Around 3-4 hours
                </label>
                <label className="choicePill">
                  <input type="radio" checked={tripLength === "full-day"} onChange={() => setTripLength("full-day")} />
                  Full day - Around 6-8 hours
                </label>
                <label className="choicePill">
                  <input type="radio" checked={tripLength === "multi-day"} onChange={() => setTripLength("multi-day")} />
                  More than one day - We'll build a multi-day itinerary
                </label>
              </div>
            </div>

            <div className="field">
              <label>Will you need transport?</label>
              <div className="choiceRow">
                <label className="choicePill">
                  <input type="radio" checked={needTransport === "yes"} onChange={() => setNeedTransport("yes")} />
                  Yes
                </label>
                <label className="choicePill">
                  <input type="radio" checked={needTransport === "no"} onChange={() => setNeedTransport("no")} />
                  No
                </label>
              </div>
              <p className="subtle">
                {needTransport === "yes"
                  ? "We'll match you with a luxury private vehicle for the day."
                  : "You're arranging your own way there - no problem."}
              </p>
            </div>

            <button type="button" className="buttonPrimary fullWidthButton" onClick={handleBegin}>
              Let's begin
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
