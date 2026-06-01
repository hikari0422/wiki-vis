/**
 * Wikipedia Action API Service
 * Bypasses CORS using origin=* and communicates directly with Wikipedia.
 */


interface WikiSummaryResponse {
  query?: {
    pages?: {
      [key: string]: {
        title: string;
        extract?: string;
        thumbnail?: {
          source: string;
          width: number;
          height: number;
        };
      };
    };
  };
}

/**
 * Clean article title by converting underscores to spaces and trimming.
 */
export function cleanTitle(title: string): string {
  return decodeURIComponent(title).replace(/_/g, ' ').trim();
}

/**
 * Parses a Wikipedia URL or standard query to extract the language code and target article title.
 * Handles subdomains like "zh.wikipedia.org", "en.wikipedia.org", etc.
 */
/**
 * Parses a Wikipedia URL or standard query to extract the language code and target article title.
 * Handles subdomains like "zh.wikipedia.org", "en.wikipedia.org", etc.,
 * and supports localization paths like "/wiki/", "/zh-tw/", "/zh-cn/", "/zh-hant/", "/zh-hans/", etc.
 */
export function parseWikiInput(input: string, defaultLang: string = 'zh'): { title: string; lang: string; isUrl: boolean } {
  const trimmed = input.trim();
  
  // Wikipedia URL match regex
  // Match groups: 1 = lang subdomain, 2 = path variant, 3 = article title
  const wikiUrlRegex = /https?:\/\/([a-z-]+)\.wikipedia\.org\/(wiki|zh-[a-z]+)\/([^?#]+)/i;
  const match = trimmed.match(wikiUrlRegex);

  if (match) {
    const lang = match[1].toLowerCase();
    const rawTitle = match[3];
    return {
      title: cleanTitle(rawTitle),
      lang,
      isUrl: true,
    };
  }

  return {
    title: trimmed,
    lang: defaultLang,
    isUrl: false,
  };
}

/**
 * Searches Wikipedia for a query term and returns the most accurate matching article title.
 */
export async function searchWikiTitle(query: string, lang: string): Promise<string> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
    query
  )}&limit=5&namespace=0&format=json&origin=*`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    
    // Opensearch structure: [query, [titles], [descriptions], [urls]]
    if (Array.isArray(data) && data[1] && data[1].length > 0) {
      return data[1][0]; // Return the top search result title
    }
    
    // Fallback to query itself if no results found
    return query;
  } catch (error) {
    console.error('Error searching Wikipedia:', error);
    return query;
  }
}

/**
 * Fetches outgoing article links from a specific page.
 * Restricts links to main article namespace (ns: 0) to avoid templates, categories, etc.
 * Resolves redirects and converts titles automatically.
 */
export async function fetchWikiLinks(title: string, lang: string, limit: number = 30): Promise<string[]> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    title
  )}&prop=text&format=json&origin=*&redirects=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Wikipedia page parsed text');
    
    const data = await res.json();
    if (data.error || !data.parse || !data.parse.text) {
      return [];
    }

    const htmlContent = data.parse.text['*'];
    if (!htmlContent) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Find the main parser output container
    const container = doc.querySelector('.mw-parser-output') || doc.body;

    // Headings to look for in order to discard references/see also/external links sections
    const cutoffHeadings = [
      '參考文獻', '參考資料', '參考來源', '注釋', '註釋', '備註', '文獻', '腳註', '腳注', '参考文献', '参考资料', '参考来源',
      '延伸閱讀', '延伸阅读', '相關條目', '相关条目', '參見', '参见', '參看', '參看項目', '参见项目',
      '外部連結', '外部链接', '外部連結', '外部联结', '官方網站', '官方网站', '外部網頁', '外部网页',
      'references', 'reference', 'notes', 'sources', 'bibliography',
      'further reading', 'see also', 'external links', 'external link', 'official website'
    ];

    // Select all children of the container
    const children = Array.from(container.children);
    let cutoffReached = false;

    for (const child of children) {
      if (cutoffReached) {
        child.remove();
        continue;
      }

      // Check if this child element represents or contains one of our cutoff headings
      const headingText = child.textContent?.trim().toLowerCase() || '';
      
      // Is it a heading element?
      const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(child.tagName);
      
      // Or does it contain a headline?
      const hasHeadline = child.querySelector('.mw-headline') || child.classList.contains('mw-heading');

      if (isHeading || hasHeadline) {
        // Check if any of our cutoff headings is a substring of this heading's text
        const matchesCutoff = cutoffHeadings.some(h => headingText.includes(h.toLowerCase()));
        if (matchesCutoff) {
          cutoffReached = true;
          child.remove();
        }
      }
    }

    // Now, select all anchor tags (a) with href starting with "/wiki/"
    const anchors = container.querySelectorAll('a[href^="/wiki/"]');
    const linkTitles: string[] = [];
    const seen = new Set<string>();

    anchors.forEach((a) => {
      const linkTitle = a.getAttribute('title');
      if (!linkTitle) return;

      const cleanT = linkTitle.trim();
      const lowerT = cleanT.toLowerCase();

      // Filter out namespace pages (like File:, Template:, Category:, Help:, Special:, etc.)
      if (cleanT.includes(':')) return;

      // Filter out lists, disambiguation pages, or other non-article targets
      if (
        lowerT.startsWith('list of') ||
        lowerT.startsWith('列表') ||
        lowerT.includes('disambiguation') ||
        lowerT.includes('消歧義')
      ) return;

      // Avoid adding duplicates in the same page
      if (!seen.has(lowerT)) {
        seen.add(lowerT);
        linkTitles.push(cleanT);
      }
    });

    // Shuffle and pick up to 'limit' elements for canvas distribution diversity
    const shuffled = [...linkTitles].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  } catch (error) {
    console.error('Error in fetchWikiLinks:', error);
    throw error;
  }
}

/**
 * Fetches detailed summary text and thumbnail image of a Wikipedia page.
 * Resolves redirects and converts titles automatically.
 */
export async function fetchWikiSummary(
  title: string,
  lang: string
): Promise<{ extract: string; thumbnail?: string; url: string; resolvedTitle?: string; isNotFound?: boolean }> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&exchars=350&pithumbsize=400&format=json&origin=*&redirects=1&converttitles=1&titles=${encodeURIComponent(
    title
  )}`;
  const pageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Wikipedia summary');
    
    const data: WikiSummaryResponse = await res.json();
    const pages = data.query?.pages;
    if (!pages) return { extract: '無法取得此條目的內容摘要。', url: pageUrl };

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (!page || pageId === '-1') {
      return { extract: '此條目可能不存在或已被移除。', url: pageUrl, isNotFound: true };
    }

    return {
      extract: page.extract || '此條目目前無引言摘要。',
      thumbnail: page.thumbnail?.source,
      url: pageUrl,
      resolvedTitle: page.title,
    };
  } catch (error) {
    console.error('Error fetching summary:', error);
    return {
      extract: '獲取條目摘要時發生錯誤，請稍後再試。',
      url: pageUrl,
    };
  }
}
