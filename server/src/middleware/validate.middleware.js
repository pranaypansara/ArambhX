export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const parsedBody = await schema.parseAsync(req.body);
      req.body = parsedBody;
      next();
    } catch (error) {
      next(error);
    }
  };
};
