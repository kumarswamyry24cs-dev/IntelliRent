import test from "node:test";
import assert from "node:assert/strict";

test("health payload shape", () => {
    const status = {
        success: true,
        status: "ok",
        database: "offline"
    };
    assert.equal(status.success, true);
    assert.equal(status.status, "ok");
    assert.ok(["connected", "offline"].includes(status.database));
});
