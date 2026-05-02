import express from "express";
import { getOwnerAnalytics } from "../controllers/analyticsController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const analyticsRouter = express.Router();

analyticsRouter.get("/owner", protect, authorize("owner"), getOwnerAnalytics);

export default analyticsRouter;
