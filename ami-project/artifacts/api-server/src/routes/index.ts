import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import leadsRouter from "./leads";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use(leadsRouter);

export default router;