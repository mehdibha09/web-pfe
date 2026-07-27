# DevOps UI Implementation Checklist

- [x] Add DevOps API service wrapper: `src/services/devopsService.ts`
- [x] Create DevOps pages (English UI):
    - [x] `src/views/devops/ServicesPage.tsx`
    - [x] `src/views/devops/EnvironmentsPage.tsx`
    - [x] `src/views/devops/ServiceEnvironmentsPage.tsx`
    - [x] `src/views/devops/DeploymentsPage.tsx`
    - [x] `src/views/devops/MetricsPage.tsx`
- [x] Add placeholder DevOps dashboard: `src/views/devops/DevopsDashboardPage.tsx`
- [x] Convert `DashboardPrincipal.tsx` texts from French → English (partial KPI + alerts + environment health)
- [x] Wire routing for DevOps pages in `src/routes/routes.tsx`
- [x] Wire DevOps pages into sidebar `src/layout/sideBar/components/Body.tsx`
- [x] Run `npm run build`
- [x] Run `npm run lint`

Notes:

- Metrics charts are implemented as lightweight SVG sparklines (no extra chart dependency).
- Current DashboardPrincipal KPIs remain mocked; backend wiring for aggregated KPIs is not implemented because the aggregate endpoints are not specified.
