import AuditLog from "../models/AuditLog.js";
import { isDbConnected } from "./demoData.js";

export const writeAuditLog = async (req, action, entity, entityId = "", metadata = {}) => {
    if (!isDbConnected()) return null;
    return AuditLog.create({
        actor: req.user?._id,
        action,
        entity,
        entityId,
        metadata,
        ip: req.ip,
        userAgent: req.get("user-agent") || ""
    });
};
