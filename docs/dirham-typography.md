# Dirham price typography

The UAE Design System requires the symbol on the left of the amount, with the same numeral height, baseline and compatible stroke weight:
https://designsystem.gov.ae/docs/patterns/currency-symbol

The previous symbol-only fallback font had ink bounds from -100 to 900 in a 1000-unit em. Typical price numerals are only about 730 units high, with almost no descender. Giving both the same font size therefore made the symbol taller and lower than the numbers.

Prices now use small bundled numeric fonts containing the digits and the dirham outline together. The dirham outline is scaled uniformly and translated onto the numeral envelope; its aspect ratio and structure are preserved. Admin prices use a Fraunces-derived serif subset at weight 600. Mobile prices use Roboto-derived subsets at weights 700, 800 and 900. Other text and non-dirham prices keep their existing styling. These assets are application adaptations, not a claim of government certification.

Exact font-unit bounds and input checksums are in `price-font-metrics.json`. Regenerate with `scripts/build_price_fonts.py --source-dir <downloaded-font-sources>` using fonttools 4.67.0 and brotli 1.2.1. The input directory contains Fraunces.ttf, Roboto.ttf and their respective *-OFL.txt licenses. Download variable fonts from the Google Fonts repositories referenced in the metrics file. The symbol source remains dirham 1.5.3, under MIT; the generated fonts retain Google Fonts copyright notices and include OFL licenses alongside them.

Flutter rendering tests check the symbol and price numeral ink tops and baselines at 14px, 26px and 48px for all three mobile weights, with a one-logical-pixel rasterization tolerance.

## Android rollout

The mobile version is 1.0.6+7. Updating web code or menu data does not replace the installed Android UI/font assets: install the rebuilt APK. The existing backend app-version manifest has no APK URL and cannot offer this update automatically. Publishing an APK and updating that manifest is a separate release step. An existing app installation requires the same signing identity.
