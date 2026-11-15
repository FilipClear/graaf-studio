# Project typography

- Use **Suisse Intl** for all site typography, including new pages, components, buttons, and form controls. The sole user-requested exception is **Handflair Regular for testimonial signatures**; keep all surrounding text in Suisse Intl.
- Use the self-hosted files in `assets/`: Regular at 400, Book at 450, Medium at 500, and SemiBold at 600.
- Team member names use Suisse Intl Book (450), matching Figma; do not substitute Regular or Medium.
- Buttons use Suisse Intl Medium (500). Body text uses Regular (400); the main heading uses SemiBold (600).
- Inherit the shared font from `styles.css`; use the `--font-family` token when an explicit family is necessary. Apart from the signature exception, do not introduce another typeface, remote font service, or named fallback. The generic `sans-serif` fallback is only for loading/failure.
- Preserve lettering already embedded in supplied artwork and partner logos.

# Button interactions

- Keep buttons stationary on hover and press: no scaling or lifting. Use a short background-color or overlay-opacity transition.
- Gray buttons become darker on hover, including Book a call, Message us, View work, and the work-page close button. Preserve their label colors. Black buttons may become slightly lighter.
