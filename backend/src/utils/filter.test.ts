import { 
  normalizeString, 
  extractEpisodeNumber, 
  matchAgainstWatchlist,
  generateEpisodeKeyHash,
  WATCHLIST 
} from './filter';

describe('normalizeString', () => {
  test('handles basic normalization', () => {
    expect(normalizeString('Hello World!')).toBe('hello world');
    expect(normalizeString('  Multiple   Spaces  ')).toBe('multiple spaces');
  });

  test('removes punctuation and symbols', () => {
    expect(normalizeString('Re:Zero -Starting Life-')).toBe('re zero starting life');
    expect(normalizeString('Classroom of the Elite (Season 4)')).toBe('classroom of the elite season 4');
  });

  test('handles unicode', () => {
    expect(normalizeString('ようこそ実力至上主義の教室へ')).toBe('ようこそ実力至上主義の教室へ');
  });
});

describe('extractEpisodeNumber', () => {
  const testCases = [
    { input: 'One Piece Episode 1100', expected: 1100 },
    { input: 'Re:Zero Ep 5', expected: 5 },
    { input: 'Classroom of the Elite #3', expected: 3 },
    { input: 'Witch Hat Atelier 第1話', expected: 1 },
    { input: 'Anime Title 12', expected: 12 },
    { input: '15 - Episode Title', expected: 15 },
    { input: 'No episode here', expected: null },
  ];

  test.each(testCases)('extracts $expected from "$input"', ({ input, expected }) => {
    expect(extractEpisodeNumber(input)).toBe(expected);
  });
});

describe('matchAgainstWatchlist', () => {
  test('matches Classroom of the Elite variations', () => {
    const tests = [
      'Classroom of the Elite Season 4 Episode 1',
      'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 4th Season Ep 2',
      'Classroom of the Elite 4 #3',
    ];

    tests.forEach(title => {
      const result = matchAgainstWatchlist(title);
      expect(result).not.toBeNull();
      expect(result?.entry.canonicalName).toBe('Classroom of the Elite 4th Season');
    });
  });

  test('matches Re:ZERO variations', () => {
    const tests = [
      'Re:Zero kara Hajimeru Isekai Seikatsu 4th Season Episode 1',
      'Re:Zero Season 4 Ep 2',
      'Re:ZERO #3',
    ];

    tests.forEach(title => {
      const result = matchAgainstWatchlist(title);
      expect(result).not.toBeNull();
      expect(result?.entry.canonicalName).toBe('Re:ZERO -Starting Life in Another World- Season 4');
    });
  });

  test('matches Witch Hat Atelier', () => {
    const result = matchAgainstWatchlist('Tongari Boushi no Atelier Episode 1');
    expect(result).not.toBeNull();
    expect(result?.entry.canonicalName).toBe('Witch Hat Atelier');
  });

  test('matches One Piece', () => {
    const result = matchAgainstWatchlist('One Piece Episode 1100');
    expect(result).not.toBeNull();
    expect(result?.entry.canonicalName).toBe('One Piece');
  });

  test('returns null for non-matching titles', () => {
    expect(matchAgainstWatchlist('Random Anime Episode 1')).toBeNull();
    expect(matchAgainstWatchlist('Naruto Episode 500')).toBeNull();
  });

  test('returns null when no episode number found', () => {
    expect(matchAgainstWatchlist('Classroom of the Elite Season 4')).toBeNull();
  });
});

describe('generateEpisodeKeyHash', () => {
  test('generates consistent hashes', () => {
    const hash1 = generateEpisodeKeyHash('Test Anime', 1);
    const hash2 = generateEpisodeKeyHash('Test Anime', 1);
    expect(hash1).toBe(hash2);
  });

  test('generates different hashes for different episodes', () => {
    const hash1 = generateEpisodeKeyHash('Test Anime', 1);
    const hash2 = generateEpisodeKeyHash('Test Anime', 2);
    expect(hash1).not.toBe(hash2);
  });

  test('generates different hashes for different titles', () => {
    const hash1 = generateEpisodeKeyHash('Anime A', 1);
    const hash2 = generateEpisodeKeyHash('Anime B', 1);
    expect(hash1).not.toBe(hash2);
  });
});