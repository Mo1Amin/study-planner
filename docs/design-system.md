# Munazzami design system

Munazzami is a calm study desk for Arabic-speaking students. The interface should feel like a dependable instrument: quiet enough to focus, but clear about deadlines, time, and completed work.

## Visual direction

- Cool paper and slate replace a generic cream-and-serif study aesthetic.
- Deep green carries the focus actions; muted blue marks fixed appointments; sand and coral identify urgency.
- The weekly schedule remains the main planning surface. Relationship maps use dotted paper so arrows and clusters read as working notes.
- Motion only explains a state change or direct feedback. No ambient movement, gradients, or decorative glass effects.

## Tokens

| Role | Light | Dark |
|---|---|---|
| Page | `#f4f7f5` | `#17211f` |
| Surface | `#ffffff` | `#202d2a` |
| Primary ink | `#20312f` | `#e2ebe7` |
| Focus | `#1e5149` | `#b5dacf` |
| Appointment | `#577d99` | `#9cbcd0` |
| Caution | `#a97742` | `#d4af80` |
| Overdue | `#ae5d51` | `#e09a8f` |

CSS custom properties live in `src/styles.css`. Components use a small radius for controls, a larger radius only for sections, and thin borders instead of repeating card shadows.

## Type and layout

- Use IBM Plex Sans Arabic when it is available, then the platform's Arabic-capable UI font.
- Keep supporting copy short and use a stable type scale instead of decorative labels.
- The desktop navigation sits on the right in RTL order. On narrow screens it becomes a four-item bottom bar.
- Use one clear primary action per view. Keep task, subject, and event forms next to the list they change.

## Interaction

- Keyboard focus stays visible. The relationship map supports arrow-key movement as well as touch or pointer dragging.
- Respect `prefers-reduced-motion`.
- Planned and completed sessions are different states. Only completed sessions count toward reported study time.
- The automatic planner should explain work it could not fit instead of silently overbooking a day.

The project includes the [frontend-design skill](../.agents/skills/frontend-design/SKILL.md) for future interface work.
