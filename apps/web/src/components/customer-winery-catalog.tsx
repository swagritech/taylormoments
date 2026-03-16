"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { SelectedWineriesMap } from "@/components/selected-wineries-map";
import { experienceSummary, useRemoteWineryProfiles } from "@/lib/remote-winery-profiles";
import { wineryCatalog, wineryRegions } from "@/lib/winery-catalog";
import { slugToWineryUuid } from "@/lib/winery-id";

type CustomerWineryCatalogProps = {
  selectedWineries: string[];
  onToggleWinery: (wineryId: string) => void;
  onContinue: () => void;
  onClearCart: () => void;
};

type SortMode = "top-rated" | "most-selected" | "established";

export function CustomerWineryCatalog({
  selectedWineries,
  onToggleWinery,
  onContinue,
  onClearCart,
}: CustomerWineryCatalogProps) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All regions");
  const [organicOnly, setOrganicOnly] = useState(false);
  const [cellarDoorOnly, setCellarDoorOnly] = useState(false);
  const [liveBookableOnly, setLiveBookableOnly] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("top-rated");
  const { profilesById } = useRemoteWineryProfiles();

  const filtered = useMemo(() => {
    const loweredSearch = search.trim().toLowerCase();
    const rows = wineryCatalog.filter((winery) => {
      const remoteProfile = profilesById[slugToWineryUuid(winery.id)];
      const displayAddress = remoteProfile?.address ?? "";
      const searchableKnownFor = remoteProfile?.famous_for ?? "";
      const searchableExperiences = experienceSummary(remoteProfile, "");
      const searchableSummary = remoteProfile?.description ?? "";

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

      const haystack = `${winery.name} ${displayAddress} ${searchableKnownFor} ${searchableExperiences} ${searchableSummary}`.toLowerCase();
      return haystack.includes(loweredSearch);
    });

    if (sortMode === "most-selected") {
      return rows.sort((a, b) => b.selectedByCount - a.selectedByCount);
    }

    if (sortMode === "established") {
      return rows.sort((a, b) => a.established - b.established);
    }

    return rows.sort((a, b) => b.rating - a.rating);
  }, [cellarDoorOnly, liveBookableOnly, organicOnly, profilesById, region, search, sortMode]);

  const selectedWineryItems = useMemo(
    () =>
      selectedWineries
        .map((wineryId) => {
          const winery = wineryCatalog.find((entry) => entry.id === wineryId);
          if (!winery) {
            return null;
          }
          const remoteProfile = profilesById[slugToWineryUuid(winery.id)];
          return {
            ...winery,
            address: remoteProfile?.address ?? "",
          };
        })
        .filter((entry): entry is (typeof wineryCatalog)[number] => Boolean(entry)),
    [profilesById, selectedWineries],
  );

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
            const remoteProfile = profilesById[slugToWineryUuid(winery.id)];
            const experiencesText = experienceSummary(remoteProfile, "");
            const knownForText = remoteProfile?.famous_for ?? "";
            const summaryText = remoteProfile?.description ?? "";
            const displayAddress = remoteProfile?.address ?? "";

            return (
              <article
                key={winery.id}
                role="listitem"
                className={`catalogRow ${selected ? "active" : ""}`}
              >
                <div className="catalogMedia">
                  <div className="catalogImage" aria-hidden="true">
                    <span>{initials}</span>
                  </div>
                  <div className="catalogMeta">
                    <h3>{winery.name}</h3>
                    {displayAddress ? <p className="subtle">{displayAddress}</p> : null}
                    <p className="ratingLine">
                      {winery.rating} stars · {winery.selectedByCount} guests shortlisted
                    </p>
                    <p className="subtle">Organic: {winery.organicStatus}</p>
                    {remoteProfile?.tasting_price !== undefined ? (
                      <p className="subtle">Tasting: ${remoteProfile.tasting_price}</p>
                    ) : null}
                    <div className="metaRow">
                      <span className={`status ${winery.liveBookable ? "accepted" : "review"}`}>
                        {winery.liveBookable ? "Live booking available" : "Prospect list"}
                      </span>
                      {remoteProfile?.offers_cheese_board ? <span className="status accepted">Cheese board</span> : null}
                    </div>
                    <button
                      type="button"
                      className="buttonPrimary"
                      onClick={() => onToggleWinery(winery.id)}
                    >
                      {selected ? "Added to schedule" : "Add to schedule"}
                    </button>
                  </div>
                </div>
                <div className="catalogSummary">
                  {summaryText ? <p>{summaryText}</p> : null}
                  <div className="catalogBullets">
                    {experiencesText ? (
                      <p>
                        <strong>Experiences:</strong> {experiencesText}
                      </p>
                    ) : null}
                    {knownForText ? (
                      <p>
                        <strong>Known for:</strong> {knownForText}
                      </p>
                    ) : null}
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
          <h3>Selected winery pins</h3>
          <p className="subtle">Only wineries added to schedule are pinned. Map auto-zooms to show all selected venues.</p>
          <SelectedWineriesMap wineries={selectedWineryItems} />
          <div className="cartSummary">
            <p className="miniLabel">Schedule cart</p>
            <p>{selectedWineries.length} winery options selected</p>
            {selectedWineryItems.length > 0 ? (
              <div className="catalogPinList">
                {selectedWineryItems.map((item) => (
                  <p key={item.id} className="subtle">
                    <strong>{item.name}</strong>{item.address ? ` · ${item.address}` : ""}
                  </p>
                ))}
              </div>
            ) : (
              <p className="subtle">Add wineries to show pins on the map.</p>
            )}
            <button
              type="button"
              className="buttonPrimary fullWidthButton"
              onClick={onContinue}
              disabled={selectedWineries.length === 0}
            >
              Continue to scheduling
            </button>
            <button
              type="button"
              className="buttonClear fullWidthButton"
              onClick={onClearCart}
              disabled={selectedWineries.length === 0}
            >
              Clear cart
            </button>
          </div>
        </aside>
      </div>
    </SectionCard>
  );
}
