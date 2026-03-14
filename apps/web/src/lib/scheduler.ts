import {
  type ItineraryPlan,
  type TourRequest,
  type Winery,
} from "@/lib/demo-data";

const travelMatrix: Record<string, Record<string, number>> = {
  "margaret-river-visitor-centre": {
    "leeuwin-coast": 18,
    "redgate-ridge": 14,
    "caves-road-cellars": 12,
    "yallingup-hills": 28,
    "dunsborough-town-centre": 36,
    "prevelly-beach": 16,
    "busselton-jetty": 43,
  },
  "dunsborough-town-centre": {
    "leeuwin-coast": 42,
    "redgate-ridge": 38,
    "caves-road-cellars": 18,
    "yallingup-hills": 16,
    "margaret-river-visitor-centre": 36,
    "prevelly-beach": 47,
    "busselton-jetty": 28,
  },
  "prevelly-beach": {
    "leeuwin-coast": 24,
    "redgate-ridge": 18,
    "caves-road-cellars": 28,
    "yallingup-hills": 41,
    "margaret-river-visitor-centre": 16,
    "dunsborough-town-centre": 47,
    "busselton-jetty": 55,
  },
  "busselton-jetty": {
    "leeuwin-coast": 58,
    "redgate-ridge": 54,
    "caves-road-cellars": 34,
    "yallingup-hills": 31,
    "margaret-river-visitor-centre": 43,
    "dunsborough-town-centre": 28,
    "prevelly-beach": 55,
  },
  "leeuwin-coast": {
    "redgate-ridge": 12,
    "caves-road-cellars": 24,
    "yallingup-hills": 38,
    "margaret-river-visitor-centre": 18,
  },
  "redgate-ridge": {
    "leeuwin-coast": 12,
    "caves-road-cellars": 20,
    "yallingup-hills": 33,
    "margaret-river-visitor-centre": 14,
  },
  "caves-road-cellars": {
    "leeuwin-coast": 24,
    "redgate-ridge": 20,
    "yallingup-hills": 19,
    "margaret-river-visitor-centre": 12,
  },
  "yallingup-hills": {
    "leeuwin-coast": 38,
    "redgate-ridge": 33,
    "caves-road-cellars": 19,
    "margaret-river-visitor-centre": 28,
  },
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function travelMinutes(fromId: string, toId: string) {
  return travelMatrix[fromId]?.[toId] ?? 45;
}

function toPickupId(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildItineraryPlans(
  request: TourRequest,
  wineries: Winery[],
): ItineraryPlan[] {
  const wineryMap = new Map(wineries.map((winery) => [winery.id, winery]));
  const selected = request.wineries
    .map((id) => wineryMap.get(id))
    .filter((winery): winery is Winery => Boolean(winery));

  const candidates = [
    [...selected].sort((a, b) => a.driveMinutesFromCity - b.driveMinutesFromCity),
    [...selected].sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name)),
  ];

  const uniqueOrders = candidates.filter((order, index, all) => {
    const key = order.map((item) => item.id).join(",");
    return index === all.findIndex((candidate) => candidate.map((item) => item.id).join(",") === key);
  });

  return uniqueOrders.map((order, index) => {
    let currentTime = timeToMinutes(index === 0 ? "09:30" : "10:15");
    const pickupId = toPickupId(request.pickup);
    let previousId = pickupId;
    let totalDriveMinutes = 0;

    const stops = order.map((winery) => {
      const drive = travelMinutes(previousId, winery.id);
      currentTime += drive;

      const chosenSlot = winery.availableSlots.find((slot) => timeToMinutes(slot) >= currentTime)
        ?? winery.availableSlots[winery.availableSlots.length - 1];

      const arrivalMinutes = timeToMinutes(chosenSlot);
      const departureMinutes = arrivalMinutes + winery.tastingDurationMinutes;

      totalDriveMinutes += drive;
      previousId = winery.id;
      currentTime = departureMinutes + 15;

      return {
        wineryId: winery.id,
        wineryName: winery.name,
        arrival: chosenSlot,
        departure: minutesToTime(departureMinutes),
        driveFromPreviousMinutes: drive,
      };
    });

    if (order.length > 0) {
      totalDriveMinutes += travelMinutes(order[order.length - 1].id, pickupId);
    }

    const firstArrival = stops[0]?.arrival ?? "10:00";
    const lastDeparture = stops[stops.length - 1]?.departure ?? "16:00";

    return {
      title: index === 0 ? "Most convenient itinerary" : "Balanced regional itinerary",
      summary:
        index === 0
          ? "Minimises drive time and gives the group a smooth morning start."
          : "Clusters venues by region to keep the story strong for partners.",
      totalDriveMinutes,
      transportWindow: `${minutesToTime(timeToMinutes(firstArrival) - 45)} - ${minutesToTime(timeToMinutes(lastDeparture) + 60)}`,
      score: Math.max(82, 95 - index * 4 - Math.round(totalDriveMinutes / 20)),
      stops,
    };
  });
}

