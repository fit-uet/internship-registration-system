# Frontend architecture

The frontend uses a feature-based architecture. Route access is centralized, while each screen lives in the feature that owns its business role.

```text
src/
├── app/
│   └── AppRoutes.tsx          # Route table and route guards
├── auth/
│   └── access.ts              # Role predicates and access policy
├── features/
│   ├── student/pages/         # Student-only screens
│   ├── lecturer/pages/        # Lecturer-only screens
│   ├── admin/pages/           # Administration screens
│   └── shared/pages/          # Screens shared by multiple roles
├── shared/
│   └── index.tsx              # Reusable configuration, utilities and UI helpers
├── App.tsx                    # Authentication and application shell
└── main.tsx                   # Browser entry point
```

## Dependency rules

1. `App.tsx` owns authentication state and the global shell only.
2. `app/AppRoutes.tsx` is the only place that maps URLs to screens and role policies.
3. A role feature may import from `shared`, but it must not import a page from another role.
4. Shared multi-role screens belong in `features/shared`.
5. New screens should be added as one file under the appropriate `pages` directory and exported from that feature's `index.ts`.
6. Authorization must still be enforced by the API. Frontend route guards only control navigation and presentation.

## UI design system (Apple HIG Standard)

The entire application adheres to the **Apple Human Interface Guidelines (HIG)** design philosophy while preserving the signature FIT UET blue header gradient:

- **Comprehensive Design Specification**: Detailed guidelines live in [`docs/UI_DESIGN_SYSTEM.md`](docs/UI_DESIGN_SYSTEM.md).
- **Global Tokens**: Defined in `src/index.css` following Apple System Palette:
  - Canvas: Apple System Gray 6 (`#F5F5F7`).
  - Cards / Surfaces: Pure White (`#FFFFFF`) with 16 px squircle radius (`rounded-2xl`), hairline border (`rgba(0,0,0,0.08)` or `#E5E5EA`), and soft multi-layered ambient shadows.
  - Header: Preserved FIT UET gradient (`linear-gradient(110deg, #064889 0%, #075fc7 62%, #1473e6 100%)`).
  - Typography: San Francisco scale (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif`) with strict hierarchy from Large Title down to Caption.
- **Zero Redundancy**: Avoid repeating headers, duplicate badges, or redundant sub-toolbars on the same view.
- **Controls & Components**:
  - Buttons use 36-40 px height, 10-12 px squircle radius, and subtle active scale feedback (`active:scale-[0.98]`).
  - Tables use macOS Inset Table styling (subtle header, hairline horizontal dividers, smooth 120ms hover highlight).
  - Floating sheets and modal reviews use single-line headers, blurred backdrops (`backdrop-blur-md`), and edge-to-edge content viewers.
- **Reusable UI primitives**: Live in `src/shared/ui` and are exported through `src/shared/index.tsx`.

The backend remains compatible with both the Node server and Cloudflare Worker entry points; this refactor intentionally does not change API contracts or business behavior.
