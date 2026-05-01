# Travellin Bedouin — Backend API Specification

This document is the contract between the frontend and the Python/FastAPI backend.  
The frontend consumes these endpoints exactly as described. Match these shapes precisely.

---

## Base URL

```
http://localhost:8000
```

All routes are prefixed with `/api`.

---

## Authentication

No authentication required for MVP. Add JWT bearer tokens post-MVP.

---

## Common Patterns

### Error response (all endpoints)
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

| Code | HTTP | When |
|---|---|---|
| `session_not_found` | 404 | Session ID does not exist |
| `budget_insufficient` | 400 | Total budget below minimum for destination |
| `destination_restricted` | 400 | Travel advisory level = restricted |
| `agent_failed` | 500 | A specific agent crashed (others may still succeed) |
| `session_expired` | 410 | Session is older than 24 hours |

---

## 1. Session Management

### `POST /api/sessions`

Creates a new trip planning session and immediately triggers all agents.

**Request Body:**
```json
{
  "formData": {
    "originCountry": "Egypt",
    "destinationCountry": "Japan",
    "destinationCity": "Tokyo",
    "departureDate": "2026-06-01",
    "returnDate": "2026-06-08",
    "durationNights": 7,
    "travelers": {
      "adults": 1,
      "children": 0,
      "seniors": 0
    },
    "passportNationality": "Egyptian",
    "totalBudget": 5000,
    "currency": "USD",
    "accommodationPreference": "hotel",
    "transportPreference": "mixed",
    "activityCategories": ["culture", "food", "nature"]
  }
}
```

**Field constraints:**
- `totalBudget`: min 500, max 1,000,000
- `currency`: one of `USD | EUR | GBP | SAR | AED | EGP | JPY`
- `accommodationPreference`: one of `hotel | apartment | chalet | villa | any`
- `transportPreference`: one of `rental_car | dedicated_driver | public_transport | mixed`
- `activityCategories`: array of one or more of `culture | adventure | food | nature | family | nightlife | shopping`
- `travelers.adults`: min 1

**Response `201`:**
```json
{
  "sessionId": "uuid-v4-string",
  "status": "initializing",
  "estimatedDurationSeconds": 35
}
```

---

### `GET /api/sessions/{sessionId}/status`

Polled by the frontend every 2 seconds. Returns the live status of all 5 agents.

**Response `200`:**
```json
{
  "sessionId": "uuid",
  "overallStatus": "running",
  "agents": {
    "budget": {
      "agentId": "budget",
      "status": "completed",
      "progress": 100,
      "thoughts": [
        {
          "timestamp": "2026-06-01T10:00:01.000Z",
          "message": "Received total budget: $5,000 USD",
          "type": "info"
        }
      ],
      "startedAt": "2026-06-01T10:00:00.000Z",
      "completedAt": "2026-06-01T10:00:04.000Z"
    },
    "visa_insurance": {
      "agentId": "visa_insurance",
      "status": "running",
      "progress": 60,
      "thoughts": [...],
      "startedAt": "2026-06-01T10:00:04.000Z",
      "completedAt": null
    },
    "accommodation": { ... },
    "transportation": { ... },
    "activities": { ... }
  }
}
```

**Status values per agent:** `pending | running | completed | failed`  
**`overallStatus`:** `running | completed | failed`  
**`progress`:** integer 0–100  
**`thoughts[].type`:** `info | search | decision | warning`

> **Critical:** `overallStatus` must be `"completed"` only when ALL 5 agents are `"completed"`.
> If one agent fails, `overallStatus` becomes `"failed"` but other agents should still finish if possible.

---

### `GET /api/sessions/{sessionId}/stream` *(SSE — optional, activated by frontend flag)*

Server-Sent Events stream. Used when `NEXT_PUBLIC_USE_SSE=true` on the frontend.

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event format (each thought):**
```
data: {"agentId":"visa_insurance","timestamp":"2026-06-01T10:00:05.000Z","message":"Checking visa requirements...","type":"search"}

```
*(note: blank line after each event)*

**Terminal event:**
```
event: complete
data: {}

```

---

### `POST /api/sessions/{sessionId}/retry`

Re-runs agents that are in `failed` state. Does not restart completed agents.

**Response `200`:** Same shape as `POST /api/sessions` response.

---

## 2. Results Endpoints

> All results endpoints return `404` if the session is not yet completed or does not exist.

---

### `GET /api/sessions/{sessionId}/results/budget`

```json
{
  "totalBudget": 5000,
  "currency": "USD",
  "breakdown": {
    "accommodation": 1750,
    "transportation": 750,
    "activities": 1000,
    "visa_insurance": 250,
    "contingency": 1250
  },
  "percentages": {
    "accommodation": 35,
    "transportation": 15,
    "activities": 20,
    "visa_insurance": 5,
    "contingency": 25
  }
}
```

---

### `GET /api/sessions/{sessionId}/results/visa`

```json
{
  "visaRequirement": {
    "required": true,
    "visaType": "Tourist Visa",
    "processingDays": 5,
    "cost": 30,
    "currency": "USD",
    "applicationUrl": "https://www.mofa.go.jp/j_info/visit/visa/",
    "notes": [
      "Apply at least 2 weeks before travel",
      "Single entry, valid for 90 days"
    ],
    "documentsRequired": [
      "Valid passport (6+ months validity beyond return date)",
      "Confirmed return flight ticket",
      "Hotel booking confirmation",
      "Bank statement (last 3 months)",
      "Detailed travel itinerary"
    ]
  },
  "travelAdvisory": {
    "level": "safe",
    "message": "Japan is currently safe for travel. Standard precautions apply."
  },
  "entryRequirements": [
    "Proof of onward travel required",
    "Sufficient funds: approx. $100/day",
    "Travel health insurance strongly recommended"
  ],
  "insurancePackages": [
    {
      "id": "ins-001",
      "provider": "AXA Travel",
      "planName": "Essential Asia",
      "coverageType": "basic",
      "pricePerPerson": 45,
      "totalPrice": 45,
      "currency": "USD",
      "coverageHighlights": [
        "Medical expenses up to $50,000",
        "Trip cancellation up to $2,000",
        "Baggage loss up to $1,000"
      ],
      "medicalCoverage": 50000,
      "cancellationCoverage": 2000,
      "recommended": false
    },
    {
      "id": "ins-002",
      "provider": "Allianz",
      "planName": "OneTrip Prime",
      "coverageType": "standard",
      "pricePerPerson": 89,
      "totalPrice": 89,
      "currency": "USD",
      "coverageHighlights": ["Medical up to $100K", "Emergency evacuation", "24/7 support"],
      "medicalCoverage": 100000,
      "cancellationCoverage": 5000,
      "recommended": true
    }
  ]
}
```

**`travelAdvisory.level`:** `safe | caution | warning | restricted`  
**`insurancePackages[].coverageType`:** `basic | standard | premium`

---

### `GET /api/sessions/{sessionId}/results/accommodation`

```json
{
  "budgetAllocated": 1750,
  "currency": "USD",
  "recommendation": "Mid-range hotels in Shinjuku offer the best value...",
  "options": [
    {
      "id": "acc-001",
      "name": "Shinjuku Granbell Hotel",
      "type": "hotel",
      "starRating": 4,
      "pricePerNight": 185,
      "totalPrice": 1295,
      "currency": "USD",
      "location": {
        "address": "2-14-5 Kabukicho, Shinjuku, Tokyo",
        "distanceFromCenter": 0.4,
        "coordinates": { "lat": 35.6938, "lng": 139.7034 }
      },
      "amenities": ["Free WiFi", "Rooftop Bar", "City View", "Concierge"],
      "images": ["https://..."],
      "bookingUrl": "https://booking.com/...",
      "rating": 8.7,
      "reviewCount": 2341,
      "recommended": true
    }
  ]
}
```

**`options[].type`:** `hotel | apartment | chalet | villa`  
**`options[].starRating`:** integer 1–5  
**`options[].rating`:** float 1.0–10.0 (guest rating)

---

### `GET /api/sessions/{sessionId}/results/transport`

```json
{
  "budgetAllocated": 750,
  "currency": "USD",
  "recommendation": "Metro pass + rideshare for late nights is optimal...",
  "options": {
    "rental_car": [
      {
        "id": "tr-car-001",
        "category": "rental_car",
        "provider": "Toyota Rent a Car",
        "description": "Toyota Corolla — Compact, automatic",
        "priceTotal": 490,
        "currency": "USD",
        "pricingModel": "per_day",
        "priceUnit": 70,
        "durationDays": 7,
        "features": ["Full insurance", "GPS included", "Free cancellation 48h"],
        "recommended": false,
        "bookingUrl": "https://..."
      }
    ],
    "dedicated_driver": [...],
    "metro_pass": [...],
    "uber_estimate": [...],
    "minibus": [...]
  }
}
```

**`options` keys (all must be present, empty array if none found):**  
`rental_car | dedicated_driver | metro_pass | uber_estimate | minibus`

**`pricingModel`:** `per_day | fixed | per_trip | per_person`

---

### `GET /api/sessions/{sessionId}/results/activities`

```json
{
  "budgetAllocated": 1000,
  "currency": "USD",
  "recommendation": "Tokyo offers a rich mix of culture and nature...",
  "activities": [
    {
      "id": "act-001",
      "name": "TeamLab Borderless Digital Art Museum",
      "category": "culture",
      "description": "Immersive digital art installation...",
      "duration": "half_day",
      "price": 32,
      "priceType": "per_person",
      "currency": "USD",
      "location": "Odaiba, Tokyo",
      "rating": 9.4,
      "reviewCount": 45000,
      "included": ["Museum entry", "All installations access"],
      "bookingUrl": "https://...",
      "images": ["https://..."],
      "recommended": true,
      "dayRecommended": 2
    }
  ],
  "suggestedItinerary": [
    {
      "day": 1,
      "date": "2026-06-01",
      "activities": ["act-002"],
      "freeTime": "Evening: Shibuya Crossing (free)"
    }
  ]
}
```

**`activities[].duration`:** `half_day | full_day | evening | multi_day`  
**`activities[].priceType`:** `per_person | per_group`  
**`activities[].category`:** one of the user's selected `activityCategories` + any bonus categories

---

### `GET /api/sessions/{sessionId}/results/full`

Returns all results in a single response. Use this for the results page initial load.

```json
{
  "sessionId": "uuid",
  "formData": { ... },
  "budget": { ... },
  "visa": { ... },
  "accommodation": { ... },
  "transport": { ... },
  "activities": { ... }
}
```

---

## 3. Agent Behavior Contract

### Sequencing (REQUIRED)

```
User submits form
       │
       ▼
  Budget Agent runs FIRST
  (reads formData.totalBudget, distributes it)
       │
  Budget completes
       │
  ┌────┼────┬────┬────┐
  ▼    ▼    ▼    ▼    ▼
 Visa Acc  Trns Act  (all 4 run in parallel)
```

- Budget Agent **must complete** before the other 4 are dispatched.
- The 4 downstream agents receive their budget allocation from Budget Agent output.
- Each downstream agent operates independently; one failure does not cancel others.

### Thought Log Requirements

The `thoughts` array is returned in `/status` and must grow as the agent progresses.  
Each thought must have a real `timestamp`. Thoughts accumulate — do not clear old ones.

| Agent | Expected thought types |
|---|---|
| `budget` | `info` (received budget), `search` (cost-of-living lookup), `decision` (each category allocation) |
| `visa_insurance` | `search` (visa DB lookup), `info` (advisory fetch), `decision` (insurance recommendations) |
| `accommodation` | `search` (property search), `decision` (filter by budget + rating), `warning` (if budget tight) |
| `transportation` | `search` (per category), `decision` (recommendation), `info` (pricing model) |
| `activities` | `search` (activity lookup by category), `decision` (itinerary assignment), `info` (free options found) |

Minimum thoughts per agent: **5**. Aim for 7–10 for a realistic feed.

### Progress Reporting

`progress` must increase monotonically from 0 to 100 as the agent works.  
Emit at least 5 distinct progress updates. Example milestones:

| Milestone | Progress |
|---|---|
| Agent started | 5 |
| First search completed | 20 |
| Core processing underway | 50 |
| Results ranked | 80 |
| Agent done | 100 |

---

## 4. CORS

Allow the frontend origin:
```python
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
```

---

## 5. Recommended FastAPI Structure

```
backend/
├── main.py                    # FastAPI app + CORS
├── routers/
│   ├── sessions.py            # POST /api/sessions, GET status, SSE stream, retry
│   └── results.py             # GET results/* endpoints
├── agents/
│   ├── orchestrator.py        # Dispatches agents, manages session state
│   ├── budget_agent.py        # Budget Agent logic
│   ├── visa_agent.py          # Visa & Insurance Agent
│   ├── accommodation_agent.py # Accommodation Agent
│   ├── transport_agent.py     # Transportation Agent
│   └── activities_agent.py   # Activities Agent
├── models/
│   ├── session.py             # Pydantic models for session + form data
│   ├── results.py             # Pydantic models for all result types
│   └── agents.py              # AgentState, AgentThought models
├── storage/
│   └── session_store.py       # In-memory dict (Redis for production)
└── requirements.txt
```

### Session Storage

Use an in-memory dict for MVP:
```python
sessions: dict[str, SessionState] = {}
```

Where `SessionState` holds the `formData`, all `AgentState` objects, and all results.  
Upgrade to Redis for production (sessions expire after 24h).

### Recommended Libraries

```
fastapi
uvicorn[standard]
groq          # LLM inference (already configured via GROQ_API_KEY)
httpx         # Async HTTP for external API calls
pydantic      # Data validation (built into FastAPI)
asyncio       # For parallel agent execution
sse-starlette # Server-Sent Events support
```

### Parallel Agent Execution (Python)

```python
import asyncio

async def run_downstream_agents(session_id: str, budget: BudgetAllocation):
    await asyncio.gather(
        run_visa_agent(session_id, budget),
        run_accommodation_agent(session_id, budget),
        run_transport_agent(session_id, budget),
        run_activities_agent(session_id, budget),
    )
```

---

## 6. Environment Variables (Backend)

```bash
GROQ_API_KEY=...                  # Already set
GROQ_MODEL=mistral-saba-24b        # Recommended model
SESSION_TTL_SECONDS=86400         # 24 hours
CORS_ORIGINS=http://localhost:3000
```
