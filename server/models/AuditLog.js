import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    actor: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    action: {type: String, required: true},
    entity: {type: String, required: true},
    entityId: {type: String, default: ""},
    metadata: {type: Object, default: {}},
    ip: {type: String, default: ""},
    userAgent: {type: String, default: ""}
}, {timestamps: true});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
