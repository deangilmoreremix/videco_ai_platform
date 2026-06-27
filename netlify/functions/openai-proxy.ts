export default async (req: Request, context: { next: Function }) => {
  const url = new URL(req.url);
  const response = await context.next();
  return response;
};
