import Parser from 'rss-parser';

const RSS_FEED_URL = process.env.RSS_FEED_URL || 
  'https://raw.githubusercontent.com/ArjixGamer/gogoanime-rss/main/animepahe/animepahe-rss.xml';

const parser = new Parser();

export interface RssEpisodeItem {
  title: string;
  link: string;
  pubDate: string;
  guid: string;
  content?: string;
  contentSnippet?: string;
}

export async function fetchAnimeFeed(): Promise<RssEpisodeItem[]> {
  try {
    const feed = await parser.parseURL(RSS_FEED_URL);
    
    if (!feed.items || feed.items.length === 0) {
      console.warn('RSS feed is empty');
      return [];
    }

    return feed.items.map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      guid: item.guid || item.link || '',
      content: item.content || '',
      contentSnippet: item.contentSnippet || '',
    }));
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    throw error;
  }
}