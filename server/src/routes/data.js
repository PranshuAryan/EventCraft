import express from "express";
import { asyncHandler, ok, validate } from "../http.js";
import { DataInput } from "../schemas.js";

/** Reads and saves the logged-in user's plan and bookings. `auth` must already be applied. */
export function dataRouter(store) {
  const router = express.Router();

  router.get("/", (req, res) => ok(res, req.user.data));

  router.put(
    "/",
    validate(DataInput, "body"),
    asyncHandler(async (req, res) => {
      await store.setData(req.user.id, req.valid);
      ok(res, { saved: true });
    }),
  );

  return router;
}
