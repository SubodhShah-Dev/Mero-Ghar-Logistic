import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_PATH = join(__dirname, '..', 'knowledge-base.json');

let knowledgeBase = null;
let chunks = [];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'am', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'shall', 'should', 'may', 'might', 'must', 'to', 'of',
  'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'and', 'but', 'or', 'if',
  'my', 'your', 'his', 'her', 'its', 'our', 'their'
]);

function loadKnowledgeBase() {
  if (!existsSync(KB_PATH)) {
    console.warn('[knowledgeSearch] knowledge-base.json not found at', KB_PATH);
    return null;
  }
  try {
    const data = readFileSync(KB_PATH, 'utf-8');
    knowledgeBase = JSON.parse(data);
    buildIndex();
    console.log('[knowledgeSearch] Loaded ' + chunks.length + ' chunks from ' + knowledgeBase.pages.length + ' pages');
    return knowledgeBase;
  } catch (e) {
    console.error('[knowledgeSearch] Failed to load knowledge base:', e.message);
    return null;
  }
}

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^a-z0-9\s\u0900-\u097F]/g, ' ')
    .split(/\s+/)
    .filter(function (w) { return w.length > 1 && !STOP_WORDS.has(w); });
}

function buildIndex() {
  chunks = [];

  if (!knowledgeBase) return;

  chunks.push({
    id: 'site-overview',
    content: knowledgeBase.site.description,
    keywords: tokenize(knowledgeBase.site.description),
    page: 'index',
    section: 'Overview',
    weight: 1.0
  });

  for (const f of knowledgeBase.site.features) {
    chunks.push({
      id: 'feature-' + chunks.length,
      content: f,
      keywords: tokenize(f),
      page: 'index',
      section: 'Features',
      weight: 1.0
    });
  }

  for (const page of knowledgeBase.pages) {
    for (const section of page.sections) {
      const combined = section.heading + ' ' + section.content;
      chunks.push({
        id: page.id + '-section-' + section.heading.substring(0, 30).replace(/\s+/g, '_'),
        content: section.content,
        heading: section.heading,
        keywords: tokenize(combined),
        page: page.id,
        pageTitle: page.title,
        section: section.heading,
        weight: 1.2
      });
    }

    for (const para of page.paragraphs) {
      chunks.push({
        id: page.id + '-para-' + chunks.length,
        content: para,
        keywords: tokenize(para),
        page: page.id,
        pageTitle: page.title,
        section: page.title,
        weight: 1.0
      });
    }
  }

  for (const faq of knowledgeBase.faq) {
    const combined = faq.question + ' ' + faq.answer;
    chunks.push({
      id: 'faq-' + faq.question.substring(0, 30).replace(/\s+/g, '_'),
      content: 'Q: ' + faq.question + '\nA: ' + faq.answer,
      heading: faq.question,
      keywords: tokenize(combined),
      page: 'index',
      section: 'FAQ',
      weight: 1.5
    });
  }

  for (const svc of knowledgeBase.services) {
    const combined = svc.name + ' ' + svc.description + ' ' + (svc.price || '');
    chunks.push({
      id: 'service-' + svc.name.replace(/\s+/g, '_'),
      content: svc.name + ': ' + svc.description + (svc.price ? ' (' + svc.price + ')' : ''),
      heading: svc.name,
      keywords: tokenize(combined),
      page: 'index',
      section: 'Services',
      weight: 1.3
    });
  }

  for (const rev of knowledgeBase.reviews) {
    chunks.push({
      id: 'review-' + (rev.reviewer || chunks.length),
      content: rev.reviewer + ' said: ' + rev.text,
      keywords: tokenize(rev.text),
      page: 'index',
      section: 'Reviews',
      weight: 0.6
    });
  }

  if (knowledgeBase.howItWorks) {
    for (const step of knowledgeBase.howItWorks) {
      chunks.push({
        id: 'how-' + step.title.replace(/\s+/g, '_'),
        content: 'Step ' + step.step + ': ' + step.title + ' - ' + step.description,
        heading: step.title,
        keywords: tokenize(step.title + ' ' + step.description),
        page: 'index',
        section: 'How It Works',
        weight: 1.2
      });
    }
  }

  if (knowledgeBase.vehicleTypes) {
    for (const v of knowledgeBase.vehicleTypes) {
      chunks.push({
        id: 'vehicle-' + v.name.replace(/\s+/g, '_'),
        content: v.name + ': ' + v.price + '. Best for: ' + v.bestFor,
        heading: v.name,
        keywords: tokenize(v.name + ' ' + v.price + ' ' + v.bestFor),
        page: 'index',
        section: 'Vehicle Types',
        weight: 1.2
      });
    }
  }

  if (knowledgeBase.addonServices) {
    for (const a of knowledgeBase.addonServices) {
      chunks.push({
        id: 'addon-' + a.name.replace(/\s+/g, '_'),
        content: a.name + ': ' + a.description,
        keywords: tokenize(a.name + ' ' + a.description),
        page: 'index',
        section: 'Add-on Services',
        weight: 1.0
      });
    }
  }

  if (knowledgeBase.paymentMethods) {
    chunks.push({
      id: 'payment-methods',
      content: 'Accepted payment methods: ' + knowledgeBase.paymentMethods.map(function (p) { return p.name; }).join(', '),
      keywords: tokenize(knowledgeBase.paymentMethods.map(function (p) { return p.name; }).join(' ')),
      page: 'index',
      section: 'Payment Methods',
      weight: 1.3
    });
  }
}

export function search(query) {
  if (!knowledgeBase) loadKnowledgeBase();
  if (!knowledgeBase) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = [];

  for (const chunk of chunks) {
    let score = 0;
    let matchCount = 0;

    for (const qt of queryTokens) {
      for (const kw of chunk.keywords) {
        if (kw.includes(qt) || qt.includes(kw)) {
          score += 1;
          matchCount++;
          break;
        }
      }
    }

    if (matchCount > 0) {
      const headingTokens = tokenize(chunk.heading || '');
      let headingBonus = 0;
      for (const qt of queryTokens) {
        for (const ht of headingTokens) {
          if (ht === qt) { headingBonus += 2; break; }
        }
      }

      const finalScore = (score / Math.max(queryTokens.length, 1)) * chunk.weight + headingBonus;

      scored.push({
        content: chunk.content,
        heading: chunk.heading || '',
        page: chunk.page,
        pageTitle: chunk.pageTitle || '',
        section: chunk.section,
        score: Math.round(finalScore * 100) / 100
      });
    }
  }

  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, 5);
}

export function getContextForQuery(query) {
  const results = search(query);
  if (results.length === 0) return '';

  return results.map(function (r, i) {
    var prefix = '';
    if (r.pageTitle) prefix += '[' + r.pageTitle + '] ';
    if (r.section) prefix += r.section;
    return (i + 1) + '. ' + prefix.trim() + ': ' + r.content.substring(0, 400);
  }).join('\n\n');
}

export function getFAQ() {
  if (!knowledgeBase) loadKnowledgeBase();
  return knowledgeBase ? knowledgeBase.faq : [];
}

export function getSiteInfo() {
  if (!knowledgeBase) loadKnowledgeBase();
  return knowledgeBase ? {
    name: knowledgeBase.site.name,
    description: knowledgeBase.site.description,
    stats: knowledgeBase.stats,
    contactInfo: knowledgeBase.contactInfo
  } : null;
}

export function getPageDescription(pageId) {
  if (!knowledgeBase) loadKnowledgeBase();
  if (!knowledgeBase) return '';
  const page = knowledgeBase.pages.find(function (p) { return p.id === pageId; });
  return page ? page.title + ': ' + page.description : '';
}

loadKnowledgeBase();
