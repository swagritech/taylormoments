"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { wineryCatalog, wineryRegions } from "@/lib/winery-catalog";

type CustomerWineryCatalogProps = {
  selectedWineries: string[];
  onToggleWinery: (wineryId: string) => void;
  onContinue: () => void;
};

type SortMode = "top-rated" | "most-selected" | "established";

function mapEmbedUrl(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function CustomerWineryCatalog({
  selectedWineries,
  onToggleWinery,
  onContinue,
}: CustomerWineryCatalogProps) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All regions");
  const [organicOnly, setOrganicOnly] = useState(false);
  const [cellarDoorOnly, setCellarDoorOnly] = useState(false);
  const [liveBookableOnly, setLiveBookableOnly] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("top-rated");
  const [activeWineryId, setActiveWineryId] = useState<string | null>(selectedWineries[0] ?? null);

  const filtered = useMemo(() => {
    const loweredSearch = search.trim().toLowerCase();
    const rows = wineryCatalog.filter((winery) => {
      if (region !== "All regions" && winery.region !== region) {
        return false;
      }

      if (organicOnly && !winery.organicStatus.toLowerCase().includes("organic")) {
        return false;
      }

      if (cellarDoorOnly && !winery.cellarDoor) {
        return false;
      }

      if (liveBookableOnly && !winery.liveBookable) {
        return false;
      }

      if (!loweredSearch) {
        return true;
      }

      const haystack = `${winery.name} ${winery.address} ${winery.knownFor} ${winery.experiences}`.toLowerCase();
      return haystack.includes(loweredSearch);
    });

    if (sortMode === "most-selected") {
      return rows.sort((a, b) => b.selectedByCount - a.selectedByCount);
    }

    if (sortMode === "established") {
      return rows.sort((a, b) => a.established - b.established);
    }

    return rows.sort((a, b) => b.rating - a.rating);
  }, [cellarDoorOnly, liveBookableOnly, organicOnly, region, search, sortMode]);

  const activeWinery =
    filtered.find((winery) => winery.id === activeWineryId) ??
    filtered[0] ??
    wineryCatalog.find((winery) => winery.id === selectedWineries[0]) ??
    wineryCatalog[0];

  return (
    <SectionCard
      title="Choose preferred wineries"
      description="Filter the Margaret River catalog, review each winery profile, and add options to your schedule cart."
    >
      <div className="catalogFilters">
        <input
          className="inputLike inputField"
          placeholder="Search winery, address, wine style, or experience"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="inputLike inputField" value={region} onChange={(event) => setRegion(event.target.value)}>
          <option>All regions</option>
          {wineryRegions.map((entry) => (
            <option key={entry}>{entry}</option>
          ))}
        </select>
        <select
          className="inputLike inputField"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
        >
          <option value="top-rated">Top rated</option>
          <option value="most-selected">Most selected</option>
          <option value="established">Oldest estates first</option>
        </select>
        <button
          type="button"
          className={`buttonGhost chipToggle ${organicOnly ? "active" : ""}`}
          onClick={() => setOrganicOnly((current) => !current)}
        >
          Organic only
        </button>
        <button
          type="button"
          className={`buttonGhost chipToggle ${cellarDoorOnly ? "active" : ""}`}
          onClick={() => setCellarDoorOnly((current) => !current)}
        >
          Cellar door
        </button>
        <button
          type="button"
          className={`buttonGhost chipToggle ${liveBookableOnly ? "active" : ""}`}
          onClick={() => setLiveBookableOnly((current) => !current)}
        >
          Live-bookable now
        </button>
      </div>

      <div className="catalogShell">
        <div className="catalogList" role="list">
          {filtered.map((winery) => {
            const selected = selectedWineries.includes(winery.id);
            const initials = winery.name
              .split(" ")
              .slice(0, 2)
              .map((entry) => entry[0])
              .join("");

            return (
              <article
                key={winery.id}
                role="listitem"
                className={`catalogRow ${activeWinery?.id === winery.id ? "active" : ""}`}
                onMouseEnter={() => setActiveWineryId(winery.id)}
              >
                <div className="catalogMedia">
                  <div className="catalogImage" aria-hidden="true">
                    <span>{initials}</span>
                  </div>
                  <div className="catalogMeta">
                    <h3>{winery.name}</h3>
                    <p className="subtle">{winery.address}</p>
                    <p className="ratingLine">
                      {winery.rating} stars · {winery.selectedByCount} guests shortlisted
                    </p>
                    <p className="subtle">Organic: {winery.organicStatus}</p>
                    <div className="metaRow">
                      <span className={`status ${winery.liveBookable ? "accepted" : "review"}`}>
                        {winery.liveBookable ? "Live booking available" : "Prospect list"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="buttonPrimary"
                      onClick={() => onToggleWinery(winery.id)}
                      disabled={!winery.liveBookable}
                    >
                      {selected ? "Added to schedule" : winery.liveBookable ? "Add to schedule" : "Not live yet"}
                    </button>
                  </div>
                </div>
                <div className="catalogSummary">
                  <p>{winery.summary}</p>
                  <div className="catalogBullets">
                    <p>
                      <strong>Experiences:</strong> {winery.experiences}
                    </p>
                    <p>
                      <strong>Known for:</strong> {winery.knownFor}
                    </p>
                    <p>
                      <strong>Established:</strong> {winery.established}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="catalogMap">
          <h3>{activeWinery?.name ?? "Margaret River"}</h3>
          <p className="subtle">{activeWinery?.address ?? "Margaret River, Western Australia"}</p>
          <iframe
            title="Selected winery map"
            src={mapEmbedUrl(activeWinery?.mapQuery ?? "Margaret River, Western Australia")}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="cartSummary">
            <p className="miniLabel">Schedule cart</p>
            <p>{selectedWineries.length} winery options selected</p>
            <button
              type="button"
              className="buttonPrimary fullWidthButton"
              onClick={onContinue}
              disabled={selectedWineries.length === 0}
            >
              Continue to scheduling
            </button>
          </div>
        </aside>
      </div>
    </SectionCard>
  );
}

