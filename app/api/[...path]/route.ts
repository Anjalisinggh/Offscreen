// unknown API routes answer in JSON too, never with an HTML page
const notFound = () => Response.json({ error: 'This page is out of date. Please refresh and try again.' }, { status: 404 });
export { notFound as GET, notFound as POST, notFound as PUT, notFound as DELETE };
