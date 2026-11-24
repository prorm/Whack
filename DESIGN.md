---
name: CAPABLE
description: Career exploration, practical learning, and reviewed work samples.
colors:
  forest: "#182d23"
  gold: "#f9cc5d"
  paper: "#f7f6ef"
  surface: "#fffcf5"
  ink: "#20251c"
  muted: "#515649"
  divider: "#d2d1c2"
  light-text: "#fffbed"
typography:
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 5.3vw, 4.55rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "clamp(1.45rem, 2.5vw, 2.15rem)"
    fontWeight: 800
    lineHeight: 1.16
    letterSpacing: "-.035em"
  title:
    fontSize: "1.12rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-.025em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    lineHeight: 1.55
  label:
    fontSize: ".76rem"
    fontWeight: 750
rounded:
  control: ".62rem"
  panel: ".9rem"
  hero: "1.1rem"
  field: ".52rem"
  filter: "1.4rem"
spacing:
  row-inset: "1rem"
  panel-inset: "1.2rem"
  region-gap: "2.4rem"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: ".65rem .9rem"
  button-accent:
    backgroundColor: "{colors.gold}"
    textColor: "#241d12"
    rounded: "{rounded.control}"
    padding: ".65rem .9rem"
  button-secondary:
    textColor: "{colors.forest}"
    rounded: "{rounded.control}"
    padding: ".65rem .9rem"
  job-field:
    backgroundColor: "#fffef9"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: ".62rem .7rem"
  role-filter:
    backgroundColor: "{colors.surface}"
    textColor: "#2c422e"
    rounded: "{rounded.filter}"
    padding: ".55rem .85rem"
  role-filter-selected:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.filter}"
    padding: ".55rem .85rem"
  detail-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-inset}"
---

# Design System: CAPABLE

## Overview

**Creative North Star: "Role-based practice"**

Lead with the work a learner will perform. Keep role requirements and next actions close together. In lessons, preserve room for the task explanation, worksheet, and review evidence.

**Key Characteristics:**

- Warm paper, deep forest, and golden action accents.
- Work imagery that depicts the task.
- Thin dividers, quietly outlined cards, and generous tap targets.

## Colors

### Primary

Forest anchors summaries, the home hero, selected filters, and primary controls on paper. Light text provides contrast on forest.

### Secondary

Gold highlights an action on a dark surface and marks a saved role.

### Neutral

Paper is the page canvas. The lighter surface holds forms and notes. Ink is for primary copy, muted ink is for supporting copy, and the divider gives a row or region its edge.

## Typography

Manrope is the display and body face. The Latin variable font is bundled with the app. System fonts support remaining scripts, with Nirmala UI also specified in the learning shell. The [font license](app/public/media/careers/manrope-OFL.txt) ships with the app.

- Use the display size for the home promise and large page headings. At the narrow breakpoint the home heading scales from 1.9rem to 3.4rem.
- Use section headings to separate major tasks. Use title-sized role names above smaller role metadata and summaries.
- Keep the home introduction at a readable measure of 40ch.

## Layout

The career wrapper caps at 75rem. At desktop widths, the home hero uses two nearly equal columns and role detail gives more space to the task than the summary. At 49rem, these grids become one column and the wrapper leaves one rem per side. The work sample and its start action sit above the practice instructions at that width. At 35rem, role actions wrap beneath text and the job form becomes one column.

## Elevation & Depth

Use color, separators, and bordered surfaces to distinguish information groups. The hero image caption uses a localized dark gradient to keep its link readable.

## Shapes

Buttons and fields have lightly rounded corners. Panels have a slightly larger radius. Role filters use a pill shape. The home hero clips its copy and image into one silhouette.

## Components

- **Buttons** use a descriptive verb and a minimum 44px action area. Use filled forest on paper, gold in the dark hero, and an outline for a secondary action. Keep the dark gold keyboard focus ring visible on career pages.
- **Role filters** wrap and show selection with a forest fill, light text, and a pressed state.
- **Job fields** pair a persistent label with an outlined input and a 46px minimum height.
- **Notes and summaries** use lightly rounded surfaces. The pale panel contains notes and forms. The forest summary groups work-sample details and the next action.
- **Navigation** uses compact text links. The active page is underlined, and the bar can wrap on narrow screens.
- **Task imagery** uses the app's generated inventory asset [source](moonshot/media/image-lite.png), cropped for the shipped [hero image](app/public/media/careers/inventory-counter.webp). The caption and link remain available when Offline delivery omits the image.

## Do's and Don'ts

- **Do** label demo roles and preserve the visible review status of work samples.
- **Do** keep the main action visible when imagery is unavailable.
- **Do** retain wrapping controls and visible keyboard focus throughout the learning path.
