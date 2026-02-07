import express from "express";
import { handleDevGetWorldInfo, handleDevDropAsset } from "./controllers/dev/index.js";

const devRouter = express.Router();

devRouter.get("/world-info", handleDevGetWorldInfo);
devRouter.post("/drop-asset", handleDevDropAsset);

export default devRouter;
