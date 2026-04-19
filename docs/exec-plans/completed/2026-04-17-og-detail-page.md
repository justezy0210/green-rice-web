# OG Detail Page — Evidence Convergence

Status: active — 2026-04-17

## Problem

Explore 페이지의 OG 드로어에 IRGSP reference, group summary, allele frequency, cultivar gene list가 모두 들어가 있고 synteny까지 추가되면 과밀. Discovery(후보 발견)와 Deep dive(증거 분석)를 분리해야 한다.

## Structure

```
/explore                              Discovery (기존)
  ├─ Trait + Grouping + Categories
  ├─ OG Table (paginated, search, category filter)
  └─ Drawer (경량화)
       ├─ OG ID + IRGSP rep 1줄
       ├─ Group stats (mean, p-value, log2FC)
       ├─ Evidence badges: AF / Synteny / Members 유무
       └─ "View details →" 링크

/explore/og/{ogId}?trait=X&tab=overview    OG Detail (신규)
  ├─ 상단 고정 Header
  │   ├─ ← 뒤로 + Breadcrumb
  │   ├─ OG ID + IRGSP rep (or "Non-IRGSP OG")
  │   ├─ Trait context badge
  │   └─ Evidence availability cards
  │
  ├─ Tab: Overview — 증거 수렴 요약
  ├─ Tab: Allele Frequency — variant table + AF bars
  ├─ Tab: Synteny — (placeholder, HAL 후 구현)
  └─ Tab: Gene Members — per-cultivar gene list
```

## Tasks

1. [ ] Drawer 경량화: AF/cultivar sections 제거 → preview + evidence badges + CTA
2. [ ] Route 추가: `/explore/og/:ogId` in App.tsx
3. [ ] OgDetailPage 생성: header + tab router (URL `tab` param)
4. [ ] Tab: Overview — group summary + evidence availability cards
5. [ ] Tab: Allele Frequency — 기존 OgDrawerAlleleFreqSection 이동
6. [ ] Tab: Gene Members — 기존 OgDrawerCultivarSection 이동
7. [ ] Tab: Synteny — placeholder ("Coming soon")
8. [ ] Drawer "View details →" 링크 연결
9. [ ] 뒤로가기 시 Explore 상태 보존 (URL state)
10. [ ] Arch check + TS verify
