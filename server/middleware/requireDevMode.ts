import { Request, Response, NextFunction } from "express";

export const requireDevMode = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ message: "Not found" });
  }

  if (!process.env.API_KEY) {
    return res.status(503).json({
      message: "Dev routes require API_KEY. Run `npm run setup` or add API_KEY to your .env file.",
    });
  }

  next();
};
