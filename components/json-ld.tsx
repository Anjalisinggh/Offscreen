// Structured data (schema.org JSON-LD) for search engines and AI search: tells them what a page is
// (a wallpaper image, a collection, the site itself) instead of leaving them to guess from the HTML.
// `<` is escaped so a title can never close the script tag early.
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export const breadcrumbs = (site: string, items: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${site}${it.path}` })),
});
