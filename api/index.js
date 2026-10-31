// Vercel entry point: the Express app runs as one serverless function (see vercel.json).
import { createApp } from "../server/src/app.js";
export default createApp();
