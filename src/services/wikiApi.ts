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
        varianttitles?: {
          [key: string]: string;
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
export function parseWikiInput(input: string, defaultLang: string = 'zh'): { title: string; lang: string; isUrl: boolean; variant?: string } {
  const trimmed = input.trim();
  
  // Wikipedia URL match regex
  // Match groups: 1 = lang subdomain, 2 = path variant, 3 = article title
  const wikiUrlRegex = /https?:\/\/([a-z-]+)\.wikipedia\.org\/(wiki|zh-[a-z]+)\/([^?#]+)/i;
  const match = trimmed.match(wikiUrlRegex);

  if (match) {
    const lang = match[1].toLowerCase();
    const rawTitle = match[3];
    const pathVariant = match[2].toLowerCase();
    const variant = pathVariant.startsWith('zh-') ? pathVariant : undefined;
    return {
      title: cleanTitle(rawTitle),
      lang,
      isUrl: true,
      variant,
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
 * Resolves the canonical title of a page by handling variant conversion and redirects.
 */
export async function resolveCanonicalTitle(title: string, lang: string, variant?: string): Promise<string> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&redirects=1&converttitles=1&prop=info&inprop=varianttitles&format=json&origin=*`;

  try {
    const res = await fetch(url);
    if (!res.ok) return title;
    const data = await res.json();
    const pages = data.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pageId && pageId !== '-1') {
        const page = pages[pageId];
        if (variant && page.varianttitles && page.varianttitles[variant]) {
          return page.varianttitles[variant];
        }
        return page.title || title;
      }
    }
    return title;
  } catch (error) {
    console.error('Error resolving canonical title:', error);
    return title;
  }
}

export interface ResolvedPageInfo {
  pageid?: number;
  canonicalTitle: string;
  displayTitle: string;
  exists: boolean;
}

/**
 * Resolves complete page details including pageid, canonical database title, and variant display title.
 */
export async function resolvePageInfo(
  title: string,
  lang: string,
  variant?: string
): Promise<ResolvedPageInfo> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&redirects=1&converttitles=1&prop=info&inprop=varianttitles&format=json&origin=*`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { canonicalTitle: title, displayTitle: title, exists: false };
    const data = await res.json();
    const pages = data.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pageId && pageId !== '-1') {
        const page = pages[pageId];
        const canonicalTitle = page.title || title;
        let displayTitle = canonicalTitle;
        if (variant && page.varianttitles && page.varianttitles[variant]) {
          displayTitle = page.varianttitles[variant];
        }
        return {
          pageid: parseInt(pageId, 10),
          canonicalTitle,
          displayTitle,
          exists: true
        };
      }
    }
    return { canonicalTitle: title, displayTitle: title, exists: false };
  } catch (error) {
    console.error('Error resolving page info:', error);
    return { canonicalTitle: title, displayTitle: title, exists: false };
  }
}

/**
 * Fetches outgoing article links from a specific page.
 * Restricts links to main article namespace (ns: 0) to avoid templates, categories, etc.
 * Resolves redirects and converts titles automatically.
 */
export async function fetchWikiLinks(
  title: string,
  lang: string,
  limit: number = 30,
  onResolveTitle?: (resolvedTitle: string) => void,
  variant?: string
): Promise<string[]> {
  let url = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    title
  )}&prop=text&format=json&origin=*&redirects=1${variant ? `&variant=${variant}` : ''}`;

  try {
    let res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Wikipedia page parsed text');
    
    let data = await res.json();

    // Fallback: If page doesn't exist, try resolving its canonical title and pageid first
    if (data.error && (data.error.code === 'missingtitle' || data.error.info?.includes("doesn't exist"))) {
      const pageInfo = await resolvePageInfo(title, lang, variant);
      if (pageInfo.exists) {
        if (onResolveTitle && pageInfo.displayTitle !== title) {
          onResolveTitle(pageInfo.displayTitle);
        }
        url = `https://${lang}.wikipedia.org/w/api.php?action=parse&pageid=${pageInfo.pageid}&prop=text&format=json&origin=*${variant ? `&variant=${variant}` : ''}`;
        res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch Wikipedia page parsed text after pageid resolution');
        data = await res.json();
      }
    }

    if (data.error || !data.parse || !data.parse.text) {
      return [];
    }

    // If parse succeeded and returned a redirected or canonical form, notify caller
    if (data.parse && data.parse.title) {
      let canonicalTitle = cleanTitle(data.parse.title);
      if (variant && variant.startsWith('zh')) {
        canonicalTitle = await resolveCanonicalTitle(canonicalTitle, lang, variant);
      }
      if (canonicalTitle && cleanTitle(title) !== canonicalTitle) {
        if (onResolveTitle) {
          onResolveTitle(canonicalTitle);
        }
      }
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

    // Select all headings, headlines, and anchor tags inside the container in natural document order
    const allElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, .mw-headline, a');
    const linkTitles: string[] = [];
    const seen = new Set<string>();
    let cutoffReached = false;

    const wikiHrefRegex = /^(?:https?:\/\/[a-z-]+\.wikipedia\.org)?\/(wiki|zh|zh-[a-z]+)\/([^?#]+)/i;

    allElements.forEach((el) => {
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'a') {
        // Skip links once the cutoff section is reached
        if (cutoffReached) return;

        const a = el as HTMLAnchorElement;
        
        // Skip 'red links' that point to non-existent Wikipedia pages
        if (a.classList.contains('new')) return;

        const href = a.getAttribute('href');
        if (!href) return;

        const hrefMatch = href.match(wikiHrefRegex);
        if (!hrefMatch) return; // Skip non-Wikipedia article links

        // Attempt to extract title from the title attribute, otherwise fallback to URL decoding
        let linkTitle = a.getAttribute('title');
        if (!linkTitle) {
          try {
            linkTitle = decodeURIComponent(hrefMatch[2]).replace(/_/g, ' ');
          } catch {
            return; // Skip if URL decoding fails
          }
        }

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
      } else {
        // It's a heading element or headline
        const headingText = el.textContent?.trim().toLowerCase() || '';
        const matchesCutoff = cutoffHeadings.some(h => headingText.includes(h.toLowerCase()));
        if (matchesCutoff) {
          cutoffReached = true;
        }
      }
    });

    // Shuffle and pick up to 'limit' elements for canvas distribution diversity
    const shuffled = [...linkTitles].sort(() => 0.5 - Math.random());
    if (limit <= 0) {
      return shuffled;
    }
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
  lang: string,
  variant?: string
): Promise<{ extract: string; thumbnail?: string; url: string; resolvedTitle?: string; isNotFound?: boolean }> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|info&inprop=varianttitles&exintro=1&explaintext=1&exchars=350&pithumbsize=400&format=json&origin=*&redirects=1&converttitles=1&titles=${encodeURIComponent(
    title
  )}${variant ? `&variant=${variant}` : ''}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Wikipedia summary');
    
    const data: WikiSummaryResponse = await res.json();
    const pages = data.query?.pages;
    
    const fallbackUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    if (!pages) return { extract: '無法取得此條目的內容摘要。', url: fallbackUrl };

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (!page || pageId === '-1') {
      return { extract: '此條目可能不存在或已被移除。', url: fallbackUrl, isNotFound: true };
    }

    let resolvedTitle = page.title || title;
    if (variant && page.varianttitles && page.varianttitles[variant]) {
      resolvedTitle = page.varianttitles[variant];
    }
    const resolvedUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`;

    return {
      extract: page.extract || '此條目目前無引言摘要。',
      thumbnail: page.thumbnail?.source,
      url: resolvedUrl,
      resolvedTitle: resolvedTitle,
    };
  } catch (error) {
    console.error('Error fetching summary:', error);
    const fallbackUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    return {
      extract: '獲取條目摘要時發生錯誤，請稍後再試。',
      url: fallbackUrl,
    };
  }
}

/**
 * Fetches random Wikipedia article titles.
 */
export async function fetchRandomWikiTitles(lang: string, limit: number = 2): Promise<string[]> {
  // Use generator=random so we can fetch varianttitles in the same request to support Traditional Chinese conversion
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=random&grnnamespace=0&grnlimit=${limit}&prop=info&inprop=varianttitles&format=json&origin=*`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch random articles');
    const data = await res.json();
    const pages = data.query?.pages;
    if (pages) {
      return Object.values(pages).map((page: any) => {
        // Automatically prefer Traditional Chinese if available for 'zh' language
        if (lang === 'zh' && page.varianttitles) {
          return page.varianttitles['zh-tw'] || page.varianttitles['zh-hant'] || page.title;
        }
        return page.title;
      });
    }
    return [];
  } catch (error) {
    console.error('Error fetching random articles:', error);
    return [];
  }
}

/**
 * Filters a list of titles to those that actually exist on Wikipedia.
 * Uses prop=info (existence check only) - no fragile extract matching.
 * Returns up to 'limit' valid titles.
 */
export async function filterValidWikiTitles(
  titles: string[],
  lang: string,
  limit: number,
  variant?: string
): Promise<string[]> {
  const validTitles: string[] = [];
  const batchSize = 20;

  for (let i = 0; i < titles.length; i += batchSize) {
    if (validTitles.length >= limit) break;

    const batch = titles.slice(i, i + batchSize);
    const titlesStr = batch.map(t => encodeURIComponent(t)).join('|');
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=info&inprop=varianttitles&format=json&origin=*&redirects=1&converttitles=1&titles=${titlesStr}${variant ? `&variant=${variant}` : ''}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) continue;

      // Build a set of resolved titles that actually exist (positive pageid, no 'missing')
      const existingTitles = new Set<string>();
      for (const page of Object.values(pages) as any[]) {
        if (!page.missing && page.pageid > 0) {
          existingTitles.add(page.title.toLowerCase());
          if (page.varianttitles) {
            for (const vt of Object.values(page.varianttitles) as string[]) {
              existingTitles.add(vt.toLowerCase());
            }
          }
        }
      }

      // Resolve title through Wikipedia's chain SEQUENTIALLY:
      // normalized -> converted -> redirects (output of each feeds next)
      const resolveTitle = (t: string): string => {
        let cur = t;
        const chains = [data.query.normalized, data.query.converted, data.query.redirects];
        for (const chain of chains) {
          if (!chain) continue;
          const match = chain.find((e: any) => e.from.toLowerCase() === cur.toLowerCase());
          if (match) cur = match.to; // feed resolved value into next chain step
        }
        return cur;
      };

      // Deduplicate: track which resolved pages we've already counted this batch
      const seenResolved = new Set<string>();

      for (const title of batch) {
        const resolved = resolveTitle(title).toLowerCase();
        const found = existingTitles.has(resolved) || existingTitles.has(title.toLowerCase());
        const resolvedKey = found ? resolved : null;

        if (found) {
          if (resolvedKey && seenResolved.has(resolvedKey)) {
            // skip duplicate pages
          } else {
            if (resolvedKey) seenResolved.add(resolvedKey);
            validTitles.push(title);
            if (validTitles.length >= limit) break;
          }
        }
      }

    } catch (error) {
      console.error('Error filtering wiki titles:', error);
    }
  }

  return validTitles;
}

