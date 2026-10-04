export function photoBackLink(photo, collections, requested) {
    const available = collections.filter(collection => !collection.archived && photo.collectionIds?.includes(collection.id));
    const collection = available.find(collection => collection.id === requested)
        || available.find(collection => collection.id !== 'featured')
        || available[0];
    return collection
        ? { href: `/photography?collection=${encodeURIComponent(collection.id)}`, label: `Back to ${collection.title}` }
        : { href: '/photography', label: 'Back to Photography' };
}
