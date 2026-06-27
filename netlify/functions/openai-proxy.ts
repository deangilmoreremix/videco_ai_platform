export default async (request: Request, context: { next: Function }) => {
  const url = new URL(request.url);
  const response = await context.next();
  return response;
};
