# Tailor Moments V1 REST Contract

Base path:
- `/api/v1`

## Priority endpoints

### POST `/api/v1/itinerary/recommend`
Input:
- booking date
- party size
- pickup location
- preferred wineries/region

Must return structured JSON including:
- `expert_pick` boolean
- `justification` string

### POST `/api/v1/bookings`
Create a booking request.

### GET `/api/v1/bookings/{bookingId}`
Fetch one booking and its current itinerary state.

### POST `/api/v1/action-tokens/{tokenId}/approve`
Approve winery participation through a magic link.

### POST `/api/v1/action-tokens/{tokenId}/accept`
Accept a transport job through a magic link.

### GET `/api/v1/action-tokens/{tokenId}`
Validate token state and show one-click action page context.

### GET `/api/v1/exception-queue`
Return unresolved ops exceptions.

### POST `/api/v1/exception-queue/{bookingId}/ai-suggestion`
Ask OpenAI for the next best replacement winery or itinerary recovery option.

## Notes
- All mutating endpoints should be RESTful and JSON-based.
- Magic-link endpoints must validate expiry and status before taking action.
- Turnstile should protect public booking/request creation endpoints.
