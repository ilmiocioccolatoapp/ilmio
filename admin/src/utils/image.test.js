import { catalogImageUrl } from './image';

test('requests bounded Cloudinary thumbnails without losing versions or existing transforms', () => {
  expect(catalogImageUrl('https://res.cloudinary.com/cafe/image/upload/v123/menu/cake.jpg')).toBe(
    'https://res.cloudinary.com/cafe/image/upload/c_limit,w_640,q_auto,f_auto/v123/menu/cake.jpg');
  expect(catalogImageUrl('https://res.cloudinary.com/cafe/image/upload/f_auto,q_auto/v123/cake.jpg')).toContain(
    '/c_limit,w_640,q_auto,f_auto/f_auto,q_auto/v123/cake.jpg');
});

test.each(['https://example.com/image.jpg', '/image.jpg', 'https://res.cloudinary.com.evil.test/image/upload/cake.jpg', 'https://res.cloudinary.com/cafe/video/upload/movie.mp4'])('preserves other image sources: %s', url => {
  expect(catalogImageUrl(url)).toBe(url);
});
