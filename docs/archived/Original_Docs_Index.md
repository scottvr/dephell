# Dependency Hell MVP Documentation

This folder turns the original treatment and gameplay mockups into an MVP-ready documentation set for design, product, engineering, art, and audio.

Source references:

- [Game treatment](../Dependency_Hell-Game_Treatment.md)
- [Gameplay mockup 1](../docs/concept-art/DependencyHell-gameplay-mockss1.jpg): baseline combat HUD, log column, dependency minimap
- [Gameplay mockup 2](../docs/concept-art/DependencyHell-gameplay-mockss2.jpg): package/upgrade selection overlaid on the action view
- [Gameplay mockup 3](../docs/concept-art/DependencyHell-gameplay-mockss3.jpg): postmortem summary and failure timeline
- [Gameplay mockup 4](../docs/concept-art/DependencyHell-gameplay-mockss4.jpg): graph collapse, build failure, critical failure state

There is descriptive text of what each mock screenshot (above) is intended to convey, in that same directory along side the images, with the same name as the image file, but as '.txt' instead of '.jpg'. (e.g., "DependencyHell-gameplay-mockss[1-4].jpg => DependencyHell-gameplay-mockss[1-4].txt)  We like the design language of these mocks. We only implemented a rough approximation in the prototype (now in the in-development mvp of this branch.)

Recommended reading order:

1. [MVP Game Design Document](./MVP_Game_Design_Document.md)
2. [MVP Product Plan](./MVP_Product_Plan.md)
3. [MVP Sprint Plan](./MVP_Sprint_Plan.md)
4. [MVP Implementation And Art Brief](./MVP_Implementation_And_Art_Brief.md)
5. [MVP Content Matrix](./MVP_Content_Matrix.md)
6. [MVP Starter Backlog](./MVP_Starter_Backlog.md)
7. [Open Questions And Risks](./Open_Questions_And_Risks.md)
8. [Content Coherence Model](./Content_Coherence_Model.md)

MVP thesis:

Dependency Hell is a room-based action roguelite where upgrades mutate a live dependency graph. The prototype succeeds if players can understand that their package choices create both power and future risk, then lose or win in ways that feel funny, legible, and traceable to earlier decisions.

## Visual Smoke Checks

The prototype is still zero-build and can be opened directly from `index.html`. For repeatable UI review with an installed Chrome-compatible browser, run:

```sh
node scripts/visual-smoke.js
```

The script launches a temporary headless browser, serves the repo locally, and writes desktop screenshots for the main view, package choice, graph view, route choice, and report states to `artifacts/visual-smoke/`.
