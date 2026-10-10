import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectMediaKind, parseYoutubeId, youtubeEmbedUrl } from './blocks.js';

test('parseYoutubeId entiende watch, youtu.be y shorts', () => {
  assert.equal(parseYoutubeId('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk');
  assert.equal(parseYoutubeId('https://youtu.be/abcdefghijk'), 'abcdefghijk');
  assert.equal(parseYoutubeId('https://www.youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
  assert.equal(parseYoutubeId('https://example.com/video.mp4'), null);
});

test('detectMediaKind y embed', () => {
  assert.equal(detectMediaKind('https://youtu.be/abcdefghijk'), 'youtube');
  assert.equal(detectMediaKind('https://cdn.example/x.mp4'), 'video');
  assert.equal(detectMediaKind('https://cdn.example/x.png'), 'image');
  assert.equal(detectMediaKind('file.webm', 'video/webm'), 'video');
  assert.equal(
    youtubeEmbedUrl('https://www.youtube.com/watch?v=abcdefghijk'),
    'https://www.youtube.com/embed/abcdefghijk'
  );
});
