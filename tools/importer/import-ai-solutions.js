/* eslint-disable */
/* global WebImporter */

import heroSplitParser from './parsers/hero-split.js';
import anchorNavParser from './parsers/anchor-nav.js';
import cardsSpotlightParser from './parsers/cards-spotlight.js';
import cardsGridParser from './parsers/cards-grid.js';
import cardsShowcaseParser from './parsers/cards-showcase.js';
import promoLargeParser from './parsers/promo-large.js';
import cardsFeatureParser from './parsers/cards-feature.js';
import mediaFeatureParser from './parsers/media-feature.js';
import promoParser from './parsers/promo.js';
import promoOffsetParser from './parsers/promo-offset.js';
import promoCompactParser from './parsers/promo-compact.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import footnotesParser from './parsers/footnotes.js';

import hpCleanupTransformer from './transformers/hp-cleanup.js';
import hpSectionsTransformer from './transformers/hp-sections.js';

const parsers = {
  'hero-split': heroSplitParser,
  'anchor-nav': anchorNavParser,
  'cards-spotlight': cardsSpotlightParser,
  'cards-grid': cardsGridParser,
  'cards-showcase': cardsShowcaseParser,
  'promo-large': promoLargeParser,
  'cards-feature': cardsFeatureParser,
  'media-feature': mediaFeatureParser,
  'promo': promoParser,
  'promo-offset': promoOffsetParser,
  'promo-compact': promoCompactParser,
  'accordion-faq': accordionFaqParser,
  'footnotes': footnotesParser,
};

const PAGE_TEMPLATE = {
  "name": "ai-solutions",
  "description": "HP AI solutions landing page (Next Gen AI PCs): split hero, sticky anchor nav, card groups, promos, media feature, FAQ accordion and footnotes",
  "urls": [
    "https://www.hp.com/us-en/ai-solutions/next-gen-ai-pcs.html"
  ],
  "blocks": [
    {
      "name": "hero-split",
      "instances": [
        "c-hp-hero-banner"
      ]
    },
    {
      "name": "anchor-nav",
      "instances": [
        "c-hp-anchor-nav"
      ]
    },
    {
      "name": "cards-spotlight",
      "instances": [
        "div.spacing:has(#benefits) + div.backgroundContainer c-hp-bg-container"
      ]
    },
    {
      "name": "cards-grid",
      "instances": [
        "div.spacing:has(#portfolio) + div.backgroundContainer c-hp-bg-container"
      ]
    },
    {
      "name": "cards-showcase",
      "instances": [
        "c-hp-bg-container#products"
      ]
    },
    {
      "name": "promo-large",
      "instances": [
        "#roi-calculator"
      ]
    },
    {
      "name": "cards-feature",
      "instances": [
        "#body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(9) c-hp-bg-container"
      ]
    },
    {
      "name": "media-feature",
      "instances": [
        "#body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(10) c-hp-bg-container"
      ]
    },
    {
      "name": "promo",
      "instances": [
        "#body > div.root > div.aem-Grid > div.mediaContent"
      ]
    },
    {
      "name": "promo-offset",
      "instances": [
        "#body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(13) c-hp-bg-container"
      ]
    },
    {
      "name": "promo-compact",
      "instances": [
        "#body > div.root > div.aem-Grid > div.containedSectionBlock"
      ]
    },
    {
      "name": "accordion-faq",
      "instances": [
        "#faqs .c-hp-grid-cell:has(.collapsibleSection)"
      ]
    },
    {
      "name": "footnotes",
      "instances": [
        "c-hp-footnotes"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "Hero",
      "selector": [
        "#body > div.root > div.aem-Grid > div.heroBanner"
      ],
      "style": null,
      "blocks": [
        "hero-split"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "Anchor navigation",
      "selector": [
        "#body > div.root > div.aem-Grid > div.anchorNavigation"
      ],
      "style": null,
      "blocks": [
        "anchor-nav"
      ],
      "defaultContent": []
    },
    {
      "id": "3",
      "name": "Benefits",
      "selector": [
        "div.spacing:has(#benefits) + div.backgroundContainer",
        "#body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(4)"
      ],
      "style": null,
      "blocks": [
        "cards-spotlight"
      ],
      "defaultContent": []
    },
    {
      "id": "4",
      "name": "Portfolio",
      "selector": [
        "div.spacing:has(#portfolio) + div.backgroundContainer",
        "#body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(6)"
      ],
      "style": null,
      "blocks": [
        "cards-grid"
      ],
      "defaultContent": []
    },
    {
      "id": "5",
      "name": "Featured products",
      "selector": [
        "#body > div.root > div.aem-Grid > div.backgroundContainer:has(#products)"
      ],
      "style": null,
      "blocks": [
        "cards-showcase"
      ],
      "defaultContent": []
    },
    {
      "id": "6",
      "name": "ROI calculator promo",
      "selector": [
        "#body > div.root > div.aem-Grid > div.experiencefragment"
      ],
      "style": null,
      "blocks": [
        "promo-large"
      ],
      "defaultContent": []
    },
    {
      "id": "7",
      "name": "Business benefits feature grid",
      "selector": [
        "#body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(9)"
      ],
      "style": null,
      "blocks": [
        "cards-feature"
      ],
      "defaultContent": []
    },
    {
      "id": "8",
      "name": "HP IQ media feature",
      "selector": [
        "#body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(10)"
      ],
      "style": null,
      "blocks": [
        "media-feature"
      ],
      "defaultContent": []
    },
    {
      "id": "9",
      "name": "Windows security promo",
      "selector": [
        "#body > div.root > div.aem-Grid > div.mediaContent"
      ],
      "style": null,
      "blocks": [
        "promo"
      ],
      "defaultContent": []
    },
    {
      "id": "10",
      "name": "Business-ready promo",
      "selector": [
        "#body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(13)"
      ],
      "style": null,
      "blocks": [
        "promo-offset"
      ],
      "defaultContent": []
    },
    {
      "id": "11",
      "name": "Other home laptops promo",
      "selector": [
        "#body > div.root > div.aem-Grid > div.containedSectionBlock"
      ],
      "style": null,
      "blocks": [
        "promo-compact"
      ],
      "defaultContent": []
    },
    {
      "id": "12",
      "name": "FAQs",
      "selector": [
        "#body > div.root > div.aem-Grid > div.backgroundContainer:has(#faqs)"
      ],
      "style": "dark",
      "blocks": [
        "accordion-faq"
      ],
      "defaultContent": [
        "#faqs .titleAndText h2"
      ]
    },
    {
      "id": "13",
      "name": "Footnotes and disclaimers",
      "selector": [
        "#body > div.root > div.aem-Grid > div.footnotes"
      ],
      "style": null,
      "blocks": [
        "footnotes"
      ],
      "defaultContent": []
    }
  ]
};

const transformers = [
  hpCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [hpSectionsTransformer] : []),
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    const meta = WebImporter.Blocks.getMetadata(document) || {};
    meta.template = PAGE_TEMPLATE.name;
    main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
