export type Winery = {
  id: string;
  name: string;
  region: string;
  driveMinutesFromCity: number;
  tastingDurationMinutes: number;
  availableSlots: string[];
  capacity: number;
  status: "Auto-confirm" | "Manual review";
  notes: string;
};

export type BookingStage =
  | "Draft"
  | "Needs winery confirmation"
  | "Transport planning"
  | "Confirmed";

export type TransportProvider = {
  id: string;
  name: string;
  fleet: string;
  serviceArea: string;
  rating: number;
  nextAvailability: string;
  status: "Available" | "Busy soon";
};

export type TourRequest = {
  guestName: string;
  date: string;
  partySize: number;
  pickup: string;
  wineries: string[];
};

export type BookingRecord = {
  id: string;
  label: string;
  stage: BookingStage;
  request: TourRequest;
};

export type PickupOption = {
  id: string;
  label: string;
  note: string;
};

export type ItineraryStop = {
  wineryId: string;
  wineryName: string;
  arrival: string;
  departure: string;
  driveFromPreviousMinutes: number;
};

export type ItineraryPlan = {
  title: string;
  summary: string;
  totalDriveMinutes: number;
  transportWindow: string;
  score: number;
  stops: ItineraryStop[];
};

export type TransportJob = {
  id: string;
  date: string;
  pickupTime: string;
  routeLabel: string;
  passengers: number;
  vehicleType: string;
  payout: string;
  status: "Open" | "Accepted" | "Needs review";
  recommendedProvider: string;
};

export const wineries: Winery[] = [
  {
    id: "leeuwin-coast",
    name: "Leeuwin Coast Estate",
    region: "Wilyabrup",
    driveMinutesFromCity: 18,
    tastingDurationMinutes: 75,
    availableSlots: ["10:00", "11:45", "14:15"],
    capacity: 10,
    status: "Auto-confirm",
    notes: "Premium tasting room south of town, ideal first stop for a polished Margaret River day.",
  },
  {
    id: "redgate-ridge",
    name: "Redgate Ridge",
    region: "Redgate",
    driveMinutesFromCity: 14,
    tastingDurationMinutes: 60,
    availableSlots: ["11:00", "13:15", "15:00"],
    capacity: 12,
    status: "Manual review",
    notes: "Known for grazing platters and afternoon tastings, but prefers to review group requests.",
  },
  {
    id: "caves-road-cellars",
    name: "Caves Road Cellars",
    region: "Cowaramup",
    driveMinutesFromCity: 12,
    tastingDurationMinutes: 90,
    availableSlots: ["09:45", "12:15", "14:30"],
    capacity: 8,
    status: "Auto-confirm",
    notes: "Boutique seated tasting experience with strong appeal for couples and small groups.",
  },
  {
    id: "yallingup-hills",
    name: "Yallingup Hills Winery",
    region: "Yallingup Siding",
    driveMinutesFromCity: 48,
    tastingDurationMinutes: 75,
    availableSlots: ["10:30", "12:30", "15:15"],
    capacity: 14,
    status: "Manual review",
    notes: "A strong group venue north of Margaret River, with 24-hour notice preferred for food pairings.",
  },
];

export const transportProviders: TransportProvider[] = [
  {
    id: "cape-to-vine",
    name: "Cape to Vine Transfers",
    fleet: "2 x 11-seat Mercedes vans",
    serviceArea: "Margaret River, Wilyabrup, Yallingup",
    rating: 4.9,
    nextAvailability: "Available from 09:00",
    status: "Available",
  },
  {
    id: "forest-coast-shuttle",
    name: "Forest Coast Shuttle",
    fleet: "Mini bus + executive SUV",
    serviceArea: "Town, coast, and lunch-transfer runs",
    rating: 4.7,
    nextAvailability: "Busy from 13:30",
    status: "Busy soon",
  },
  {
    id: "south-west-charters",
    name: "South West Charters",
    fleet: "14-seat midi coach",
    serviceArea: "Corporate groups and private wine tours",
    rating: 4.8,
    nextAvailability: "Available from 08:30",
    status: "Available",
  },
];

export const sampleRequest: TourRequest = {
  guestName: "Alicia & friends",
  date: "Friday, 10 April",
  partySize: 6,
  pickup: "Margaret River Visitor Centre",
  wineries: ["caves-road-cellars", "leeuwin-coast", "redgate-ridge"],
};

export const sampleBookings: BookingRecord[] = [
  {
    id: "booking-alicia",
    label: "Alicia & friends",
    stage: "Needs winery confirmation",
    request: sampleRequest,
  },
  {
    id: "booking-harper",
    label: "Harper family",
    stage: "Transport planning",
    request: {
      guestName: "Harper family",
      date: "Saturday, 11 April",
      partySize: 10,
      pickup: "Dunsborough Town Centre",
      wineries: ["yallingup-hills", "caves-road-cellars", "leeuwin-coast"],
    },
  },
  {
    id: "booking-jules",
    label: "Jules anniversary",
    stage: "Draft",
    request: {
      guestName: "Jules anniversary",
      date: "Sunday, 12 April",
      partySize: 4,
      pickup: "Prevelly Beach",
      wineries: ["redgate-ridge", "leeuwin-coast"],
    },
  },
];

export const pickupOptions: PickupOption[] = [
  {
    id: "margaret-river-visitor-centre",
    label: "Margaret River Visitor Centre",
    note: "Best default for couples and small groups staying in town.",
  },
  {
    id: "dunsborough-town-centre",
    label: "Dunsborough Town Centre",
    note: "Useful for guests staying north of the main winery cluster.",
  },
  {
    id: "prevelly-beach",
    label: "Prevelly Beach",
    note: "A strong pickup for coastal accommodation and premium south-side tours.",
  },
  {
    id: "busselton-jetty",
    label: "Busselton Jetty",
    note: "Longer transfer but realistic for airport-linked and family groups.",
  },
];

export const transportJobs: TransportJob[] = [
  {
    id: "TM-204",
    date: "10 Apr",
    pickupTime: "09:15",
    routeLabel: "Visitor Centre -> Caves Road Cellars -> Leeuwin Coast -> Visitor Centre",
    passengers: 6,
    vehicleType: "Premium van",
    payout: "$540",
    status: "Open",
    recommendedProvider: "Cape to Vine Transfers",
  },
  {
    id: "TM-198",
    date: "09 Apr",
    pickupTime: "10:00",
    routeLabel: "Dunsborough -> Yallingup Hills -> Caves Road Cellars -> Dunsborough",
    passengers: 8,
    vehicleType: "Mini bus",
    payout: "$620",
    status: "Accepted",
    recommendedProvider: "South West Charters",
  },
  {
    id: "TM-207",
    date: "11 Apr",
    pickupTime: "11:30",
    routeLabel: "Prevelly -> Redgate Ridge -> private lunch -> Prevelly",
    passengers: 10,
    vehicleType: "Midi coach",
    payout: "$710",
    status: "Needs review",
    recommendedProvider: "Forest Coast Shuttle",
  },
];
