# NagarDrishti AI — Municipal Civic Intelligence System

Full-stack workspace structured into decoupled **frontend** and **backend** services.

```text
nagardristhi_auth/
├── backend/                  # FastAPI Civic Intelligence API & Data Store
│   ├── app/
│   │   ├── models/           # Pydantic schemas (Complaints, Hotspots, Stats)
│   │   ├── routers/          # API endpoints (/complaints, /dashboard, /departments)
│   │   └── services/         # State store & seed dataset
│   ├── main.py               # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   ├── run.py                # Backend server runner (port 8000)
│   └── .env                  # Backend configuration
│
├── frontend/                 # React 19 + TypeScript + Vite + TailwindCSS 4
│   ├── src/                  # Authority portal UI, pages, Leaflet maps & charts
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.ts        # Dev server & API proxy to port 8000
│   └── .env                  # Frontend configuration (port 5174)
│
├── package.json              # Root workspace scripts runner
└── README.md                 # Workspace documentation
```

---

## 🚀 Quick Start

### 1. Start Backend (Terminal 1)
```bash
npm run dev:backend
# Or: python3 backend/run.py
```
- API Base: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`

### 2. Start Frontend (Terminal 2)
```bash
npm run dev
# Or: npm run dev:frontend
```
- Authority Portal: `http://localhost:5174`

---

## 🏛️ System Features
- **Command Center Dashboard**: Live KPIs, category distributions, daily inflow trends.
- **GIS Map Intelligence**: Real-time Leaflet map with markers, clusters, and canvas heatmaps.
- **Hotspot Intelligence**: Automated corridor clustering, dominant issue detection, and action suggestions.
- **Complaint Queue & Triage**: Searchable and filterable queue with deep inspection drawer and lifecycle status updates.
