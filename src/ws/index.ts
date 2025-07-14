import { Hono } from "hono";
import { chat } from "./endpoints/chat";

export const ws = new Hono().get("/chat", chat);
