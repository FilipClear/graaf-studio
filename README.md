# Graaf studio

Run `npm run dev`, then visit http://127.0.0.1:5173.

Run `npm run build` to generate the deployable static site in `build/`. Upload the contents of that folder to the root of your static host. Directory indexes support `/work` and `/book` without custom routing. The build includes all local fonts, scripts, and artwork; the booking calendar still loads from Cal.com.

View work opens a full-screen gallery over the mounted homepage and updates the URL to `/work`. Closing it, pressing Escape, or using Back reveals the original scroll position and FAQ state immediately. Forward reopens the gallery at its previous position. Direct visits and gallery reloads retain the standalone work page.

The next homepage sections follow Figma frame 113:1372: falling skill pills, followed by the four service cards. The pills use Matter.js 0.20.0 with gravity, rounded collision bodies, and sleeping. Physics loads shortly before the section enters view, runs once, pauses offscreen, and stops after settling. Reduced motion and load failures retain the static Figma arrangement. The fixed logical stage scales with the layout without restarting the simulation. The vendored runtime and its MIT license are in `assets/`; after updating the npm dependency, copy `node_modules/matter-js/build/matter.min.js` to the versioned asset and update the URL in `pills.js`.

The three project cards counter-rotate on hover, with spring-driven pointer parallax and a soft reflected light sweep. Motion preserves its velocity when interrupted and settles back on pointer leave. Each image has an independent rounded clipping surface; the white frame follows its radius. The entire stack is a native link to `/work`, with single-tap navigation on touch and Enter activation on keyboard. The work page shows all three projects and a link home. Reduced-motion preferences disable card movement and the light sweep.

Artwork and platform marks come from the supplied Figma design; responsive WebP versions reduce image downloads. All site typography uses self-hosted Suisse Intl: Regular (400), Medium for buttons (500), and SemiBold for the main heading (600). Use only Suisse Intl for future site additions, as recorded in AGENTS.md. Desktop spacing follows the original 1920 × 1200 Figma frame; responsive layouts adapt below 1001px. Book a call opens /book, which embeds the graafstudio/15min Cal.com calendar. The external booking script only loads on that page. Message us retains the existing email-draft behavior without a recipient; set the studio's contact destination when supplied.
