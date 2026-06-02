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
  onRemoveWinery: (wineryId: string) => void;
  onReorderWineries: (draggedWineryId: string, targetWineryId: string) => void;
  onContinue: () => void;
  onClearCart: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  mapTilePosition?: "side" | "top";
};

type SortMode = "top-rated" | "most-selected" | "established";

export function CustomerWineryCatalog({
  selectedWineries,
  onToggleWinery,
  onRemoveWinery,
  onReorderWineries,
  onContinue,
  onClearCart,
  continueLabel = "Continue to scheduling",
  continueDisabled = false,
  mapTilePosition = "side",
}: CustomerWineryCatalogProps) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All regions");
  const [organicOnly, setOrganicOnly] = useState(false);
  const [cellarDoorOnly, setCellarDoorOnly] = useState(false);
  const [liveBookableOnly, setLiveBookableOnly] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("top-rated");
  const [draggingWineryId, setDraggingWineryId] = useState<string | null>(null);
  const [dragOverWineryId, setDragOverWineryId] = useState<string | null>(null);
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
          const hasRemoteCoordinates =
            remoteProfile?.latitude !== undefined &&
            remoteProfile?.longitude !== undefined &&
            Number.isFinite(remoteProfile.latitude) &&
            Number.isFinite(remoteProfile.longitude);
          return {
            ...winery,
            address: remoteProfile?.address ?? "",
            latitude: hasRemoteCoordinates ? remoteProfile.latitude : winery.latitude,
            longitude: hasRemoteCoordinates ? remoteProfile.longitude : winery.longitude,
          };
        })
        .filter((entry): entry is (typeof wineryCatalog)[number] => Boolean(entry)),
    [profilesById, selectedWineries],
  );

  const selectedWineriesWithDbCoordinates = useMemo(
    () =>
      selectedWineries
        .map((wineryId) => {
          const winery = wineryCatalog.find((entry) => entry.id === wineryId);
          if (!winery) {
            return null;
          }
          const remoteProfile = profilesById[slugToWineryUuid(winery.id)];
          const hasRemoteCoordinates =
            remoteProfile?.latitude !== undefined &&
            remoteProfile?.longitude !== undefined &&
            Number.isFinite(remoteProfile.latitude) &&
            Number.isFinite(remoteProfile.longitude);
          if (!hasRemoteCoordinates) {
            return null;
          }
          return {
            ...winery,
            address: remoteProfile?.address ?? "",
            latitude: remoteProfile.latitude,
            longitude: remoteProfile.longitude,
          };
        })
        .filter((entry): entry is (typeof wineryCatalog)[number] => Boolean(entry)),
    [profilesById, selectedWineries],
  );

  const selectedWineriesMissingDbCoordinates = useMemo(
    () =>
      selectedWineryItems.filter((entry) => {
        const remoteProfile = profilesById[slugToWineryUuid(entry.id)];
        return !(
          remoteProfile?.latitude !== undefined &&
          remoteProfile?.longitude !== undefined &&
          Number.isFinite(remoteProfile.latitude) &&
          Number.isFinite(remoteProfile.longitude)
        );
      }),
    [profilesById, selectedWineryItems],
  );

  function renderMapAndCartTile() {
    return (
      <>
        <h3>Selected winery pins</h3>
        <p className="subtle">Pins use live winery database coordinates only. Map auto-zooms to show selected venues with verified coordinates.</p>
        <SelectedWineriesMap wineries={selectedWineriesWithDbCoordinates} />
        {selectedWineriesMissingDbCoordinates.length > 0 ? (
          <p className="subtle">
            Awaiting DB coordinates for:{" "}
            {selectedWineriesMissingDbCoordinates.map((entry) => entry.name).join(", ")}.
          </p>
        ) : null}
        <div className="cartSummary">
          <p className="miniLabel">Schedule cart</p>
          <p>{selectedWineries.length} winery options selected</p>
          {selectedWineryItems.length > 0 ? (
            <div className="catalogPinList">
              {selectedWineryItems.map((item) => (
                <div
                  key={item.id}
                  className={`cartListItem ${draggingWineryId === item.id ? "dragging" : ""} ${dragOverWineryId === item.id ? "dragOver" : ""}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", item.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingWineryId(item.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverWineryId(item.id);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragOverWineryId(item.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const draggedId = event.dataTransfer.getData("text/plain") || draggingWineryId;
                    if (draggedId && draggedId !== item.id) {
                      onReorderWineries(draggedId, item.id);
                    }
                    setDraggingWineryId(null);
                    setDragOverWineryId(null);
                  }}
                  onDragEnd={() => {
                    setDraggingWineryId(null);
                    setDragOverWineryId(null);
                  }}
                >
                  <span className="cartDragHandle" aria-hidden="true">⋮⋮</span>
                  <p className="subtle">
                    <strong>{item.name}</strong>{item.address ? ` · ${item.address}` : ""}
                  </p>
                  <button
                    type="button"
                    className="cartRemoveButton"
                    onClick={() => onRemoveWinery(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                    title={`Remove ${item.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="subtle">Add wineries to show pins on the map.</p>
          )}
          <button
            type="button"
            className="buttonPrimary fullWidthButton"
            onClick={onContinue}
            disabled={selectedWineries.length === 0 || continueDisabled}
          >
            {continueLabel}
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
      </>
    );
  }

  return (
    <SectionCard
      title="Choose preferred wineries"
      description="Filter the Margaret River catalogue, review each winery profile, and add options to your schedule cart."
    >
      {mapTilePosition === "top" ? (
        <div className="catalogMap catalogMapTop">
          <div className="catalogMapSticky">
            {renderMapAndCartTile()}
          </div>
        </div>
      ) : null}
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

      <div className={`catalogShell ${mapTilePosition === "top" ? "singleColumn" : ""}`}>
        <div className="catalogList catalogGrid" role="list">
          {filtered.map((winery) => {
            const selected = selectedWineries.includes(winery.id);
            const remoteProfile = profilesById[slugToWineryUuid(winery.id)];
            const experiencesText = experienceSummary(remoteProfile, "");
            const knownForText = remoteProfile?.famous_for ?? "";
            const summaryText = remoteProfile?.description ?? "";
            const displayAddress = remoteProfile?.address ?? "";
            const headline = summaryText || knownForText || winery.knownFor;
            const quickMeta = [
              `${winery.region}`,
              `Est. ${winery.established}`,
              `${winery.cellarDoor ? "Cellar door" : "By appointment"}`,
            ];

            return (
              <article
                key={winery.id}
                role="listitem"
                className={`catalogCard ${selected ? "active" : ""}`}
              >
                <div className="catalogCardMedia" aria-hidden="true">
                  <div className="catalogCardInitials">
                    {winery.name
                      .split(" ")
                      .slice(0, 2)
                      .map((entry) => entry[0])
                      .join("")}
                  </div>
                </div>

                <div className="catalogCardBody">
                  <div className="catalogCardTitleRow">
                    <h3>{winery.name}</h3>
                    <p className="catalogCardRating">★ {winery.rating.toFixed(2)}</p>
                  </div>
                  <p className="catalogCardHeadline">{headline}</p>
                  <p className="subtle">{quickMeta.join(" · ")}</p>
                  {displayAddress ? <p className="subtle">{displayAddress}</p> : null}
                  <div className="catalogCardTags">
                    <span className={`status ${winery.liveBookable ? "accepted" : "review"}`}>
                      {winery.liveBookable ? "Live booking available" : "Prospect list"}
                    </span>
                    <span className="status available">{winery.selectedByCount} shortlists</span>
                    {remoteProfile?.offers_cheese_board ? <span className="status accepted">Cheese board</span> : null}
                  </div>
                  {experiencesText ? (
                    <p className="subtle">
                      <strong>Experiences:</strong> {experiencesText}
                    </p>
                  ) : null}
                  <div className="catalogCardFooter">
                    <p className="catalogCardPrice">
                      {remoteProfile?.tasting_price !== undefined
                        ? `$${remoteProfile.tasting_price} tasting`
                        : "Tasting price on request"}
                    </p>
                    <button
                      type="button"
                      className="buttonPrimary"
                      onClick={() => onToggleWinery(winery.id)}
                    >
                      {selected ? "Added" : "Add"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {mapTilePosition === "side" ? (
          <aside className="catalogMap">
            <div className="catalogMapSticky">
              {renderMapAndCartTile()}
            </div>
          </aside>
        ) : null}
      </div>
    </SectionCard>
  );
}
