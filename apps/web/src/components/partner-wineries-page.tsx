"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";
import { optimizeWineryUploadImage } from "@/lib/image-utils";
import {
  approveWineryToken,
  completeWineryMediaUpload,
  createWineryMediaUploadUrl,
  deleteWineryMediaAuthed,
  getWineryMediaAuthed,
  getWineryProfileAuthed,
  getWineryPortalRequestsAuthed,
  listWineries,
  updateWineryProfileAuthed,
  type WineryMediaAsset,
  type WineryPortalItem,
} from "@/lib/live-api";

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(value: string) {
  return value.replace(/[^a-z]+/gi, "").toLowerCase();
}

function tokenFromActionUrl(actionUrl: string) {
  try {
    const url = new URL(actionUrl);
    return url.searchParams.get("token") ?? "";
  } catch {
    return "";
  }
}

type ExperienceDraft = {
  id: string;
  name: string;
  price: string;
};

const WINE_STYLE_OPTIONS = [
  "Organic & Biodynamic",
  "Natural & Minimal Intervention",
  "Small batch & Boutique",
  "Family-owned Estate",
  "Estate-grown fruit only",
  "Well known Margaret River Name",
  "Lesser known (off the beaten track)",
  "Red Wine Specialist",
  "White Wine Specialist",
  "Sparkling & Method traditionnelle Specialist",
  "Fortfied & Desert Wines",
  "Internationally awarded",
  "Wines only available at cellar door",
] as const;

const WELL_KNOWN_STYLE = "Well known Margaret River Name";
const LESSER_KNOWN_STYLE = "Lesser known (off the beaten track)";

const WINERY_SIGNAL_GROUPS = [
  {
    heading: "Setting & Atmosphere",
    options: [
      { value: "view_stunning", label: "Stunning vineyard views" },
      { value: "intimate_welcome", label: "Intimate, small-group welcome" },
      { value: "historic_estate", label: "Historic estate" },
      { value: "secluded", label: "Secluded and unhurried - no crowds" },
      { value: "garden_picnic", label: "Beautiful garden picnic grounds" },
    ],
  },
  {
    heading: "Wine Quality & Recognition",
    options: [
      { value: "halliday_5star", label: "James Halliday 5-Star winery" },
      { value: "gold_medals", label: "Gold medals at international shows" },
      { value: "exported_asia", label: "Wines exported to Asia" },
      { value: "trophy_winner", label: "Consistent trophy winner at MR Wine Show" },
      { value: "press_featured", label: "Featured in Decanter, Wine Spectator, or Halliday" },
    ],
  },
  {
    heading: "Story & People",
    options: [
      { value: "multi_generation", label: "Three generations of family winemaking" },
      { value: "female_winemaker", label: "Female winemaker and founder" },
      { value: "certified_organic", label: "Certified organic" },
      { value: "regenerative", label: "Regenerative farming practices" },
      { value: "small_production", label: "Produces fewer than 5,000 cases per year" },
    ],
  },
] as const;

function makeExperienceDraft(entry?: { name: string; price: number }): ExperienceDraft {
  return {
    id: crypto.randomUUID(),
    name: entry?.name ?? "",
    price: entry?.price !== undefined ? String(entry.price) : "",
  };
}

export function PartnerWineriesPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [wineries, setWineries] = useState<Array<{ winery_id: string; name: string; region: string }>>([]);
  const [selectedWineryId, setSelectedWineryId] = useState<string>("");
  const [requests, setRequests] = useState<WineryPortalItem[]>([]);
  const [mediaAssets, setMediaAssets] = useState<WineryMediaAsset[]>([]);
  const [summary, setSummary] = useState({ pending: 0, accepted: 0, declined: 0, expired: 0 });
  const [wineryName, setWineryName] = useState<string>("Winery");
  const [captionDraft, setCaptionDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [storageConfigured, setStorageConfigured] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [address, setAddress] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [tastingPrice, setTastingPrice] = useState("");
  const [tastingDurationMinutes, setTastingDurationMinutes] = useState("45");
  const [wineryDescription, setWineryDescription] = useState("");
  const [famousFor, setFamousFor] = useState("");
  const [offersCheeseBoard, setOffersCheeseBoard] = useState(false);
  const [wineStyles, setWineStyles] = useState<string[]>([]);
  const [winerySignals, setWinerySignals] = useState<string[]>([]);
  const [experienceRows, setExperienceRows] = useState<ExperienceDraft[]>([]);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);

  const loadRequests = useCallback(async (wineryId: string) => {
    if (!wineryId || !token) {
      setRequests([]);
      setSummary({ pending: 0, accepted: 0, declined: 0, expired: 0 });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [requestsResponse, mediaResponse, profileResponse] = await Promise.all([
        getWineryPortalRequestsAuthed(wineryId, token),
        getWineryMediaAuthed(wineryId, token),
        getWineryProfileAuthed(wineryId, token),
      ]);
      setRequests(requestsResponse.requests);
      setSummary(requestsResponse.summary);
      setWineryName(requestsResponse.winery?.name ?? "Winery");
      setMediaAssets(mediaResponse.assets);
      setStorageConfigured(mediaResponse.storage_configured);
      setCapacity(String(profileResponse.capacity ?? ""));
      setAddress(profileResponse.address ?? "");
      setOpeningHours(profileResponse.opening_hours ?? "");
      setTastingPrice(
        profileResponse.tasting_price !== undefined ? String(profileResponse.tasting_price) : "",
      );
      setTastingDurationMinutes(
        profileResponse.tasting_duration_minutes !== undefined
          ? String(profileResponse.tasting_duration_minutes)
          : "45",
      );
      setWineryDescription(profileResponse.description ?? "");
      setFamousFor(profileResponse.famous_for ?? "");
      setOffersCheeseBoard(profileResponse.offers_cheese_board);
      setWineStyles(profileResponse.wine_styles ?? []);
      setWinerySignals(profileResponse.winery_signals ?? []);
      setExperienceRows(
        profileResponse.unique_experience_offers.length > 0
          ? profileResponse.unique_experience_offers.map((entry) => makeExperienceDraft(entry))
          : [makeExperienceDraft()],
      );
      setProfileSavedAt(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load winery request queue.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    if (user.role === "transport") {
      router.replace("/partner/transport");
    } else if (user.role === "customer") {
      router.replace("/plan");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (authLoading || !user || !token) {
      return;
    }
    const currentUser = user;

    let active = true;

    async function loadWineries() {
      try {
        setLoading(true);
        setError(null);

        if (currentUser.role === "winery" && currentUser.winery_id) {
          const [response, profile] = await Promise.all([
            listWineries(),
            getWineryProfileAuthed(currentUser.winery_id, token),
          ]);
          if (!active) {
            return;
          }
          const found = response.wineries.find((item) => item.winery_id === currentUser.winery_id);
          setWineries([{
            winery_id: currentUser.winery_id,
            name: found?.name ?? profile.name,
            region: found?.region ?? profile.region,
          }]);
          setSelectedWineryId(currentUser.winery_id);
          return;
        }

        const response = await listWineries();
        if (!active) {
          return;
        }

        const sorted = response.wineries.map((item) => ({
          winery_id: item.winery_id,
          name: item.name,
          region: item.region,
        }));

        setWineries(sorted);
        setSelectedWineryId((current) => current || sorted[0]?.winery_id || "");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load winery list.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadWineries();

    return () => {
      active = false;
    };
  }, [authLoading, token, user]);

  useEffect(() => {
    void loadRequests(selectedWineryId);
  }, [loadRequests, selectedWineryId]);

  async function handleApprove(item: WineryPortalItem) {
    const tokenId = tokenFromActionUrl(item.action_url);
    if (!tokenId) {
      setError("Approval token could not be parsed for this booking.");
      return;
    }

    try {
      setApprovingRequestId(item.request_id);
      setError(null);
      await approveWineryToken(tokenId);
      await loadRequests(selectedWineryId);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Unable to approve this booking.");
    } finally {
      setApprovingRequestId(null);
    }
  }

  async function handleUploadImage() {
    if (!selectedWineryId || !token || !selectedFile) {
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const optimizedFile = await optimizeWineryUploadImage(selectedFile);
      const ticket = await createWineryMediaUploadUrl(selectedWineryId, token, {
        file_name: optimizedFile.name,
        content_type: optimizedFile.type || "image/jpeg",
        file_size_bytes: optimizedFile.size,
        caption: captionDraft.trim() || undefined,
      });

      const uploadResponse = await fetch(ticket.upload_url, {
        method: ticket.upload_method,
        headers: ticket.upload_headers,
        body: optimizedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed (${uploadResponse.status}). Check R2 bucket CORS settings.`);
      }

      await completeWineryMediaUpload(selectedWineryId, ticket.media_id, token);
      const refreshed = await getWineryMediaAuthed(selectedWineryId, token);
      setMediaAssets(refreshed.assets);
      setStorageConfigured(refreshed.storage_configured);
      setSelectedFile(null);
      setCaptionDraft("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(mediaId: string) {
    if (!selectedWineryId || !token) {
      return;
    }

    try {
      setDeletingMediaId(mediaId);
      setError(null);
      await deleteWineryMediaAuthed(selectedWineryId, mediaId, token);
      setMediaAssets((current) => current.filter((asset) => asset.media_id !== mediaId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete image.");
    } finally {
      setDeletingMediaId(null);
    }
  }

  function updateExperienceRow(id: string, field: "name" | "price", value: string) {
    setExperienceRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function addExperienceRow() {
    setExperienceRows((current) => [...current, makeExperienceDraft()]);
  }

  function toggleWineStyle(style: string, checked: boolean) {
    setWineStyles((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(style);
        if (style === WELL_KNOWN_STYLE) {
          next.delete(LESSER_KNOWN_STYLE);
        }
        if (style === LESSER_KNOWN_STYLE) {
          next.delete(WELL_KNOWN_STYLE);
        }
      } else {
        next.delete(style);
      }
      return Array.from(next);
    });
  }

  function toggleWinerySignal(signal: string, checked: boolean) {
    setWinerySignals((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(signal);
      } else {
        next.delete(signal);
      }
      return Array.from(next);
    });
  }

  function removeExperienceRow(id: string) {
    setExperienceRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  }

  async function handleSaveProfile() {
    if (!selectedWineryId || !token) {
      return;
    }

    const normalizedRows = experienceRows
      .map((row) => ({
        name: row.name.trim(),
        price: Number(row.price),
      }))
      .filter((row) => row.name && Number.isFinite(row.price) && row.price >= 0);
    const normalizedCapacity = Number(capacity);
    const normalizedTastingDurationMinutes = Number(tastingDurationMinutes);
    if (!Number.isFinite(normalizedCapacity) || normalizedCapacity <= 0) {
      setError("Capacity must be greater than 0.");
      return;
    }
    if (!Number.isFinite(normalizedTastingDurationMinutes) || normalizedTastingDurationMinutes <= 0) {
      setError("Tasting length must be greater than 0 minutes.");
      return;
    }

    try {
      setProfileSaving(true);
      setError(null);
      const updated = await updateWineryProfileAuthed(selectedWineryId, token, {
        capacity: normalizedCapacity,
        address: address.trim() || undefined,
        opening_hours: openingHours.trim() || undefined,
        tasting_price: tastingPrice.trim() ? Number(tastingPrice) : undefined,
        tasting_duration_minutes: normalizedTastingDurationMinutes,
        description: wineryDescription.trim() || undefined,
        famous_for: famousFor.trim() || undefined,
        offers_cheese_board: offersCheeseBoard,
        wine_styles: wineStyles,
        winery_signals: winerySignals,
        unique_experience_offers: normalizedRows,
      });
      setCapacity(String(updated.capacity ?? ""));
      setAddress(updated.address ?? "");
      setOpeningHours(updated.opening_hours ?? "");
      setTastingPrice(updated.tasting_price !== undefined ? String(updated.tasting_price) : "");
      setTastingDurationMinutes(
        updated.tasting_duration_minutes !== undefined ? String(updated.tasting_duration_minutes) : "45",
      );
      setWineryDescription(updated.description ?? "");
      setFamousFor(updated.famous_for ?? "");
      setOffersCheeseBoard(updated.offers_cheese_board);
      setWineStyles(updated.wine_styles ?? []);
      setWinerySignals(updated.winery_signals ?? []);
      setExperienceRows(
        updated.unique_experience_offers.length > 0
          ? updated.unique_experience_offers.map((entry) => makeExperienceDraft(entry))
          : [makeExperienceDraft()],
      );
      setProfileSavedAt(new Date().toISOString());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save winery profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  const pendingItems = useMemo(
    () => requests.filter((item) => item.status === "pending"),
    [requests],
  );

  const acceptedItems = useMemo(
    () => requests.filter((item) => item.status === "accepted"),
    [requests],
  );

  if (!authLoading && !user) {
    return (
      <AppShell
        eyebrow="Winery portal"
        title="Winery partner access"
        intro="Log in with your winery account to view and approve booking requests."
        showWorkflowStatus={false}
        navMode="partner"
      >
        <div className="actionPageShell">
          <SectionCard title="Sign in required" description="This portal is restricted to signed-in winery users and ops users.">
            <div className="ctaRow">
              <Link href="/login" className="buttonPrimary">Log in</Link>
              <Link href="/register" className="buttonGhost">Create account</Link>
            </div>
          </SectionCard>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Winery portal"
      title="Booking requests"
      intro="Review pending requests and approve bookings for your winery."
      navMode="partner"
    >
      <SectionCard
        title="Winery queue"
        description="Bookings waiting for action and those already accepted."
      >
        <div className="fieldRow">
          <div className="field">
            <label htmlFor="winerySelect">Winery</label>
            <select
              id="winerySelect"
              className="inputLike inputField"
              value={selectedWineryId}
              onChange={(event) => setSelectedWineryId(event.target.value)}
              disabled={loading || wineries.length === 0 || user?.role === "winery"}
            >
              {wineries.map((winery) => (
                <option key={winery.winery_id} value={winery.winery_id}>
                  {winery.name} ({winery.region})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="summaryRibbon" style={{ marginTop: 14 }}>
          <div className="summaryChip">
            <span className="miniLabel">Pending</span>
            <strong>{summary.pending}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Accepted</span>
            <strong>{summary.accepted}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Declined</span>
            <strong>{summary.declined}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Expired</span>
            <strong>{summary.expired}</strong>
          </div>
        </div>
      </SectionCard>

      {error ? <div className="callout errorCallout">{error}</div> : null}

      <div className="grid two">
        <SectionCard
          title={`Pending approvals for ${wineryName}`}
          description="These requests need a response."
        >
          <div className="list">
            {pendingItems.length === 0 ? (
              <div className="listRow">
                <p className="subtle">No pending requests right now.</p>
              </div>
            ) : (
              pendingItems.map((item) => (
                <div key={item.request_id} className="listRow">
                  <div className="listTop">
                    <div>
                      <h3>{item.booking?.leadName ?? "Guest booking"}</h3>
                      <p className="subtle">
                        {item.booking?.bookingDate} | {item.booking?.pickupLocation} | {item.booking?.partySize} guests
                      </p>
                    </div>
                    <span className={`status ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="metaRow">
                    <span className="meta">Sent via {item.sent_channel}</span>
                    <span className="meta">Recipient {item.sent_recipient ?? "(not configured)"}</span>
                    <span className="meta">Sent {formatDateTime(item.sent_at)}</span>
                  </div>
                  <div className="ctaRow">
                    <button
                      type="button"
                      className="buttonPrimary"
                      onClick={() => handleApprove(item)}
                      disabled={approvingRequestId === item.request_id}
                    >
                      {approvingRequestId === item.request_id ? "Approving..." : "Approve booking"}
                    </button>
                    <a className="buttonGhost" href={item.action_url} target="_blank" rel="noreferrer">
                      Open magic link
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Accepted requests"
          description="History of accepted bookings."
        >
          <div className="list">
            {acceptedItems.length === 0 ? (
              <div className="listRow">
                <p className="subtle">No accepted requests yet.</p>
              </div>
            ) : (
              acceptedItems.map((item) => (
                <div key={item.request_id} className="listRow">
                  <div className="listTop">
                    <div>
                      <h3>{item.booking?.leadName ?? "Guest booking"}</h3>
                      <p className="subtle">
                        {item.booking?.bookingDate} | {item.booking?.pickupLocation} | {item.booking?.partySize} guests
                      </p>
                    </div>
                    <span className={`status ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="metaRow">
                    <span className="meta">Approved {formatDateTime(item.approved_at)}</span>
                    <span className="meta">Booking {item.booking_id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Winery image gallery"
        description="Upload photos now so customer schedule previews can display real winery imagery."
      >
        {!storageConfigured ? (
          <div className="callout errorCallout">
            R2 storage is not configured in the API yet. Add `TM_R2_*` app settings first.
          </div>
        ) : null}

        <div className="fieldRow">
          <div className="field">
            <label htmlFor="wineryImageUpload">Select image</label>
            <input
              id="wineryImageUpload"
              type="file"
              className="inputLike inputField"
              accept="image/*"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="field">
            <label htmlFor="wineryImageCaption">Caption (optional)</label>
            <input
              id="wineryImageCaption"
              className="inputLike inputField"
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              placeholder="Cellar door tasting room"
            />
          </div>
        </div>

        <div className="ctaRow">
          <button
            type="button"
            className="buttonPrimary"
            onClick={handleUploadImage}
            disabled={!selectedFile || uploading || !storageConfigured}
          >
            {uploading ? "Uploading..." : "Upload image"}
          </button>
        </div>

        <div className="mediaGrid">
          {mediaAssets.length === 0 ? (
            <div className="listRow">
              <p className="subtle">No images uploaded yet for this winery.</p>
            </div>
          ) : (
            mediaAssets.map((asset) => (
              <article key={asset.media_id} className="mediaCard">
                <button
                  type="button"
                  className="mediaDeleteButton"
                  onClick={() => handleDeleteImage(asset.media_id)}
                  disabled={deletingMediaId === asset.media_id}
                  aria-label={`Delete ${asset.file_name}`}
                  title="Delete image"
                >
                  {deletingMediaId === asset.media_id ? "..." : "X"}
                </button>
                <img src={asset.public_url} alt={asset.caption || asset.file_name} loading="lazy" decoding="async" />
                <div className="mediaMeta">
                  <p><strong>{asset.file_name}</strong></p>
                  <p className="subtle">{asset.caption || "No caption"}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Winery profile settings"
        description="Set tasting price, winery details, and experience offers shown to guests."
      >
        <div className="fieldRow profileCompactRow">
          <div className="field compactField">
            <label htmlFor="wineryCapacity">Guest capacity</label>
            <input
              id="wineryCapacity"
              type="number"
              min={1}
              step={1}
              className="inputLike inputField"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="20"
            />
          </div>
          <div className="field compactField">
            <label htmlFor="tastingPrice">Tasting price (AUD)</label>
            <div className="inputLike currencyField">
              <span className="currencyPrefix" aria-hidden="true">$</span>
              <input
                id="tastingPrice"
                type="number"
                min={0}
                step="0.01"
                className="inputField currencyInput"
                value={tastingPrice}
                onChange={(event) => setTastingPrice(event.target.value)}
                placeholder="35"
              />
            </div>
          </div>
          <div className="field compactField tastingDurationField">
            <label htmlFor="tastingDurationMinutes">Tasting length (mins)</label>
            <input
              id="tastingDurationMinutes"
              type="number"
              min={1}
              max={480}
              step={1}
              className="inputLike inputField"
              value={tastingDurationMinutes}
              onChange={(event) => setTastingDurationMinutes(event.target.value)}
              placeholder="45"
            />
          </div>
        </div>

        <div className="fieldRow">
          <div className="field">
            <label htmlFor="famousFor">What is your winery famous for?</label>
            <input
              id="famousFor"
              className="inputLike inputField"
              value={famousFor}
              onChange={(event) => setFamousFor(event.target.value)}
              placeholder="Cabernet Sauvignon and Chardonnay"
            />
          </div>
        </div>

        <div className="fieldRow">
          <div className="field">
            <label htmlFor="wineryAddress">Address</label>
            <input
              id="wineryAddress"
              className="inputLike inputField"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="123 Caves Rd, Wilyabrup WA 6280"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="openingHours">Opening hours</label>
          <textarea
            id="openingHours"
            className="inputLike inputField"
            rows={3}
            value={openingHours}
            onChange={(event) => setOpeningHours(event.target.value)}
            placeholder={"Mon-Fri 10:00-17:00\nSat-Sun 09:00-18:00"}
          />
        </div>

        <div className="field">
          <label htmlFor="wineryDescription">Winery description</label>
          <textarea
            id="wineryDescription"
            className="inputLike inputField"
            rows={4}
            value={wineryDescription}
            onChange={(event) => setWineryDescription(event.target.value)}
            placeholder="Describe your winery, atmosphere, and guest experience."
          />
        </div>

        <div className="field">
          <label className="choicePill">
            <input
              type="checkbox"
              checked={offersCheeseBoard}
              onChange={(event) => setOffersCheeseBoard(event.target.checked)}
            />
            Offers cheese board
          </label>
        </div>

        <div className="field">
          <label>Wine styles (multi-select)</label>
          <div className="choiceRow">
            {WINE_STYLE_OPTIONS.map((style) => {
              const checked = wineStyles.includes(style);
              return (
                <label key={style} className="choicePill">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggleWineStyle(style, event.target.checked)}
                  />
                  {style}
                </label>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label>Setting, quality, and story signals (multi-select)</label>
          {WINERY_SIGNAL_GROUPS.map((group) => (
            <div key={group.heading} className="field" style={{ marginTop: 8 }}>
              <p className="miniLabel">{group.heading}</p>
              <div className="choiceRow">
                {group.options.map((option) => (
                  <label key={option.value} className="choicePill">
                    <input
                      type="checkbox"
                      checked={winerySignals.includes(option.value)}
                      onChange={(event) => toggleWinerySignal(option.value, event.target.checked)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="field">
          <label>Unique experiences and prices</label>
          <div className="experienceList">
            {experienceRows.map((row) => (
              <div key={row.id} className="experienceRow">
                <input
                  className="inputLike inputField"
                  value={row.name}
                  onChange={(event) => updateExperienceRow(row.id, "name", event.target.value)}
                  placeholder="Experience name"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="inputLike inputField"
                  value={row.price}
                  onChange={(event) => updateExperienceRow(row.id, "price", event.target.value)}
                  placeholder="Price (AUD)"
                />
                <button type="button" className="buttonGhost" onClick={() => removeExperienceRow(row.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="ctaRow">
            <button type="button" className="buttonGhost" onClick={addExperienceRow}>
              Add experience
            </button>
          </div>
        </div>

        <div className="ctaRow">
          <button type="button" className="buttonPrimary" onClick={handleSaveProfile} disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save winery profile"}
          </button>
          {profileSavedAt ? <span className="meta">Saved {formatDateTime(profileSavedAt)}</span> : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}

