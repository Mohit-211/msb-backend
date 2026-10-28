const MAX_PAGE_SIZE = 100;

// Turns ?limit=&page= into a bounded page size and an offset.
const pageOf = (query, defaultLimit) => {
  const limit = Math.min(Math.max(parseInt(query.limit) || defaultLimit, 1), MAX_PAGE_SIZE);
  const page = Math.max(parseInt(query.page) || 1, 1);
  return { limit, offset: (page - 1) * limit };
};

module.exports = pageOf;
