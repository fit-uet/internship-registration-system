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

## UI design system

- Global visual tokens and cross-screen element rules live in `index.css`.
- Reusable UI primitives live in `shared/ui` and are exported through `shared/index.tsx`.
- Use `Button`, `Surface`, `PageHeader` and `FormField` for new screens instead of repeating long Tailwind class strings.
- Product screens should use the shared blue brand palette; green, amber and red are reserved for semantic success, warning and error states.
- Controls use a 40 px default height, 12 px radius and one shared focus ring. Cards use a 16 px radius and the shared surface shadow.
- Every route is rendered inside `feature-page`, which provides consistent typography, forms, tables, focus behavior and responsive spacing across roles.

The backend remains compatible with both the Node server and Cloudflare Worker entry points; this refactor intentionally does not change API contracts or business behavior.
