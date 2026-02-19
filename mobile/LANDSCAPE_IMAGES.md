# Landscape Image Recommendations (Tablet)

Target device example: Samsung Galaxy Tab A7 (2020) — 2000x1200, 16:10 (landscape)

Recommended image widths (pixels):
- Hero / full-bleed: 1600px
- Detail / card: 1000px
- Thumbnail / lists: 600px

Cloudinary URL examples (replace `PUBLIC_ID` and your cloud name):

- Hero: https://res.cloudinary.com/your_cloud_name/image/upload/w_1600,q_auto,f_auto/PUBLIC_ID.jpg
- Card: https://res.cloudinary.com/your_cloud_name/image/upload/w_1000,q_auto,f_auto/PUBLIC_ID.jpg
- Thumb: https://res.cloudinary.com/your_cloud_name/image/upload/w_600,q_auto,f_auto/PUBLIC_ID.jpg

Responsive srcset example (HTML):

<img src="/placeholder.jpg"
  srcset="https://res.cloudinary.com/your_cloud_name/image/upload/w_600,q_auto,f_auto/PUBLIC_ID.jpg 600w,
          https://res.cloudinary.com/your_cloud_name/image/upload/w_1000,q_auto,f_auto/PUBLIC_ID.jpg 1000w,
          https://res.cloudinary.com/your_cloud_name/image/upload/w_1600,q_auto,f_auto/PUBLIC_ID.jpg 1600w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 66vw, 50vw"
  alt="Product">

Notes:
- Use `q_auto` and `f_auto` to let Cloudinary optimize format and quality.
- Prefer serving the smallest size needed for the current layout to save bandwidth.
- For Flutter, use `CachedNetworkImage` with the appropriate Cloudinary URL variant based on `MediaQuery` width.
