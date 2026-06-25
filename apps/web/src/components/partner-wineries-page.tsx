"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalGate, PortalShell, PortalToast, type PortalNavItem } from "@/components/portal-shell";
import { useAuth } from "@/lib/auth-state";
import { optimizeWineryUploadImage } from "@/lib/image-utils";
import {
  approveWineryToken,
  changePassword,
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

type View = "requests" | "profile" | "media" | "availability";
type RequestFilter = "pending" | "accepted" | "declined" | "all";

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function humanizeNote(value: string) {
  return value.replace(/_/g, " ").trim();
}

function BookingSafetyNotes({ booking }: { booking: WineryPortalItem["booking"] }) {
  if (!booking) {
    return null;
  }
  const dietary = booking.dietaryRequirements ?? [];
  const accessibility = booking.accessibilityRequirements ?? [];
  const hasNotes =
    dietary.length > 0 || accessibility.length > 0 || Boolean(booking.occasion) || Boolean(booking.specialRequests);
  if (!hasNotes) {
    return null;
  }
  return (
    <div className="pt-context" style={{ display: "grid", gap: 6, alignItems: "start" }}>
      {dietary.length > 0 ? <span><strong>Dietary:</strong> {dietary.map(humanizeNote).join(", ")}</span> : null}
      {accessibility.length > 0 ? <span><strong>Accessibility:</strong> {accessibility.map(humanizeNote).join(", ")}</span> : null}
      {booking.occasion ? <span><strong>Occasion:</strong> {humanizeNote(booking.occasion)}</span> : null}
      {booking.specialRequests ? <span><strong>Notes:</strong> {booking.specialRequests}</span> : null}
    </div>
  );
}

function tokenFromActionUrl(actionUrl: string) {
  try {
    const url = new URL(actionUrl);
    return url.searchParams.get("token") ?? "";
  } catch {
    return "";
  }
}

function pillClass(status: string) {
  if (status === "accepted") {
    return "pt-pill pt-pill--accepted";
  }
  if (status === "declined") {
    return "pt-pill pt-pill--declined";
  }
  return "pt-pill pt-pill--pending";
}

type ExperienceDraft = { id: string; name: string; price: string };

type ProfileSectionKey =
  | "basics"
  | "password"
  | "wine-styles"
  | "setting-atmosphere"
  | "wine-quality"
  | "story-people"
  | "asian-market"
  | "practical"
  | "tastings-pairings"
  | "food-wine"
  | "behind-scenes"
  | "special-occasions"
  | "mobility-access"
  | "sensory-communication"
  | "dietary-preferences"
  | "allergies-intolerances"
  | "religious-requirements"
  | "food-policy"
  | "open-days"
  | "advance-notice"
  | "experiences";

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
  "Fortified & Dessert Wines",
  "Internationally awarded",
  "Wines only available at cellar door",
] as const;

const WELL_KNOWN_STYLE = "Well known Margaret River Name";
const LESSER_KNOWN_STYLE = "Lesser known (off the beaten track)";
const OPEN_DAY_SIGNALS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const ADVANCE_NOTICE_SIGNALS = ["same_day", "24_hours", "48_hours", "72_hours", "1_week", "2_weeks"] as const;

const WINERY_SIGNAL_GROUPS = [
  { key: "setting-atmosphere" as const, heading: "Setting & atmosphere", options: [
    { value: "view_stunning", label: "Stunning vineyard views" },
    { value: "intimate_welcome", label: "Intimate, small-group welcome" },
    { value: "historic_estate", label: "Historic estate" },
    { value: "secluded", label: "Secluded and unhurried - no crowds" },
    { value: "garden_picnic", label: "Beautiful garden picnic grounds" },
  ] },
  { key: "wine-quality" as const, heading: "Wine quality & recognition", options: [
    { value: "halliday_5star", label: "James Halliday 5-Star winery" },
    { value: "gold_medals", label: "Gold medals at international shows" },
    { value: "exported_asia", label: "Wines exported to Asia" },
    { value: "trophy_winner", label: "Consistent trophy winner at MR Wine Show" },
    { value: "press_featured", label: "Featured in Decanter, Wine Spectator, or Halliday" },
  ] },
  { key: "story-people" as const, heading: "Story & people", options: [
    { value: "multi_generation", label: "Three generations of family winemaking" },
    { value: "female_winemaker", label: "Female winemaker and founder" },
    { value: "certified_organic", label: "Certified organic" },
    { value: "regenerative", label: "Regenerative farming practices" },
    { value: "small_production", label: "Produces fewer than 5,000 cases per year" },
  ] },
  { key: "asian-market" as const, heading: "Asian market relevance", options: [
    { value: "mandarin_staff", label: "Mandarin-speaking staff available" },
    { value: "vietnamese_staff", label: "Vietnamese-speaking staff available" },
    { value: "asian_pairing", label: "Asian cuisine pairing experiences" },
    { value: "wechat_line", label: "WeChat / Line friendly" },
    { value: "hosted_asian_groups", label: "We've hosted groups from Singapore, Vietnam & beyond" },
  ] },
  { key: "practical" as const, heading: "Practical", options: [
    { value: "wheelchair_access", label: "Wheelchair accessible" },
    { value: "minibus_parking", label: "Easy parking for minibuses" },
    { value: "dog_friendly", label: "Dog-friendly grounds" },
    { value: "child_friendly", label: "Child-friendly - non-wine options available" },
    { value: "close_to_town", label: "10 minutes from Margaret River town" },
  ] },
  { key: "tastings-pairings" as const, heading: "Tastings & pairings", options: [
    { value: "cellar_door_tasting", label: "Standard cellar door tasting" },
    { value: "guided_tasting", label: "Guided / hosted tasting" },
    { value: "private_tasting_room", label: "Private tasting room" },
    { value: "barrel_tasting", label: "Barrel tasting" },
    { value: "sunset_tasting", label: "Sunset tasting session" },
  ] },
  { key: "food-wine" as const, heading: "Food & wine", options: [
    { value: "winery_lunch", label: "Lunch at the winery" },
    { value: "cheese_board", label: "Cheese & wine pairing" },
    { value: "wine_chocolate", label: "Wine & chocolate pairing" },
    { value: "charcuterie_board", label: "Charcuterie & wine" },
    { value: "cooking_class", label: "Food & wine cooking class" },
    { value: "picnic_on_estate", label: "Picnic on the estate" },
  ] },
  { key: "behind-scenes" as const, heading: "Behind the scenes", options: [
    { value: "vineyard_walk", label: "Guided vineyard walk" },
    { value: "cellar_tour", label: "Cellar & barrel hall tour" },
    { value: "blending_experience", label: "Blending & winemaking experience" },
    { value: "harvest_experience", label: "Harvest season experience" },
  ] },
  { key: "special-occasions" as const, heading: "Special occasions", options: [
    { value: "accommodation", label: "Accommodation on-site" },
    { value: "corporate_events", label: "Corporate & private events" },
    { value: "wedding_venue", label: "Wedding venue" },
  ] },
  { key: "mobility-access" as const, heading: "Mobility & access", options: [
    { value: "wheelchair_pathways", label: "Wheelchair-accessible pathways" },
    { value: "wheelchair_tasting", label: "Wheelchair-accessible tasting area" },
    { value: "accessible_bathroom", label: "Accessible bathroom on-site" },
    { value: "step_free_entry", label: "Step-free entry to all areas" },
    { value: "accessible_parking", label: "Accessible parking bays" },
    { value: "minibus_access", label: "Minibus / large vehicle drop-off" },
  ] },
  { key: "sensory-communication" as const, heading: "Sensory & communication", options: [
    { value: "hearing_loop", label: "Hearing loop / induction system" },
    { value: "large_print", label: "Large-print menus & tasting notes" },
    { value: "seated_tasting", label: "All tastings fully seated" },
    { value: "quiet_space", label: "Quiet space available on request" },
  ] },
  { key: "dietary-preferences" as const, heading: "Dietary preferences", options: [
    { value: "vegetarian", label: "Vegetarian food options" },
    { value: "vegan", label: "Vegan food options" },
    { value: "dairy_free", label: "Dairy-free options" },
  ] },
  { key: "allergies-intolerances" as const, heading: "Allergies & intolerances", options: [
    { value: "gluten_free", label: "Gluten-free options available" },
    { value: "gluten_free_strict", label: "Strictly gluten-free kitchen" },
    { value: "nut_free", label: "Nut-free kitchen" },
  ] },
  { key: "religious-requirements" as const, heading: "Religious requirements", options: [
    { value: "halal", label: "Halal-certified food" },
    { value: "kosher", label: "Kosher food available" },
  ] },
  { key: "food-policy" as const, heading: "Food policy", options: [
    { value: "no_food", label: "No food served" },
    { value: "byo_food", label: "Guests welcome to bring food" },
    { value: "custom_on_request", label: "Most needs accommodated with notice" },
  ] },
  { key: "open-days" as const, heading: "Open days", options: [
    { value: "mon", label: "Monday" },
    { value: "tue", label: "Tuesday" },
    { value: "wed", label: "Wednesday" },
    { value: "thu", label: "Thursday" },
    { value: "fri", label: "Friday" },
    { value: "sat", label: "Saturday" },
    { value: "sun", label: "Sunday" },
  ] },
  { key: "advance-notice" as const, heading: "Advance notice", options: [
    { value: "same_day", label: "Same day - we're flexible" },
    { value: "24_hours", label: "24 hours ahead" },
    { value: "48_hours", label: "48 hours ahead (default)" },
    { value: "72_hours", label: "3 days ahead" },
    { value: "1_week", label: "1 week ahead" },
    { value: "2_weeks", label: "2 weeks ahead" },
  ] },
];

const PROFILE_SECTIONS: Array<{ key: ProfileSectionKey; label: string }> = [
  { key: "basics", label: "Basics" },
  { key: "wine-styles", label: "Wine styles" },
  ...WINERY_SIGNAL_GROUPS.map((group) => ({ key: group.key, label: group.heading })),
  { key: "experiences", label: "Experiences" },
  { key: "password", label: "Password" },
];

function makeExperienceDraft(entry?: { name: string; price: number }): ExperienceDraft {
  return { id: crypto.randomUUID(), name: entry?.name ?? "", price: entry?.price !== undefined ? String(entry.price) : "" };
}

export function PartnerWineriesPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>("requests");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("pending");
  const [profileSection, setProfileSection] = useState<ProfileSectionKey>("basics");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [website, setWebsite] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [tastingPrice, setTastingPrice] = useState("");
  const [tastingDurationMinutes, setTastingDurationMinutes] = useState("45");
  const [wineryDescription, setWineryDescription] = useState("");
  const [famousFor, setFamousFor] = useState("");
  const [wineStyles, setWineStyles] = useState<string[]>([]);
  const [winerySignals, setWinerySignals] = useState<string[]>([]);
  const [experienceRows, setExperienceRows] = useState<ExperienceDraft[]>([]);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileAutoSaving, setProfileAutoSaving] = useState(false);
  const profileLoadedRef = useRef(false);
  const profileAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProfileSignatureRef = useRef("");

  function flashToast(message: string) {
    setToast(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function normalizeProfileDraft() {
    const normalizedRows = experienceRows
      .map((row) => ({ name: row.name.trim(), price: Number(row.price) }))
      .filter((row) => row.name && Number.isFinite(row.price) && row.price >= 0);
    const normalizedSignals = new Set(winerySignals);
    const hasAdvanceNotice = ADVANCE_NOTICE_SIGNALS.some((signal) => normalizedSignals.has(signal));
    if (!hasAdvanceNotice) {
      normalizedSignals.add("48_hours");
    }
    const normalizedCapacity = Number(capacity);
    const normalizedTastingDurationMinutes = Number(tastingDurationMinutes);
    const normalizedPayload = {
      capacity: normalizedCapacity,
      address: address.trim() || undefined,
      website: website.trim() || undefined,
      opening_hours: openingHours.trim() || undefined,
      tasting_price: tastingPrice.trim() ? Number(tastingPrice) : undefined,
      tasting_duration_minutes: normalizedTastingDurationMinutes,
      description: wineryDescription.trim() || undefined,
      famous_for: famousFor.trim() || undefined,
      offers_cheese_board: normalizedSignals.has("cheese_board"),
      wine_styles: [...wineStyles].sort(),
      winery_signals: Array.from(normalizedSignals).sort(),
      unique_experience_offers: normalizedRows,
    };
    return {
      payload: normalizedPayload,
      normalizedCapacity,
      normalizedTastingDurationMinutes,
      signature: JSON.stringify(normalizedPayload),
    };
  }

  function profileSignatureFromResponse(profile: {
    capacity?: number;
    address?: string;
    website?: string;
    opening_hours?: string;
    tasting_price?: number;
    tasting_duration_minutes?: number;
    description?: string;
    famous_for?: string;
    offers_cheese_board?: boolean;
    wine_styles?: string[];
    winery_signals?: string[];
    unique_experience_offers?: Array<{ name: string; price: number }>;
  }) {
    const normalizedSignals = new Set(profile.winery_signals ?? []);
    if (profile.offers_cheese_board) {
      normalizedSignals.add("cheese_board");
    }
    if (!ADVANCE_NOTICE_SIGNALS.some((signal) => normalizedSignals.has(signal))) {
      normalizedSignals.add("48_hours");
    }
    const normalizedRows = (profile.unique_experience_offers ?? [])
      .map((row) => ({ name: row.name.trim(), price: Number(row.price) }))
      .filter((row) => row.name && Number.isFinite(row.price) && row.price >= 0);
    return JSON.stringify({
      capacity: Number(profile.capacity ?? 0),
      address: profile.address?.trim() || undefined,
      website: profile.website?.trim() || undefined,
      opening_hours: profile.opening_hours?.trim() || undefined,
      tasting_price: profile.tasting_price,
      tasting_duration_minutes: Number(profile.tasting_duration_minutes ?? 45),
      description: profile.description?.trim() || undefined,
      famous_for: profile.famous_for?.trim() || undefined,
      offers_cheese_board: normalizedSignals.has("cheese_board"),
      wine_styles: [...(profile.wine_styles ?? [])].sort(),
      winery_signals: Array.from(normalizedSignals).sort(),
      unique_experience_offers: normalizedRows,
    });
  }

  const loadRequests = useCallback(async (wineryId: string) => {
    if (!wineryId || !token) {
      profileLoadedRef.current = false;
      setRequests([]);
      setSummary({ pending: 0, accepted: 0, declined: 0, expired: 0 });
      return;
    }
    profileLoadedRef.current = false;
    if (profileAutosaveTimerRef.current) {
      clearTimeout(profileAutosaveTimerRef.current);
      profileAutosaveTimerRef.current = null;
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
      setWebsite(profileResponse.website ?? "");
      setOpeningHours(profileResponse.opening_hours ?? "");
      setTastingPrice(profileResponse.tasting_price !== undefined ? String(profileResponse.tasting_price) : "");
      setTastingDurationMinutes(
        profileResponse.tasting_duration_minutes !== undefined ? String(profileResponse.tasting_duration_minutes) : "45",
      );
      setWineryDescription(profileResponse.description ?? "");
      setFamousFor(profileResponse.famous_for ?? "");
      const loadedSignals = new Set(profileResponse.winery_signals ?? []);
      if (profileResponse.offers_cheese_board) {
        loadedSignals.add("cheese_board");
      }
      if (!ADVANCE_NOTICE_SIGNALS.some((signal) => loadedSignals.has(signal))) {
        loadedSignals.add("48_hours");
      }
      setWineStyles(profileResponse.wine_styles ?? []);
      setWinerySignals(Array.from(loadedSignals));
      setExperienceRows(
        profileResponse.unique_experience_offers.length > 0
          ? profileResponse.unique_experience_offers.map((entry) => makeExperienceDraft(entry))
          : [makeExperienceDraft()],
      );
      setProfileSavedAt(null);
      lastProfileSignatureRef.current = profileSignatureFromResponse(profileResponse);
      profileLoadedRef.current = true;
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
          setWineries([{ winery_id: currentUser.winery_id, name: found?.name ?? profile.name, region: found?.region ?? profile.region }]);
          setSelectedWineryId(currentUser.winery_id);
          return;
        }
        const response = await listWineries();
        if (!active) {
          return;
        }
        const sorted = response.wineries.map((item) => ({ winery_id: item.winery_id, name: item.name, region: item.region }));
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
      flashToast("Request accepted — guest confirmed.");
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
      const uploadResponse = await fetch(ticket.upload_url, { method: ticket.upload_method, headers: ticket.upload_headers, body: optimizedFile });
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed (${uploadResponse.status}). Check R2 bucket CORS settings.`);
      }
      await completeWineryMediaUpload(selectedWineryId, ticket.media_id, token);
      const refreshed = await getWineryMediaAuthed(selectedWineryId, token);
      setMediaAssets(refreshed.assets);
      setStorageConfigured(refreshed.storage_configured);
      setSelectedFile(null);
      setCaptionDraft("");
      flashToast("Photo added to your gallery.");
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
    setExperienceRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }
  function addExperienceRow() {
    setExperienceRows((current) => [...current, makeExperienceDraft()]);
  }
  function removeExperienceRow(id: string) {
    setExperienceRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
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
  function setAdvanceNotice(signal: string) {
    setWinerySignals((current) => {
      const next = new Set(current.filter((entry) => !ADVANCE_NOTICE_SIGNALS.includes(entry as (typeof ADVANCE_NOTICE_SIGNALS)[number])));
      next.add(signal);
      return Array.from(next);
    });
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setPasswordError("Sign in first to change your password.");
      return;
    }
    setPasswordError(null);
    setPasswordMessage(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password confirmation does not match.");
      return;
    }
    try {
      setPasswordSaving(true);
      const response = await changePassword(token, { current_password: currentPassword, new_password: newPassword });
      setPasswordMessage(response.message || "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (changeError) {
      setPasswordError(changeError instanceof Error ? changeError.message : "Unable to change password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  const handleSaveProfile = useCallback(async (options?: { silent?: boolean; autosave?: boolean }) => {
    if (!selectedWineryId || !token) {
      return;
    }
    const silent = options?.silent ?? false;
    const autosave = options?.autosave ?? false;
    const { payload, normalizedCapacity, normalizedTastingDurationMinutes, signature } = normalizeProfileDraft();
    if (!Number.isFinite(normalizedCapacity) || normalizedCapacity <= 0) {
      if (!silent) {
        setError("Capacity must be greater than 0.");
      }
      return;
    }
    if (!Number.isFinite(normalizedTastingDurationMinutes) || normalizedTastingDurationMinutes <= 0) {
      if (!silent) {
        setError("Tasting length must be greater than 0 minutes.");
      }
      return;
    }
    if (autosave && signature === lastProfileSignatureRef.current) {
      return;
    }
    try {
      setProfileSaving(true);
      setProfileAutoSaving(autosave);
      if (!silent) {
        setError(null);
      }
      const updated = await updateWineryProfileAuthed(selectedWineryId, token, payload);
      setCapacity(String(updated.capacity ?? ""));
      setAddress(updated.address ?? "");
      setWebsite(updated.website ?? "");
      setOpeningHours(updated.opening_hours ?? "");
      setTastingPrice(updated.tasting_price !== undefined ? String(updated.tasting_price) : "");
      setTastingDurationMinutes(updated.tasting_duration_minutes !== undefined ? String(updated.tasting_duration_minutes) : "45");
      setWineryDescription(updated.description ?? "");
      setFamousFor(updated.famous_for ?? "");
      setWineStyles(updated.wine_styles ?? []);
      const updatedSignals = new Set(updated.winery_signals ?? []);
      if (updated.offers_cheese_board) {
        updatedSignals.add("cheese_board");
      }
      if (!ADVANCE_NOTICE_SIGNALS.some((signal) => updatedSignals.has(signal))) {
        updatedSignals.add("48_hours");
      }
      setWinerySignals(Array.from(updatedSignals));
      setExperienceRows(
        updated.unique_experience_offers.length > 0
          ? updated.unique_experience_offers.map((entry) => makeExperienceDraft(entry))
          : [makeExperienceDraft()],
      );
      setProfileSavedAt(new Date().toISOString());
      lastProfileSignatureRef.current = profileSignatureFromResponse(updated);
      if (!autosave) {
        flashToast("Estate profile saved.");
      }
    } catch (saveError) {
      if (!silent) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save winery profile.");
      }
    } finally {
      setProfileSaving(false);
      setProfileAutoSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWineryId, token, capacity, address, website, openingHours, tastingPrice, tastingDurationMinutes, wineryDescription, famousFor, wineStyles, winerySignals, experienceRows]);

  useEffect(() => {
    if (!selectedWineryId || !token || !profileLoadedRef.current || profileSaving) {
      return;
    }
    const draft = normalizeProfileDraft();
    if (draft.signature === lastProfileSignatureRef.current) {
      return;
    }
    if (profileAutosaveTimerRef.current) {
      clearTimeout(profileAutosaveTimerRef.current);
    }
    profileAutosaveTimerRef.current = setTimeout(() => {
      void handleSaveProfile({ silent: true, autosave: true });
    }, 700);
    return () => {
      if (profileAutosaveTimerRef.current) {
        clearTimeout(profileAutosaveTimerRef.current);
        profileAutosaveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWineryId, token, profileSaving, capacity, address, website, openingHours, tastingPrice, tastingDurationMinutes, wineryDescription, famousFor, wineStyles, winerySignals, experienceRows]);

  const filteredRequests = useMemo(() => {
    if (requestFilter === "all") {
      return requests;
    }
    return requests.filter((item) => item.status === requestFilter);
  }, [requests, requestFilter]);

  if (!authLoading && !user) {
    return (
      <PortalGate
        portalTag="Winery Portal"
        title="Sign in to your estate"
        lead="This portal is restricted to signed-in winery and ops accounts. Log in to review and approve booking requests."
      />
    );
  }

  const navItems: PortalNavItem[] = [
    { key: "requests", label: "Booking requests", icon: "◷", badge: summary.pending || undefined },
    { key: "profile", label: "Estate profile", icon: "▦" },
    { key: "media", label: "Media library", icon: "▤" },
    { key: "availability", label: "Availability", icon: "◔" },
  ];

  const accountName = user?.role === "winery"
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.display_name || wineryName
    : user?.display_name || "Operations";
  const accountRole = user?.role === "winery" ? `${wineryName} · Winery partner` : "Operations · Full access";

  return (
    <>
      <PortalShell
        portalTag="Winery Portal"
        navLabel="Estate"
        navItems={navItems}
        activeKey={view}
        onSelect={(key) => setView(key as View)}
        accountName={accountName}
        accountRole={accountRole}
        kicker="Winery Portal"
        title={
          view === "requests" ? "Booking requests" :
          view === "profile" ? "Estate profile" :
          view === "media" ? "Media library" : "Availability"
        }
        lead={
          view === "requests" ? "Review pending requests and confirm seats for your estate." :
          view === "profile" ? "Keep your estate details, guest signals and experiences current." :
          view === "media" ? "Curate the photography guests see when planning their day." :
          "Manage the tasting slots you offer across the week."
        }
        crossLink={user?.role === "ops" ? { href: "/partner/transport", label: "Transport portal →" } : undefined}
      >
        {error ? <div className="pt-callout pt-callout--error" style={{ marginBottom: 20 }}>{error}</div> : null}

        {user?.role === "ops" && wineries.length > 0 ? (
          <div className="pt-block" style={{ maxWidth: 420 }}>
            <label className="pt-detail__k" htmlFor="winerySelect">Viewing estate</label>
            <select
              id="winerySelect"
              className="pt-select"
              value={selectedWineryId}
              onChange={(event) => setSelectedWineryId(event.target.value)}
              disabled={loading}
            >
              {wineries.map((winery) => (
                <option key={winery.winery_id} value={winery.winery_id}>
                  {winery.name} ({winery.region})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {view === "requests" ? (
          <>
            <div className="pt-stats">
              <div className="pt-stat"><span className="pt-stat__num pt-stat__num--accent">{summary.pending}</span><span className="pt-stat__label">Awaiting your response</span></div>
              <div className="pt-stat"><span className="pt-stat__num">{summary.accepted}</span><span className="pt-stat__label">Accepted</span></div>
              <div className="pt-stat"><span className="pt-stat__num">{summary.declined}</span><span className="pt-stat__label">Declined</span></div>
              <div className="pt-stat"><span className="pt-stat__num">{summary.expired}</span><span className="pt-stat__label">Expired</span></div>
            </div>

            <div className="pt-block__head">
              <div className="pt-seg">
                {([
                  { key: "pending", label: `Pending · ${summary.pending}` },
                  { key: "accepted", label: `Accepted · ${summary.accepted}` },
                  { key: "declined", label: "Declined" },
                  { key: "all", label: "All" },
                ] as const).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`pt-seg__btn ${requestFilter === option.key ? "is-active" : ""}`}
                    onClick={() => setRequestFilter(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-cards">
              {loading ? (
                <div className="pt-empty">Loading requests…</div>
              ) : filteredRequests.length === 0 ? (
                <div className="pt-empty">
                  <div className="pt-empty__mark">◷</div>
                  <p>No {requestFilter === "all" ? "" : requestFilter} requests right now.</p>
                </div>
              ) : (
                filteredRequests.map((item) => {
                  const isPending = item.status === "pending";
                  return (
                    <article key={item.request_id} className="pt-card">
                      <div className="pt-card__top">
                        <div className="pt-card__when">
                          <span className="pt-card__date">{item.booking?.bookingDate ?? "Booking request"}</span>
                          <span className="pt-card__time">{item.booking?.leadName ?? "Guest"}</span>
                        </div>
                        <span className={pillClass(item.status)}>{item.status}</span>
                      </div>
                      <div className="pt-detail">
                        <div className="pt-detail__item"><span className="pt-detail__k">Party</span><span className="pt-detail__v">{item.booking?.partySize ?? "—"} guests</span></div>
                        <div className="pt-detail__item"><span className="pt-detail__k">Pickup</span><span className="pt-detail__v">{item.booking?.pickupLocation ?? "—"}</span></div>
                        <div className="pt-detail__item"><span className="pt-detail__k">Sent via</span><span className="pt-detail__v">{item.sent_channel ?? "—"}</span></div>
                        <div className="pt-detail__item"><span className="pt-detail__k">Sent</span><span className="pt-detail__v">{formatDateTime(item.sent_at)}</span></div>
                      </div>
                      <BookingSafetyNotes booking={item.booking} />
                      <div className="pt-context">
                        <span className="pt-context__dot" aria-hidden="true" />
                        <span>Recipient <strong>{item.sent_recipient ?? "(not configured)"}</strong></span>
                      </div>
                      <div className="pt-card__foot">
                        <span className="pt-card__msg">
                          {isPending ? "Awaiting your response." : item.status === "accepted" ? `Booking ${item.booking_id ?? ""}` : "Resolved."}
                        </span>
                        {isPending ? (
                          <div className="pt-actions">
                            <a className="pt-btn pt-btn--ghost" href={item.action_url} target="_blank" rel="noreferrer">Open magic link</a>
                            <button type="button" className="pt-btn pt-btn--primary" onClick={() => handleApprove(item)} disabled={approvingRequestId === item.request_id}>
                              {approvingRequestId === item.request_id ? "Approving…" : "Accept seat"}
                            </button>
                          </div>
                        ) : (
                          <span className="pt-resolved"><span className="pt-resolved__check">✓</span> {item.status === "accepted" ? `Confirmed ${formatDateTime(item.approved_at)}` : "Declined"}</span>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        ) : null}

        {view === "profile" ? (
          <>
            <div className="pt-block__head">
              <div className="pt-seg">
                {PROFILE_SECTIONS.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    className={`pt-seg__btn ${profileSection === section.key ? "is-active" : ""}`}
                    onClick={() => setProfileSection(section.key)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-panel">
              {profileSection === "basics" ? (
                <>
                  <div className="pt-panel__row">
                    <div className="pt-panel__k"><span className="pt-panel__klabel">Capacity & tasting</span><span className="pt-panel__khint">Guest capacity, price and length of a standard tasting.</span></div>
                    <div className="pt-grid3">
                      <input className="pt-input" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity" aria-label="Guest capacity" />
                      <input className="pt-input" type="number" min={0} step="0.01" value={tastingPrice} onChange={(e) => setTastingPrice(e.target.value)} placeholder="Tasting price (AUD)" aria-label="Tasting price" />
                      <input className="pt-input" type="number" min={1} value={tastingDurationMinutes} onChange={(e) => setTastingDurationMinutes(e.target.value)} placeholder="Length (mins)" aria-label="Tasting length minutes" />
                    </div>
                  </div>
                  <div className="pt-panel__row">
                    <div className="pt-panel__k"><span className="pt-panel__klabel">Famous for</span><span className="pt-panel__khint">The wines or experiences your estate is known for.</span></div>
                    <input className="pt-input" value={famousFor} onChange={(e) => setFamousFor(e.target.value)} placeholder="Cabernet Sauvignon and Chardonnay" />
                  </div>
                  <div className="pt-panel__row">
                    <div className="pt-panel__k"><span className="pt-panel__klabel">Address & website</span><span className="pt-panel__khint">Where guests find you, and where to learn more.</span></div>
                    <div className="pt-stack">
                      <input className="pt-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Caves Rd, Wilyabrup WA 6280" />
                      <input className="pt-input" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
                    </div>
                  </div>
                  <div className="pt-panel__row">
                    <div className="pt-panel__k"><span className="pt-panel__klabel">Opening hours</span><span className="pt-panel__khint">When your cellar door welcomes guests.</span></div>
                    <textarea className="pt-input" rows={3} value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder={"Mon-Fri 10:00-17:00\nSat-Sun 09:00-18:00"} />
                  </div>
                  <div className="pt-panel__row">
                    <div className="pt-panel__k"><span className="pt-panel__klabel">About the estate</span><span className="pt-panel__khint">A short description shown to guests.</span></div>
                    <textarea className="pt-input" rows={4} value={wineryDescription} onChange={(e) => setWineryDescription(e.target.value)} placeholder="Describe your winery, atmosphere, and guest experience." />
                  </div>
                </>
              ) : null}

              {profileSection === "wine-styles" ? (
                <div className="pt-panel__row" style={{ gridTemplateColumns: "1fr", borderBottom: 0, paddingBottom: 0 }}>
                  <div className="pt-panel__k"><span className="pt-panel__klabel">Wine styles</span><span className="pt-panel__khint">Select all that describe your wines.</span></div>
                  <div className="pt-chiprow">
                    {WINE_STYLE_OPTIONS.map((style) => {
                      const on = wineStyles.includes(style);
                      return (
                        <label key={style} className={`pt-chip ${on ? "is-on" : ""}`}>
                          <input type="checkbox" checked={on} onChange={(e) => toggleWineStyle(style, e.target.checked)} />
                          {style}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {WINERY_SIGNAL_GROUPS.filter((group) => group.key === profileSection).map((group) => (
                <div key={group.key} className="pt-panel__row" style={{ gridTemplateColumns: "1fr", borderBottom: 0, paddingBottom: 0 }}>
                  <div className="pt-panel__k"><span className="pt-panel__klabel">{group.heading}</span><span className="pt-panel__khint">{group.key === "advance-notice" ? "Choose the minimum notice you need." : "Select everything that applies."}</span></div>
                  <div className="pt-chiprow">
                    {group.options.map((option) => {
                      const on = winerySignals.includes(option.value);
                      const isAdvance = group.key === "advance-notice";
                      return (
                        <label key={option.value} className={`pt-chip ${on ? "is-on" : ""}`}>
                          <input
                            type={isAdvance ? "radio" : "checkbox"}
                            name={isAdvance ? "advanceNotice" : undefined}
                            checked={on}
                            onChange={(e) => (isAdvance ? setAdvanceNotice(option.value) : toggleWinerySignal(option.value, e.target.checked))}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {profileSection === "experiences" ? (
                <div className="pt-panel__row" style={{ gridTemplateColumns: "1fr", borderBottom: 0, paddingBottom: 0 }}>
                  <div className="pt-panel__k"><span className="pt-panel__klabel">Unique experiences</span><span className="pt-panel__khint">Add bookable experiences and their per-guest price.</span></div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {experienceRows.map((row) => (
                      <div key={row.id} className="pt-exprow">
                        <input className="pt-input" value={row.name} onChange={(e) => updateExperienceRow(row.id, "name", e.target.value)} placeholder="Experience name" />
                        <input className="pt-input" type="number" min={0} step="0.01" value={row.price} onChange={(e) => updateExperienceRow(row.id, "price", e.target.value)} placeholder="Price (AUD)" />
                        <button type="button" className="pt-btn pt-btn--ghost" onClick={() => removeExperienceRow(row.id)}>Remove</button>
                      </div>
                    ))}
                    <div><button type="button" className="pt-btn pt-btn--ghost" onClick={addExperienceRow}>+ Add experience</button></div>
                  </div>
                </div>
              ) : null}

              {profileSection === "password" ? (
                <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 16 }}>
                  <div className="pt-panel__row"><div className="pt-panel__k"><span className="pt-panel__klabel">Current password</span></div><input className="pt-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" /></div>
                  <div className="pt-panel__row"><div className="pt-panel__k"><span className="pt-panel__klabel">New password</span><span className="pt-panel__khint">At least 8 characters.</span></div><input className="pt-input" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></div>
                  <div className="pt-panel__row" style={{ borderBottom: 0, paddingBottom: 0 }}><div className="pt-panel__k"><span className="pt-panel__klabel">Confirm new password</span></div><input className="pt-input" type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" /></div>
                  {passwordError ? <div className="pt-callout pt-callout--error">{passwordError}</div> : null}
                  {passwordMessage ? <div className="pt-callout pt-callout--ok">{passwordMessage}</div> : null}
                  <div className="pt-panel__save"><button type="submit" className="pt-btn pt-btn--primary" disabled={passwordSaving}>{passwordSaving ? "Updating…" : "Update password"}</button></div>
                </form>
              ) : null}

              {profileSection !== "password" ? (
                <div className="pt-panel__save">
                  {profileAutoSaving ? <span className="pt-block__note">Autosaving…</span> : profileSavedAt ? <span className="pt-block__note">Saved {formatDateTime(profileSavedAt)}</span> : <span className="pt-block__note">Autosave enabled</span>}
                  <button type="button" className="pt-btn pt-btn--primary" onClick={() => void handleSaveProfile()} disabled={profileSaving}>{profileSaving ? "Saving…" : "Save changes"}</button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {view === "media" ? (
          <>
            {!storageConfigured ? (
              <div className="pt-callout pt-callout--error" style={{ marginBottom: 18 }}>R2 storage is not configured in the API yet. Add the TM_R2_* app settings to enable uploads.</div>
            ) : null}
            <div className="pt-panel" style={{ marginBottom: 24 }}>
              <div className="pt-panel__row" style={{ borderBottom: 0, paddingBottom: 0 }}>
                <div className="pt-panel__k"><span className="pt-panel__klabel">Add a photo</span><span className="pt-panel__khint">High-quality landscape images look best on cards.</span></div>
                <div style={{ display: "grid", gap: 12 }}>
                  <input className="pt-input" type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                  <input className="pt-input" value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)} placeholder="Caption (optional)" />
                  <div><button type="button" className="pt-btn pt-btn--primary" onClick={handleUploadImage} disabled={!selectedFile || uploading || !storageConfigured}>{uploading ? "Uploading…" : "Upload image"}</button></div>
                </div>
              </div>
            </div>
            <div className="pt-media-grid">
              {mediaAssets.length === 0 ? (
                <div className="pt-empty" style={{ gridColumn: "1 / -1" }}><div className="pt-empty__mark">▤</div><p>No images uploaded yet.</p></div>
              ) : (
                mediaAssets.map((asset, index) => (
                  <div key={asset.media_id} className="pt-media">
                    {index === 0 ? <span className="pt-media__cover">Cover</span> : null}
                    <button type="button" className="pt-media__del" onClick={() => handleDeleteImage(asset.media_id)} disabled={deletingMediaId === asset.media_id} aria-label={`Delete ${asset.file_name}`}>{deletingMediaId === asset.media_id ? "…" : "✕"}</button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.public_url} alt={asset.caption || asset.file_name} loading="lazy" decoding="async" />
                    {asset.caption ? <span className="pt-media__cap">{asset.caption}</span> : null}
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}

        {view === "availability" ? (
          <div className="pt-empty">
            <div className="pt-empty__mark">◔</div>
            <p>Tasting availability is managed by Tailor Moments operations for now.</p>
            <p className="pt-block__note" style={{ marginTop: 8 }}>Reach out to your partner contact to adjust the slots offered for your estate.</p>
          </div>
        ) : null}
      </PortalShell>
      <PortalToast message={toast} show={Boolean(toast)} />
    </>
  );
}
